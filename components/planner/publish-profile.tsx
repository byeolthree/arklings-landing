"use client";

import { useEffect, useRef, useState } from "react";
import { ROLES } from "@/lib/collab";
import { BIO_MAX, HANDLE_MAX, normalizeHandle, validateCreatorProfile, validateHandle, type ProfileErrors, type ProfileValues } from "@/lib/creator-rules";

export type SaveResult = { ok: true } | { ok: false; errors?: ProfileErrors; error?: string };
// 공개 주소를 쓸 수 있는지 서버에 물어본 결과. available = 쓸 수 있음, taken = 이미 쓰는 중, error = 확인하지 못함
export type HandleCheck = "available" | "taken" | "error";
type Avail = { status: "idle" | "checking" | HandleCheck; handle: string };

// 「포트폴리오에 올리기」를 눌렀을 때 열리는 크리에이터 프로필 칸(공개 주소·역할·소개).
// 만들기와 고치기를 모두 처리한다. 값은 이 부품이 먼저 검사하고, 저장은 부르는 쪽이 정한 함수(onSubmit)가 한다.
export function PublishProfile({
  mode,
  initial,
  displayName,
  onSubmit,
  onCancel,
  checkHandle,
}: {
  mode: "create" | "edit";
  initial?: ProfileValues;
  displayName: string;
  onSubmit: (value: ProfileValues) => Promise<SaveResult>;
  onCancel: () => void;
  // 공개 주소 중복 확인(서버). 없으면 중복 확인 버튼과 자동 확인을 쓰지 않는다(저장할 때 서버가 마지막으로 확인한다).
  checkHandle?: (handle: string) => Promise<HandleCheck>;
}) {
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [roles, setRoles] = useState<ProfileValues["roles"]>(initial?.roles ?? []);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const editing = mode === "edit";
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

  function toggle(r: ProfileValues["roles"][number]) {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const checked = validateCreatorProfile({ handle, roles, bio });
    if (!checked.ok) return setErrors(checked.errors);
    if (avail.status === "taken" && avail.handle === checked.value.handle) {
      return setErrors({ handle: "이미 쓰고 있는 공개 주소예요. 다른 주소를 적어 주세요." });
    }
    setErrors({});
    setPending(true);
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

  return (
    <form className="pp-form" onSubmit={submit} noValidate aria-label="크리에이터 프로필">
      <h3 className="pp-title">{editing ? "크리에이터 프로필 고치기" : "먼저 크리에이터 프로필을 만들어 주세요"}</h3>
      <p className="pp-sub">포트폴리오에는 프로필이 함께 올라가요. 프로필은 처음 한 번만 만들면 돼요.</p>

      {/* 칸을 접거나 숨길 수 없는 안내: 프로필이 누구에게나 보인다는 것 */}
      <p className="pp-notice" role="note">
        이 프로필은 누구나 볼 수 있습니다
        <span> · 공개 이름 「{displayName || "이름 없음"}」, 공개 주소, 역할, 소개가 보여요.</span>
      </p>

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
        {checkHandle && !editing && (
          <p className={`pp-avail ${avail.status}`} role="status" aria-live="polite">
            {avail.status === "available" && `「${avail.handle}」은(는) 쓸 수 있는 주소예요.`}
            {avail.status === "taken" && `「${avail.handle}」은(는) 이미 쓰고 있는 주소예요. 다른 주소를 적어 주세요.`}
            {avail.status === "error" && "지금은 이 주소가 비어 있는지 확인하지 못했어요. 그대로 저장해도 돼요. 저장할 때 다시 확인하고, 이미 쓰는 주소면 알려 드려요."}
          </p>
        )}
        <p id="pp-handle-hint" className="pp-hint">
          {editing ? "공개 주소는 한 번 정하면 바꿀 수 없어요." : "영문 소문자·숫자·하이픈, 3~20자. 한 번 정하면 바꿀 수 없어요."}
        </p>
        {errors.handle && (
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
          {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
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

      <div className="pp-field">
        <label htmlFor="pp-bio" className="pp-label">
          소개 <span className="pp-hint-inline">(선택, 한 줄)</span>
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

      {formError && (
        <p className="pp-err" role="alert">
          {formError}
        </p>
      )}

      <div className="row-actions">
        <button type="submit" className="btn btn-primary sm" disabled={pending}>
          {pending ? "저장하는 중…" : editing ? "프로필 저장" : "프로필 저장하고 올리기"}
        </button>
        <button type="button" className="btn btn-ghost sm" onClick={onCancel} disabled={pending}>
          취소
        </button>
      </div>
    </form>
  );
}
