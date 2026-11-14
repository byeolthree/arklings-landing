#!/usr/bin/env python3
"""끝내기(Stop) 훅. 마지막 사용자 메시지 뒤에 git push가 있었으면, 그 뒤에
① 배포 상태 success 확인과 ② 브라우저 화면 저장(screenshot·zoom) 호출이 있어야 한다."""
import json, re, sys

MSG = ("git push 뒤에 확인이 없습니다. 배포 상태가 success인지 확인하고, "
       "브라우저 화면을 저장(screenshot 또는 zoom)한 뒤에 답을 끝내세요.")

def blocks(msg):
    c = (msg or {}).get("content")
    if isinstance(c, str):
        return [{"type": "text", "text": c}]
    return c if isinstance(c, list) else []

def text_of(c):
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(b.get("text", "") for b in c if isinstance(b, dict))
    return ""

def main():
    try:
        data = json.load(sys.stdin)
        if data.get("stop_hook_active"):
            return 0
        events = []
        with open(data["transcript_path"], encoding="utf-8") as f:
            for line in f:
                try:
                    events.append(json.loads(line))
                except Exception:
                    pass
    except Exception:
        return 0

    # 마지막 진짜 사용자 메시지(도구 결과가 아닌 것)
    last_user = -1
    for i, e in enumerate(events):
        if e.get("type") == "user" and not e.get("isMeta"):
            bs = blocks(e.get("message"))
            if any(b.get("type") == "text" and b.get("text", "").strip() for b in bs):
                last_user = i
    tail = events[last_user + 1:]

    uses = []  # (순번, 이름, 입력, id)
    results = {}  # tool_use_id -> 결과 글
    for n, e in enumerate(tail):
        for b in blocks(e.get("message")):
            if b.get("type") == "tool_use":
                uses.append((n, b.get("name", ""), b.get("input") or {}, b.get("id")))
            elif b.get("type") == "tool_result":
                results[b.get("tool_use_id")] = (n, text_of(b.get("content")))

    push_at = [n for n, name, inp, _ in uses
               if name == "Bash" and re.search(r"\bgit\s+push\b", inp.get("command", ""))]
    if not push_at:
        return 0
    p = min(push_at)

    deploy_ok = any(
        n > p and re.search(r"get_deployment|list_deployments|git_deployment", name, re.I)
        and uid in results and re.search(r"READY|success", results[uid][1], re.I)
        for n, name, _, uid in uses)
    shot = any(n > p and re.search(r"screenshot|zoom", name, re.I) for n, name, _, _ in uses)
    if deploy_ok and shot:
        return 0
    sys.stderr.write(MSG)
    return 2

if __name__ == "__main__":
    sys.exit(main())
