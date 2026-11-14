#!/usr/bin/env python3
"""파일 고치기 직전(Edit·Write·NotebookEdit)과 Bash 검사 훅."""
import json, os, re, sys

MSG = "해석과 고칠 파일을 먼저 보고하고 scope.json에 적은 뒤 승인을 받으세요"
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
