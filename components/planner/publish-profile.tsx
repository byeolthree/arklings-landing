"use client";

import { channelLabelFromUrl } from "@/lib/channel-label";
import { useEffect, useRef, useState } from "react";
import { ROLES, type Role } from "@/lib/collab";
import { ROLE_TONE } from "@/components/creators/role-tone";
import {
  ABOUT_MAX,
  CHANNEL_MAX,
  HANDLE_MAX,
  normalizeHandle,
  validateCreatorProfile,
  validateHandle,
  type Channel,
  type ProfileErrors,
  type ProfileValues,
} from "@/lib/creator-rules";

// 프로필 칸의 제목. 칸을 감싸는 판(패널)의 맨 위 제목 자리에 부르는 쪽이 둔다.
export const profileFormTitle = (mode: "create" | "edit") => (mode === "edit" ? "크리에이터 프로필 고치기" : "크리에이터 프로필을 만들어 주세요");

export type SaveResult = { ok: true } | { ok: false; errors?: ProfileErrors; error?: string };
// 공개 주소를 쓸 수 있는지 서버에 물어본 결과. available = 쓸 수 있음, taken = 이미 쓰는 중, error = 확인하지 못함
export type HandleCheck = "available" | "taken" | "error";
type Avail = { status: "idle" | "checking" | HandleCheck; handle: string };

