"use client";

import { useEffect, useRef, useState } from "react";
import { ROLES, type Role } from "@/lib/collab";
import {
  ABOUT_MAX,
  BIO_MAX,
  CHANNEL_LABEL_MAX,
  CHANNEL_MAX,
  HANDLE_MAX,
  ROLE_NOTE_MAX,
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

// 역할마다 「하는 일」 칸에 보여 줄 예시 글(입력칸 안의 흐린 글)
const ROLE_NOTE_HINT: Record<Role, string> = {
  video: "예: 숏폼·모션그래픽 영상",
  script: "예: 단편 대본, 시리즈 구성",
  art_director: "예: 컨셉 아트, 캐릭터 디자인",
  history_advisor: "예: 삼국시대 복식·생활 고증",
  producer: "예: 제작 일정·예산 관리",
  other: "예: 맡아서 하는 일",
};

// 크리에이터 프로필 칸(공개 주소·역할·소개 …). 만들기와 고치기를 모두 처리한다.
// context = "planner": 기획안을 올리다가 열리는 칸. 필수 칸(공개 주소·역할·한 줄 소개)만 있고, 저장하면 프로필도 함께 공개된다.
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
}: {
  mode: "create" | "edit";
  context: "mypage" | "planner";
  initial?: Partial<ProfileValues>;
  onSubmit: (value: ProfileValues) => Promise<SaveResult>;
  onCancel: () => void;
  // 공개 주소 중복 확인(서버). 「이미 쓰는 주소」로 나온 주소는 저장하지 않는다. 서버는 저장할 때 마지막으로 한 번 더 확인한다.
  checkHandle?: (handle: string) => Promise<HandleCheck>;
  // 저장 버튼 글. 안 주면 상황에 맞게 정한다(기획안 올리기: 「프로필 저장하고 올리기」, 그 밖: 「프로필 저장」).
  submitLabel?: string;
}) {
  const full = context === "mypage";
  const editing = mode === "edit";
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [roles, setRoles] = useState<Role[]>(initial?.roles ?? []);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [roleNotes, setRoleNotes] = useState<Partial<Record<Role, string>>>(initial?.roleNotes ?? {});
  const [channels, setChannels] = useState<Channel[]>(initial?.channels?.length ? initial.channels : []);
  const [openToCollab, setOpenToCollab] = useState(initial?.openToCollab ?? true);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
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
  const setChannel = (i: number, patch: Partial<Channel>) => setChannels((cur) => cur.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const checked = validateCreatorProfile({
      handle,
      roles,
      bio,
      // 기획안을 올리다가 열리는 칸에서는 필수 칸만 받는다. 나머지는 마이페이지에서 나중에 채운다.
      about: full ? about : "",
      roleNotes: full ? roleNotes : {},
      channels: full ? channels : [],
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
      {/* 처음 열 때(만들기)만 보이는 안내 두 줄 */}
      {!editing && (
        <div className="pp-notice" role="note">
          <p>공개 주소는 나중에 바꿀 수 없습니다</p>
          <p>이 프로필은 누구나 볼 수 있습니다</p>
        </div>
      )}

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
          {editing ? "공개 주소는 한 번 정하면 바꿀 수 없어요." : "영문 소문자·숫자·하이픈, 3~20자. 한 번 정하면 바꿀 수 없어요."}
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
            <button key={r} type="button" className="opt" aria-pressed={roles.includes(r)} onClick={() => toggle(r)}>
              {ROLES[r]}
            </button>
          ))}
        </div>
        {errors.roles && (
          <p className="pp-err" role="alert">
            {errors.roles}
          </p>
        )}
      </div>

      {/* P1 역할별 한 줄: 고른 역할마다 한 칸 */}
      {full && roles.length > 0 && (
        <div className="pp-field">
          <span className="pp-label">
            역할별 하는 일 <span className="pp-hint-inline">(선택, 역할마다 한 줄)</span>
          </span>
          <div className="pp-notes">
            {(Object.keys(ROLES) as Role[])
              .filter((r) => roles.includes(r))
              .map((r) => (
                <div key={r} className="pp-note">
                  <label htmlFor={`pp-note-${r}`} className="pp-note-label">
                    {ROLES[r]}
                  </label>
                  <input
                    id={`pp-note-${r}`}
                    className="answer title-in"
                    value={roleNotes[r] ?? ""}
                    onChange={(e) => setRoleNotes((cur) => ({ ...cur, [r]: e.target.value }))}
                    maxLength={ROLE_NOTE_MAX}
                    placeholder={ROLE_NOTE_HINT[r]}
                  />
                </div>
              ))}
          </div>
          {errors.roleNotes && (
            <p className="pp-err" role="alert">
              {errors.roleNotes}
            </p>
          )}
        </div>
      )}

      <div className="pp-field">
        <label htmlFor="pp-bio" className="pp-label">
          한 줄 소개 <span className="pp-hint-inline">(선택)</span>
        </label>
        <textarea
          id="pp-bio"
          className="answer"
          style={{ minHeight: 72 }}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="나를 소개하는 한 줄이에요. 예: 사라지는 기억과 기록하는 사람을 쓰는 대본 작가예요."
          aria-invalid={errors.bio ? true : undefined}
        />
        <p className={`len ${bio.length > BIO_MAX ? "over" : ""}`}>
          <span className="cnt">{bio.length}</span> / {BIO_MAX}자
        </p>
        {errors.bio && (
          <p className="pp-err" role="alert">
            {errors.bio}
          </p>
        )}
      </div>

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
            placeholder="경력, 참여한 일, 하고 싶은 협업을 자유롭게 적어 주세요."
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
                  aria-label={`채널 ${i + 1} 이름`}
                  value={c.label}
                  onChange={(e) => setChannel(i, { label: e.target.value })}
                  maxLength={CHANNEL_LABEL_MAX}
                  placeholder="이름 (예: 인스타그램)"
                />
                <input
                  className="answer title-in"
                  aria-label={`채널 ${i + 1} 주소`}
                  value={c.url}
                  onChange={(e) => setChannel(i, { url: e.target.value })}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="https://"
                />
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
        <div className="pp-field">
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
        <div className="pp-field">
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
        <button type="button" className="btn btn-ghost sm" onClick={onCancel} disabled={pending}>
          취소
        </button>
      </div>
    </form>
  );
}
