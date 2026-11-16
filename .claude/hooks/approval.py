#!/usr/bin/env python3
"""사용자 메시지 훅.

짧은 승인어면 직전 Claude 답변의 ```scope 블록을 읽어 scope.json과 approved를 훅이 직접 만든다.
모델은 .claude/state 안 파일을 쓰지 않는다(Claude Code 자동 권한 검사가 감독 파일 쓰기를 막기 때문).
그 밖의 메시지는 새 지시로 보고 approved·scope.json을 지운다.
"""
import json, os, re, sys

APPROVE = {
    "해", "해줘", "해라", "고쳐", "고쳐줘", "진행", "진행해", "진행해줘",
    "써", "써줘", "보내", "보내줘", "병합해", "병합해줘",
}

BLOCK = re.compile(r"```scope[^\n]*\n(.*?)```", re.S)


def last_scope(transcript_path):
    """대화 기록에서 가장 최근 Claude 답변 속 ```scope 블록의 파일 목록을 돌려준다."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    texts = []
    with open(transcript_path, encoding="utf-8") as f:
        for line in f:
            try:
                ev = json.loads(line)
            except Exception:
                continue
            if ev.get("type") != "assistant":
                continue
            content = (ev.get("message") or {}).get("content")
            if isinstance(content, str):
                texts.append(content)
            elif isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text":
                        texts.append(c.get("text") or "")
    for t in reversed(texts):
        found = BLOCK.findall(t)
        if found:
            files = []
            for ln in found[-1].splitlines():
                ln = ln.strip().lstrip("-*").strip().strip("`")
                if ln and not ln.startswith("#"):
                    files.append(ln)
            return files
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    prompt = (data.get("prompt") or "").strip()
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    state = os.path.join(root, ".claude", "state")
    os.makedirs(state, exist_ok=True)
    approved = os.path.join(state, "approved")
    scope = os.path.join(state, "scope.json")
    word = re.sub(r"[\s.!?~,]+$", "", prompt)
    if word in APPROVE:
        files = last_scope(data.get("transcript_path"))
        if files:
            with open(scope, "w", encoding="utf-8") as f:
                json.dump({"files": files}, f, ensure_ascii=False, indent=2)
        open(approved, "w").close()
    else:
        for p in (approved, scope):
            try:
                os.remove(p)
            except FileNotFoundError:
                pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