// 크리에이터 프로필 칸(공개 주소·역할·소개 …). 만들기와 고치기를 모두 처리한다.
// context = "planner": 기획안을 올리다가 열리는 칸. 필수 칸(공개 주소·역할)만 있고, 저장하면 프로필도 함께 공개된다.
// context = "mypage": 마이페이지의 전체판. 역할별 한 줄·소개 글·채널 링크·협업 신청 받기·공개 설정이 더해지고, 만들 때 공개 설정은 비공개가 먼저 골라져 있다.
// 값은 이 부품이 먼저 검사하고, 저장은 부르는 쪽이 정한 함수(onSubmit)가 한다.
export function PublishProfile({
  mode,
  context,
  initial,
  onSubmit,
  onCancel,
  checkHandle,
  submitLabel,
  heroField,
}: {
  mode: "create" | "edit";
  context: "mypage" | "planner";
  initial?: Partial<ProfileValues>;
  onSubmit: (value: ProfileValues) => Promise<SaveResult>;
  // 취소 버튼은 이 함수를 줄 때만 보인다(기획안을 올리다가 여는 칸). 마이페이지 구역에는 열고 닫는 칸이 없어 안 준다.
  onCancel?: () => void;
  // 공개 주소 중복 확인(서버). 「이미 쓰는 주소」로 나온 주소는 저장하지 않는다. 서버는 저장할 때 마지막으로 한 번 더 확인한다.
  checkHandle?: (handle: string) => Promise<HandleCheck>;
  // 저장 버튼 글. 안 주면 상황에 맞게 정한다(기획안 올리기: 「프로필 저장하고 올리기」, 그 밖: 「프로필 저장」).
  submitLabel?: string;
  // 역할 칸 아래에 끼우는 칸(마이페이지 샘플의 「대표 이미지·영상」). 안 주면 아무것도 안 보인다.
  heroField?: React.ReactNode;
}) {
  const full = context === "mypage";
  const editing = mode === "edit";
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [roles, setRoles] = useState<Role[]>(initial?.roles ?? []);
  const [about, setAbout] = useState(initial?.about ?? "");
  // 마이페이지판은 채널 줄(흐린 예시 포함)을 처음부터 한 줄 보여 준다. 빈 줄은 저장할 때 빠진다(validateCreatorProfile).
  const [channels, setChannels] = useState<Channel[]>(initial?.channels?.length ? initial.channels : full ? [{ label: "", url: "" }] : []);
  const [openToCollab, setOpenToCollab] = useState(initial?.openToCollab ?? true);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [avail, setAvail] = useState<Avail>({ status: "idle", handle: "" });
  const reqId = useRef(0);

  // 서버에 물어본다. 먼저 보낸 요청의 늦은 답이 새 입력을 덮어쓰지 않게 요청 번호로 거른다.
  async function runCheck(raw: string) {
    if (!checkHandle || editing) return;
    const h = normalizeHandle(raw);
    if (validateHandle(h)) return setAvail({ status: "idle", handle: h });
    const id = ++reqId.current;
    setAvail({ status: "checking", handle: h });
    let result: HandleCheck;
    try {
      result = await checkHandle(h);
    } catch {
      result = "error";
    }
    if (id === reqId.current) setAvail({ status: result, handle: h });
  }

  // 입력을 멈추고 0.6초 뒤에 자동으로 확인한다(형식이 맞을 때만).
  useEffect(() => {
    if (!checkHandle || editing) return;
    const h = normalizeHandle(handle);
    reqId.current += 1; // 입력이 바뀌면 진행 중이던 확인은 버린다
    if (validateHandle(h)) return;
    const t = setTimeout(() => void runCheck(h), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  function toggle(r: Role) {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }
  // 역할 태그를 두 번 누르면 그 역할이 맨 앞(대표 역할)이 된다.
  function makeRep(r: Role) {
    setRoles((cur) => [r, ...cur.filter((x) => x !== r)]);
  }
  // 같은 태그를 1초 안에 다시 누르면 「두 번 누름」으로 본다(빠르게 두 번이든 천천히 두 번이든). 두 번째 누름은 선택을 풀지 않고 대표로만 정한다.
  const lastPress = useRef<{ r: Role; t: number } | null>(null);
  function pressRole(r: Role, now: number) {
    const prev = lastPress.current;
    if (prev && prev.r === r && now - prev.t < 1000) {
      lastPress.current = null;
      makeRep(r);
      return;
    }
    lastPress.current = { r, t: now };
    toggle(r);
  }
  const setChannel = (i: number, patch: Partial<Channel>) => setChannels((cur) => cur.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const checked = validateCreatorProfile({
      handle,
      roles,
      bio: "", // 한 줄 소개 칸은 없앴다(D23 8차). 서버 규칙에는 아직 있으므로 빈 값을 보낸다
      // 기획안을 올리다가 열리는 칸에서는 필수 칸만 받는다. 나머지는 마이페이지에서 나중에 채운다.
      about: full ? about : "",
      channels: full ? channels.map((c) => ({ ...c, label: channelLabelFromUrl(c.url) ?? c.label })) : [],
      openToCollab: full ? openToCollab : true,
      isPublic: full ? isPublic : true,
    });
    if (!checked.ok) return setErrors(checked.errors);
    setErrors({});
    setPending(true);
    // 저장하기 전에 이 주소가 이미 쓰는 주소인지 확인한다(아직 안 했으면 지금 한다). 확인이 실패하면 그대로 저장을 시도하고, 서버가 마지막으로 확인한다.
    if (checkHandle && !editing && !(avail.status === "available" && avail.handle === checked.value.handle)) {
      let result: HandleCheck;
      try {
        result = await checkHandle(checked.value.handle);
      } catch {
        result = "error";
      }
      setAvail({ status: result, handle: checked.value.handle });
      if (result === "taken") {
        setPending(false);
        return setErrors({ handle: "이미 쓰고 있는 공개 주소예요. 다른 주소를 적어 주세요." });
      }
    }
    try {
      const r = await onSubmit(checked.value);
      if (!r.ok) {
        if (r.errors) setErrors(r.errors);
        // 저장하는 순간 서버가 「이미 쓰는 주소」라고 하면(동시에 같은 주소를 저장한 경우 등) 앞서 나온 「쓸 수 있는 주소예요」는 지우고 「이미 쓰는 주소」 하나만 보인다
        if (r.errors?.handle && !editing) setAvail({ status: "taken", handle: checked.value.handle });
        if (r.error) setFormError(r.error);
      }
    } catch {
      setFormError("지금은 저장할 수 없어요. 잠시 뒤에 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const label = submitLabel ?? (context === "planner" && !editing ? "프로필 저장하고 올리기" : "프로필 저장");

  return (
    <form className="pp-form" onSubmit={submit} noValidate aria-label="크리에이터 프로필">
      <div className="pp-field">
        <label htmlFor="pp-handle" className="pp-label">
          공개 주소
        </label>
        <div className="pp-handle">
          <span className="pp-prefix" aria-hidden="true">
            /creators/
          </span>
          <input
            id="pp-handle"
            className="answer title-in"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            maxLength={HANDLE_MAX}
            readOnly={editing}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="my-name"
            aria-invalid={errors.handle ? true : undefined}
            aria-describedby="pp-handle-hint"
          />
          {checkHandle && !editing && (
            <button type="button" className="btn btn-ghost sm" onClick={() => void runCheck(handle)} disabled={avail.status === "checking"}>
              {avail.status === "checking" ? "확인하는 중…" : "중복 확인"}
            </button>
          )}
        </div>
        {/* 결과가 있을 때만 줄을 만든다(없으면 아래 안내 문구가 바로 위로 붙는다) */}
        {checkHandle && !editing && (avail.status === "available" || avail.status === "taken") && (
          <p className={`pp-avail ${avail.status}`} role="status" aria-live="polite">
            {avail.status === "available" && `「${avail.handle}」은(는) 쓸 수 있는 주소예요.`}
            {avail.status === "taken" && `「${avail.handle}」은(는) 이미 쓰고 있는 주소예요. 다른 주소를 적어 주세요.`}
          </p>
        )}
        <p id="pp-handle-hint" className="pp-hint">
          {editing ? (
            <span style={{ color: "var(--jaju)" }}>공개 주소는 한 번 정하면 바꿀 수 없어요.</span>
          ) : (
            <>
              영문 소문자·숫자·하이픈, 3~20자. <span style={{ color: "var(--jaju)" }}>한 번 정하면 바꿀 수 없어요.</span>
            </>
          )}
        </p>
        {errors.handle && avail.status !== "taken" && (
          <p className="pp-err" role="alert">
            {errors.handle}
          </p>
        )}
      </div>

      <div className="pp-field">
        <span className="pp-label" id="pp-roles-label">
          역할 <span className="pp-hint-inline">(하나 이상)</span>
        </span>
        <div className="pp-roles" role="group" aria-labelledby="pp-roles-label">
          {(Object.keys(ROLES) as Role[]).map((r) => (
            <button key={r} type="button" className={`opt role-opt ${ROLE_TONE[r]}`} aria-pressed={roles.includes(r)} onClick={(e) => pressRole(r, e.timeStamp)}>
              {roles.length >= 2 && roles[0] === r && <span className="rep-badge">대표</span>}
              {ROLES[r]}
            </button>
          ))}
        </div>
        {roles.length >= 2 && <p className="pp-hint">{"태그를 '빠르게 두 번' 클릭해서 대표 역할을 골라주세요."}</p>}
        {errors.roles && (
          <p className="pp-err" role="alert">
            {errors.roles}
          </p>
        )}
      </div>

      {heroField}

      {/* P2 소개 글 */}
      {full && (
        <div className="pp-field">
          <label htmlFor="pp-about" className="pp-label">
            소개 글 <span className="pp-hint-inline">(선택, 프로필 화면에만 보여요)</span>
          </label>
          <textarea
            id="pp-about"
            className="answer"
            style={{ minHeight: 120 }}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder={"〈한 줄 소개〉\n〈경력〉\n〈참여한 일〉\n〈하고 싶은 협업〉"}
            aria-invalid={errors.about ? true : undefined}
          />
          <p className={`len ${about.length > ABOUT_MAX ? "over" : ""}`}>
            <span className="cnt">{about.length}</span> / {ABOUT_MAX}자
          </p>
          {errors.about && (
            <p className="pp-err" role="alert">
              {errors.about}
            </p>
          )}
        </div>
      )}

      {/* P3 채널 링크 */}
      {full && (
        <div className="pp-field">
          <span className="pp-label">
            채널 링크 <span className="pp-hint-inline">(선택, {CHANNEL_MAX}개까지)</span>
          </span>
          <div className="pp-channels">
            {channels.map((c, i) => (
              <div key={i} className="pp-channel">
                <input
                  className="answer title-in"
                  aria-label={`채널 ${i + 1} 주소`}
                  value={c.url}
                  onChange={(e) => setChannel(i, { url: e.target.value, label: channelLabelFromUrl(e.target.value) ?? "" })}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="인스타그램·유튜브 등 주소를 붙여 넣으세요 (https://)"
                />
                <span className="pp-hint-inline pp-channel-name" aria-live="polite">
                  {c.url.trim() && c.label ? c.label : ""}
                </span>
                <button type="button" className="btn btn-ghost sm danger" onClick={() => setChannels((cur) => cur.filter((_, k) => k !== i))}>
                  빼기
                </button>
              </div>
            ))}
          </div>
          {channels.length < CHANNEL_MAX && (
            <div className="row-actions">
              <button type="button" className="btn btn-ghost sm" onClick={() => setChannels((cur) => [...cur, { label: "", url: "" }])}>
                + 채널 추가
              </button>
            </div>
          )}
          {errors.channels && (
            <p className="pp-err" role="alert">
              {errors.channels}
            </p>
          )}
        </div>
      )}

      {/* P6 협업 신청 받기 */}
      {full && (
        <div className="pp-field pp-half">
          <span className="pp-label" id="pp-collab-label">
            협업 신청 받기
          </span>
          <div className="pp-roles" role="radiogroup" aria-labelledby="pp-collab-label">
            <button type="button" className="opt" role="radio" aria-checked={openToCollab} onClick={() => setOpenToCollab(true)}>
              켬
            </button>
            <button type="button" className="opt" role="radio" aria-checked={!openToCollab} onClick={() => setOpenToCollab(false)}>
              끔
            </button>
          </div>
        </div>
      )}

      {/* 공개 설정: 마이페이지에서만(기본 비공개). 기획안을 올리다가 만들면 프로필도 함께 공개된다 */}
      {full && (
        <div className="pp-field pp-half">
          <span className="pp-label" id="pp-vis-label">
            공개 설정
          </span>
          <div className="pp-roles" role="radiogroup" aria-labelledby="pp-vis-label">
            <button type="button" className="opt" role="radio" aria-checked={isPublic} onClick={() => setIsPublic(true)}>
              공개
            </button>
            <button type="button" className="opt" role="radio" aria-checked={!isPublic} onClick={() => setIsPublic(false)}>
              비공개
            </button>
          </div>
        </div>
      )}

      {formError && (
        <p className="pp-err" role="alert">
          {formError}
        </p>
      )}

      <div className="row-actions">
        <button type="submit" className="btn btn-primary sm" disabled={pending}>
          {pending ? "저장하는 중…" : label}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost sm" onClick={onCancel} disabled={pending}>
            취소
          </button>
        )}
      </div>
    </form>
  );
}
