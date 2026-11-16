# 티켓 003 — 범위 파일을 훅이 만든다

## 문제
티켓 001은 모델이 `.claude/state/scope.json`을 직접 쓰게 했다.
Claude Code의 자동 권한 검사는 이 쓰기를 「감독 장치를 건드림」으로 보고 막는다.
그래서 LLM 세션과 Fable 세션이 저장소 파일을 하나도 쓰지 못하고 멈췄다.

## 바꾼 것
| 파일 | 내용 |
|---|---|
| `.claude/hooks/approval.py` | 사용자가 승인어(「해」 등)를 보내면, 직전 Claude 답변의 ```scope 블록을 대화 기록에서 읽어 `scope.json`과 `approved`를 훅이 직접 만든다 |
| `.claude/hooks/scope-lock.py` | 거부 문구를 새 방법(```scope 블록) 안내로 바꿨다 |
| `docs/handoff-llm-2026-11-14.md` | 같은 안내로 고쳤다 |

모델이 쓰는 법:

    ```scope
    docs/library-data/answers/**
    README.md
    ```

## 시험 (2026-11-16, 임시 폴더에서)
| 경우 | 결과 |
|---|---|
| 승인 전 README.md 쓰기 | 거부 |
| 「해」 뒤 블록에 있는 파일·`**` 아래 파일 | 통과 |
| 「해」 뒤 블록에 없는 파일 | 거부 |
| 새 지시 뒤 같은 파일 | 거부(범위 지워짐) |
