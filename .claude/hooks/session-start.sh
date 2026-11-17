#!/bin/sh
# 세션 시작 훅: 이번 임무와 기획 세션이 승인한 티켓을 보여 준다.
# 구현 세션은 「상태: 기획 승인」이 적힌 티켓 범위 안에서만 일한다.
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
F="$DIR/.claude/mission.md"
T="$DIR/docs/tickets"

echo "[역할] 이 세션은 구현 세션이다. 기획은 claude.ai 프로젝트 채팅방의 기획 세션이 맡는다."
if [ -f "$F" ]; then
  echo "[이번 임무]"
  cat "$F"
fi

APPROVED=""
if [ -d "$T" ]; then
  APPROVED=$(for f in $(grep -l "^상태: 기획 승인" "$T"/*.md 2>/dev/null); do grep -q "^상태: 완료" "$f" || echo "$f"; done)
fi

if [ -n "$APPROVED" ]; then
  echo "[승인된 티켓] 아래 티켓의 범위 안에서 일한다."
  for f in $APPROVED; do
    echo "- ${f#$DIR/}: $(head -1 "$f" | sed 's/^# *//')"
  done
else
  echo "[승인된 티켓 없음] 기획 세션이 승인한 티켓이 아직 없다."
  echo "받은 지시를 그대로 적고, '기획 세션에서 티켓을 먼저 만들어 주세요'라고 보고한 뒤 기다린다."
fi
exit 0
