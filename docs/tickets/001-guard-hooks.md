# 티켓 001 — 임무 파일, 훅, 권한 목록

- 상태: 승인됨 (2026-11-14, 아키텍터 「해」). 개정 1 (2026-11-14, 아키텍터 승인): PR #2 검수에서 나온 2·4·6번 보완
- 설계 근거: 프로젝트 「미션7」 `claude/워크플로우_시스템_설계.md` 6장 순서 1, 4-4 훅 목록
- 구현 모델: Sonnet 5.5
- 가지: `chore/guard-hooks` (dev에서 갈라서 PR을 dev로 연다)

## 목적

2026-11-14 세션의 사고 A(범위 넘침)·B(확인 없는 보고)·C(해석 어긋남)·F(승인 없는 비용·조작)를 자동으로 막는다.

## 만들 것

| 번호 | 파일 | 내용 |
|---|---|---|
| 1 | `.claude/mission.md` | 임무 한 줄을 적는 틀. 지금 내용: "워크플로우 시스템 구축(티켓 001~)" |
| 2 | `.claude/hooks/session-start.sh` | 세션 시작 때 `mission.md`를 읽어 클로드에게 보여 준다. 앞머리 문구는 "이 임무 안의 일만 한다"로 쓴다 |
| 3 | `.claude/hooks/approval.py` | 사용자 메시지 훅. 메시지 전체가 짧은 승인어("해", "고쳐", "진행", "써", "보내", "병합해" 등)이면 `.claude/state/approved`를 만든다. 그 밖의 메시지는 새 지시로 보고 `approved`와 `scope.json`을 지운다 |
| 4 | `.claude/hooks/scope-lock.py` | 파일 고치기 직전(Edit·Write·NotebookEdit) 훅. `scope.json` 자체를 쓰는 것은 허용한다. 저장소 밖 경로(임시 파일 등)도 통과시킨다. 그 밖에는 `approved`가 없거나 `scope.json`의 `files` 목록에 없는 파일이면 거부한다. 거부 문구: "해석과 고칠 파일을 먼저 보고하고 scope.json에 적은 뒤 승인을 받으세요" |
| 5 | 같은 훅의 Bash 검사 | `sed -i`, `perl -i`처럼 파일을 직접 바꾸는 명령은 거부하고 Edit 도구를 쓰라고 돌려준다 |
| 6 | `.claude/hooks/evidence.py` | 끝내기(Stop) 훅. 마지막 사용자 메시지 뒤에 `git push`가 있었고, push한 커밋의 바뀐 파일에 `app/`, `components/`, `public/`, `lib/` 또는 `.css` 파일이 있으면, 그 뒤에 ① 배포 상태가 success인 확인과 ② 브라우저 화면 저장 호출이 있어야 한다. 없으면 거부한다. 화면과 무관한 push(문서·훅 등)는 통과시킨다. ①은 Vercel 배포 조회 도구 결과의 READY·success, 또는 Bash `gh api …/status` 결과의 success를 인정한다. ②는 도구 이름에 screenshot·zoom이 들어간 호출, 또는 도구 입력의 `action`이 `screenshot`·`zoom`인 호출(예: `chrome_computer`)을 인정한다 |
| 7 | `.claude/hooks/ban-phrases.py` | 컨테이너의 `~/.claude/ban-phrases-hook.py`를 그대로 옮겨 Stop 훅으로 건다 |
| 8 | 비용 잠금 | `settings.json`에서 Vercel 환경변수 만들기·고치기·배포 만들기 도구는 승인 창(ask). Bash 명령에 `AI_FAKE_MODEL`, `OPENAI_`, `vercel env`가 들어가도 승인 창 |
| 9 | 새 탭 잠금 | 이름에 `tabs_create`가 들어간 도구는 거부하고 "사용자 탭에서 하세요"를 돌려준다 |
| 10 | 권한 목록 | `settings.json`의 permissions에서 main으로 push·merge하는 명령은 승인 창(ask) |
| 11 | `.gitignore` | `.claude/state/`를 추가한다 |

`scope.json` 모양:

```json
{ "ticket": "001", "files": [".claude/**", ".gitignore"], "selectors": [] }
```

## 건드리지 않을 것

- `.claude/settings.json`의 기존 훅 다섯 개(형식 검증 두 개, 비밀값, `rm`, 개인번호). 새 훅은 그 옆에 더한다
- 화면·서버·DB 코드 전부(`app/`, `components/`, `lib/`, `supabase/`, `public/`)
- 계정 스킬

## 완료 조건

새 Claude Code 세션을 열어 아래 다섯 가지를 시험하고, 결과(훅이 돌려준 문구)를 PR 설명에 적는다.

| 번호 | 시험 | 기대 결과 |
|---|---|---|
| 1 | `scope.json` 없이 아무 파일이나 고친다 | 거부 |
| 2 | 승인 후 `scope.json`에 없는 파일을 고친다 | 거부 |
| 3 | `sed -i`로 파일을 고친다 | 거부 |
| 4 | push한 뒤 화면 확인 없이 답을 끝낸다 | 끝내기 거부 |
| 5 | Bash로 `AI_FAKE_MODEL`이 든 명령을 실행한다 | 승인 창 |

시험 중에 실제 파일을 바꾸거나 push하지 않는다. 4번은 시험용 빈 가지에서 한다.

## 검수

검수 담당이 아직 없으므로 기획 세션이 `review-other-session-work` 순서로 검수한다. 기존 훅 다섯 개가 그대로인지, 범위 밖 파일이 바뀌지 않았는지부터 본다.
