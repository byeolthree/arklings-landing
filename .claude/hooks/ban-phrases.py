#!/usr/bin/env python3
"""끝내기(Stop) 훅. 점만 있는 답, '네' 단답, 금지 표현을 거부한다."""
import json, re, sys

def main():
    try:
        data = json.load(sys.stdin)
        if data.get("stop_hook_active"):
            return 0
        text = None
        with open(data["transcript_path"], encoding="utf-8") as f:
            for line in f:
                try:
                    e = json.loads(line)
                except Exception:
                    continue
                if e.get("type") != "assistant":
                    continue
                c = (e.get("message") or {}).get("content")
                if isinstance(c, str):
                    t = c
                elif isinstance(c, list):
                    t = "\n".join(b.get("text", "") for b in c
                                  if isinstance(b, dict) and b.get("type") == "text")
                else:
                    continue
                if t.strip():
                    text = t
    except Exception:
        return 0
    if text is None:
        return 0
    s = text.strip()
    if re.fullmatch(r"[\s.…·]+", s):
        sys.stderr.write("점(…)만 있는 답변 금지: 말로 답하세요.")
        return 2
    if re.fullmatch(r"(네|넹|넵|예|응|ㅇㅇ)[.!?]*", s):
        sys.stderr.write("'네' 같은 단답 금지: 무엇을 어떻게 했는지 말로 답하세요.")
        return 2
    if re.search(r"죄송|않겠(습니다|다|어)|안\s*하겠|멈추겠|선생님|어르신|할 말 없", s):
        sys.stderr.write("금지 표현 감지: '죄송', '~하지 않겠다', '멈추겠다', '선생님', '어르신', '할 말 없습니다' 표현을 빼고 다시 답하세요.")
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
