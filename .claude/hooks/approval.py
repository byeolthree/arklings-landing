#!/usr/bin/env python3
"""사용자 메시지 훅. 짧은 승인어면 approved를 만들고, 그 밖의 메시지는 새 지시로 보고 approved·scope.json을 지운다."""
import json, os, re, sys

APPROVE = {
    "해", "해줘", "해라", "고쳐", "고쳐줘", "진행", "진행해", "진행해줘",
    "써", "써줘", "보내", "보내줘", "병합해", "병합해줘",
}

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
