#!/usr/bin/env python3
"""파일 고치기 직전(Edit·Write·NotebookEdit)과 Bash 검사 훅."""
import json, os, re, sys

MSG = ("해석과 고칠 파일을 먼저 보고하세요. 고칠 파일은 답변 안에 ```scope 블록으로 한 줄에 하나씩 적습니다"
       "(예: ```scope\\ndocs/a.md\\n```). 사용자가 「해」라고 답하면 훅이 그 블록으로 범위를 만듭니다. "
       ".claude/state 안 파일은 직접 쓰지 마세요.")
SED_MSG = "sed -i, perl -i처럼 파일을 직접 바꾸는 명령은 막혀 있습니다. Edit 도구를 쓰세요."

def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}, ensure_ascii=False))
    sys.exit(0)

def glob_to_re(pat):
    out, i = "", 0
    while i < len(pat):
        c = pat[i]
        if pat.startswith("**/", i):
            out += "(?:.*/)?"; i += 3; continue
        if pat.startswith("**", i):
            out += ".*"; i += 2; continue
        if c == "*":
            out += "[^/]*"
        elif c == "?":
            out += "[^/]"
        else:
            out += re.escape(c)
        i += 1
    return re.compile("^" + out + "$")

SEPS = {";", "&&", "||", "|", "&", "(", ")", "|&", "\n"}
REDIR = {">", ">>", ">|", "&>", "&>>"}

def bash_write_targets(cmd, cwd):
    """Bash 명령이 쓰는 도착 경로 목록: > >> 리디렉션, tee, cp·mv의 도착 경로."""
    import shlex
    cmd = re.sub(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?\n\s*\2(?=\s|$)", " ", cmd, flags=re.S)
    cmd = cmd.replace("\n", " ; ")
    try:
        lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
        lex.whitespace_split = True
        toks = list(lex)
    except Exception:
        return []
    is_sep = lambda t: bool(t) and all(c in "();|&" for c in t) and t not in REDIR
    out = []
    for i, t in enumerate(toks):
        if t in REDIR and i + 1 < len(toks):
            out.append(toks[i + 1])
            continue
        if i > 0 and not is_sep(toks[i - 1]):
            continue
        name = os.path.basename(t)
        if name not in ("tee", "cp", "mv"):
            continue
        args, j = [], i + 1
        while j < len(toks) and not is_sep(toks[j]) and toks[j] not in REDIR:
            args.append(toks[j]); j += 1
        tdir, rest, k = None, [], 0
        while k < len(args):
            a = args[k]
            if name != "tee" and a in ("-t", "--target-directory") and k + 1 < len(args):
                tdir = args[k + 1]; k += 2; continue
            if name != "tee" and a.startswith("--target-directory="):
                tdir = a.split("=", 1)[1]; k += 1; continue
            if a == "--":
                rest += args[k + 1:]; break
            if a.startswith("-") and a != "-":
                k += 1; continue
            rest.append(a); k += 1
        if name == "tee":
            out += rest
        elif tdir is not None:
            out += [os.path.join(tdir, os.path.basename(s.rstrip("/"))) for s in rest]
        elif len(rest) >= 2:
            dest = rest[-1]
            d = dest if os.path.isabs(dest) else os.path.join(cwd, dest)
            if os.path.isdir(os.path.expanduser(d)):
                out += [os.path.join(dest, os.path.basename(s.rstrip("/"))) for s in rest[:-1]]
            else:
                out.append(dest)
    return out

def locked(real, root, state):
    """저장소 안 파일이고 승인·범위에 없으면 True(거부 대상)."""
    if real == os.path.join(state, "scope.json"):
        return False
    if os.path.commonpath([real, root]) != root:
        return False
    if not os.path.exists(os.path.join(state, "approved")):
        return True
    try:
        with open(os.path.join(state, "scope.json"), encoding="utf-8") as f:
            files = json.load(f).get("files") or []
    except Exception:
        return True
    rel = os.path.relpath(real, root).replace(os.sep, "/")
    return rel.startswith("../") or not any(glob_to_re(g).match(rel) for g in files)

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    tool = data.get("tool_name", "")
    ti = data.get("tool_input") or {}
    root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd())
    state = os.path.join(root, ".claude", "state")

    if tool == "Bash":
        cmd = ti.get("command") or ""
        if re.search(r"(?<![\w-])sed\b[^|;&\n]*\s(-[A-Za-z]*i\S*|--in-place\S*)(\s|$)", cmd) or \
           re.search(r"(?<![\w-])perl\b[^|;&\n]*\s-[A-Za-z]*i\S*(\s|$)", cmd):
            deny(SED_MSG)
        cwd = os.path.realpath(data.get("cwd") or root)
        for tgt in bash_write_targets(cmd, cwd):
            if not tgt or tgt == "/dev/null" or re.search(r"[$`]", tgt):
                continue
            tgt = os.path.expanduser(tgt)
            real = os.path.realpath(tgt if os.path.isabs(tgt) else os.path.join(cwd, tgt))
            if locked(real, root, state):
                deny(MSG)
        return 0

    if tool not in ("Edit", "Write", "NotebookEdit"):
        return 0

    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    if not fp:
        deny(MSG)
    if not os.path.isabs(fp):
        fp = os.path.join(root, fp)
    real = os.path.realpath(fp)

    # scope.json 자체를 쓰는 것은 허용
    if real == os.path.join(state, "scope.json"):
        return 0

    # 저장소 밖 경로(임시 파일 등)는 통과
    if os.path.commonpath([real, root]) != root:
        return 0

    if not os.path.exists(os.path.join(state, "approved")):
        deny(MSG)
    try:
        with open(os.path.join(state, "scope.json"), encoding="utf-8") as f:
            files = json.load(f).get("files") or []
    except Exception:
        deny(MSG)
    rel = os.path.relpath(real, root).replace(os.sep, "/")
    if rel.startswith("../") or not any(glob_to_re(g).match(rel) for g in files):
        deny(MSG)
    return 0

if __name__ == "__main__":
    sys.exit(main())
