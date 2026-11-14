#!/bin/sh
# 세션 시작 때 임무 파일을 클로드에게 보여 준다.
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
F="$DIR/.claude/mission.md"
if [ -f "$F" ]; then
  echo "[이번 임무] 이 임무에서 벗어나는 일은 하지 않는다."
  cat "$F"
fi
exit 0
