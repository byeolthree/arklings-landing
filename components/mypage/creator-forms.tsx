"use client";

// 마이페이지의 「크리에이터 등록」과 「포트폴리오 등록」 실제 화면. 샘플(mypage-preview, work-editor)과 같은 모양이고 진짜로 저장한다.
// 모든 저장은 app/actions/creators.ts의 Server Action이 하고(서버가 로그인·이메일 확인·글자 수를 다시 검사한다), 끝나면 서버에서 다시 읽는다(router.refresh).
import { AlertPopup, ConfirmPopup } from "@/components/ui/alert-popup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLE_TONE } from "@/components/creators/role-tone";
const ROLE_HEX = { jaju: "#a61e5c", dusty: "#5f7c99", gold: "#d89a24", sage: "#6f8a7a", teal: "#1f5a66", body: "#574a50" } as const;
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addTextBlock,
  setProfileRoles,
  setBlockFit,
  addVideoBlock,
  checkHandle as checkHandleAction,
  createWork,
  deleteBlock,
  deleteWork,
  finishFileUpload,
  finishHeroUpload,
  prepareFileUpload,
  prepareHeroUpload,
  removeHero,
  reorderWorkItems,
  reorderWorks,
  saveCreatorProfile,
  setBlockSubKind,
  setProfilePublic,
  setWorkPublic,
  updateTextBlock,
  updateWork,
} from "@/app/actions/creators";
import { GENRES } from "@/components/creators/genres";
import { HERO_RULE, VIDEO_PROMPT } from "@/components/mypage/hero-guide";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import { ROLES, type Role } from "@/lib/collab";
import { BLOCK_LIMIT, DOC_SUBKINDS, IMAGE_SUBKINDS, LOGLINE_TOKEN, QUOTA_BYTES, TITLE_MAX, VIDEO_SUBKINDS, WORK_LIMIT, type ProfileErrors, type ProfileValues } from "@/lib/creator-rules";
import { orderItems, representativeOf } from "@/lib/creator-cards";
import { useLiveReorder } from "@/components/ui/use-live-reorder";
import { kindOfMime, uploadToSlot } from "@/lib/creator-upload-client";
import type { MyProfile, MyWork } from "@/lib/creators-mine";

const LOGLINE_FRAME = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

// 시안 01: 문서 요소 아래의 점선 상자 「외부 문서 첨부 (PDF · 10MB 이하)」와 오른쪽 끝의 「파일 고르기」.
function DocFilePick({ file, onFile, disabled }: { file?: File | null; onFile: (f: File | null) => void; disabled?: boolean }) {
  const [msg, setMsg] = useState("");
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      input.value = "";
      return setMsg("PDF 파일만 올릴 수 있어요.");
    }
    if (f.size > 10 * 1024 * 1024) {
      input.value = "";
      return setMsg(`선택한 파일이 ${mb(f.size)}예요. 10MB 이하만 올릴 수 있어요.`);
    }
    setMsg("");
    onFile(f);
    input.value = "";
  }
  return (
    <div className="we-drop we-drop-doc" style={{ flex: "1 1 100%" }}>
      <div className="we-drop-row">
        <span className="mp-note">외부 문서 첨부 (PDF · 10MB 이하)</span>
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          파일 고르기
          <input type="file" accept="application/pdf" hidden disabled={disabled} onChange={pick} aria-label="문서 파일" />
        </label>
      </div>
      {file && (
        <span className="len">
          {file.name} ({mb(file.size)}){" "}
          <button type="button" className="we-mini" onClick={() => onFile(null)} disabled={disabled}>
            선택 취소
          </button>
        </span>
      )}
      {msg && (
        <p className="pp-err" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

// 접어도 어떤 요소인지 알 수 있도록 요소 이름(굵게)과 받는 형식(보통 굵기)을 늘 보여 준다.
const ELEMENT_NAME: Record<"logline" | "video" | "image" | "text", { name: string; note?: string }> = {
  logline: { name: "로그라인", note: "(이미지, 영상 담당 크리에이터는 컨셉 등 기획을 소개해주세요)" },
  video: { name: "영상" },
  image: { name: "이미지" },
  text: { name: "문서" },
};
function ElementName({ kind }: { kind: "logline" | "video" | "image" | "text" }) {
  const e = ELEMENT_NAME[kind];
  return (
    <span className="we-name">
      {e.name}
      {e.note && <span> {e.note}</span>}
    </span>
  );
}

// 시안 01: 이미지 요소 = 「▾ 접기 · 이미지 (JPG·PNG·WEBP, 5MB 이하)」 줄 + 이미지가 들어갈 큰 칸(눌러서 고른다).
function ImageSlotBox({ file, onFile, defaultFold = false, bare = false }: { file: File | null; onFile: (f: File | null) => void; defaultFold?: boolean; bare?: boolean }) {
  const [fold, setFold] = useState(defaultFold);
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      e.target.value = "";
      return setMsg("JPG, PNG, WEBP 이미지만 올릴 수 있어요.");
    }
    if (f.size > 5 * 1024 * 1024) {
      e.target.value = "";
      return setMsg(`선택한 파일이 ${mb(f.size)}예요. 5MB 이하만 올릴 수 있어요.`);
    }
    setMsg("");
    onFile(f);
  }
  return (
    <div style={{ flex: "1 1 100%" }}>
      {!bare && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="we-fold" aria-expanded={!fold} onClick={() => setFold(!fold)}>
            {fold ? "▸ 펼치기" : "▾ 접기"}
          </button>
          <ElementName kind="image" />
        </div>
      )}
      {(bare || !fold) && (
        <div className="we-media we-imgbox">
          {url ? (
            <button type="button" className="we-imgchange" onClick={() => ref.current?.click()} aria-label="이미지 바꾸기">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={file?.name ?? "고른 이미지"} />
            </button>
          ) : (
            <div className="we-imgempty">
              <button type="button" className="btn btn-ghost" onClick={() => ref.current?.click()}>
                파일 고르기
              </button>
              <span>(JPG · PNG · WEBP, 5MB 이하)</span>
            </div>
          )}
        </div>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="이미지 파일" onChange={pick} />
      {file && (
        <span className="len">
          {file.name} ({mb(file.size)}){" "}
          <button type="button" className="we-mini" onClick={() => { onFile(null); if (ref.current) ref.current.value = ""; }}>
            선택 취소
          </button>
        </span>
      )}
      {msg && (
        <p className="pp-err" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

// 영상 요소의 「영상 파일 첨부」(2026-11-09 D18 개정, 시안 01): 규칙 안내, 「영상 변환 프롬프트 복사」, 「파일 고르기」. 형식(MP4)·크기(10MB)를 고르는 순간 검사한다.
// 규칙 글과 프롬프트는 대표 영상 칸과 같은 글(hero-guide.ts)이다. 파일을 고르면 onFile로 넘기고, 올리는 일은 부르는 쪽이 한다.
function VideoFilePick({ file, onFile, disabled }: { file?: File | null; onFile: (f: File | null) => void; disabled?: boolean }) {
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const rule = HERO_RULE.video;
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(VIDEO_PROMPT);
      setCopied("복사했어요. 영상 변환 도구에 붙여 넣으세요.");
      setShowPrompt(false);
    } catch {
      setCopied("복사하지 못했어요. 아래 글을 직접 복사해 주세요.");
      setShowPrompt(true);
    }
  }
  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    if (!f) return;
    if (!(rule.types as readonly string[]).includes(f.type)) {
      input.value = "";
      return setMsg("MP4 파일만 올릴 수 있어요.");
    }
    if (f.size > rule.max) {
      input.value = "";
      return setMsg(`선택한 파일이 ${(f.size / 1024 / 1024).toFixed(1)}MB예요. ${rule.max / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
    }
    setMsg("");
    onFile(f);
    input.value = "";
  }
  return (
    <div className="we-drop" style={{ flex: "1 1 100%" }}>
      <p className="mp-note">영상 파일 첨부 · {rule.hint}</p>
      <div className="we-pick">
        <button type="button" className="btn btn-ghost" onClick={copyPrompt} disabled={disabled} aria-label="영상 변환 프롬프트 복사" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          영상 변환 프롬프트
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </svg>
        </button>
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          파일 고르기
          <input type="file" accept={rule.accept} hidden disabled={disabled} onChange={pick} aria-label="영상 파일" />
        </label>
        {file && (
          <span className="len">
            {file.name} ({mb(file.size)}){" "}
            <button type="button" className="we-mini" onClick={() => onFile(null)} disabled={disabled}>
              선택 취소
            </button>
          </span>
        )}
        <span role="status" aria-live="polite" className="len">
          {copied}
        </span>
      </div>
      {showPrompt && <textarea readOnly className="we-text" rows={6} value={VIDEO_PROMPT} aria-label="영상 변환 프롬프트" onFocus={(e) => e.currentTarget.select()} />}
      {msg && (
        <p className="pp-err" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

// 대표 이미지·영상 파일 하나를 올린다: 서버가 규칙을 먼저 보고 올리기 자리를 주고 → 브라우저가 보관함에 직접 올리고 → 서버가 올라온 파일을 다시 검사해 프로필에 건다.
// 실패하면 이유 한 줄을, 성공하면 null을 돌려준다.
async function uploadHeroFile(file: File, kind: "image" | "video"): Promise<string | null> {
  const slot = await prepareHeroUpload({ kind, type: file.type, size: file.size });
  if (!slot.ok) return slot.error;
  const up = await uploadToSlot(slot.path, slot.token, file);
  if (!up.ok) return up.error;
  const fin = await finishHeroUpload({ path: slot.path, kind, name: file.name });
  return fin.ok ? null : fin.error;
}

// 「대표 이미지·영상」 칸(실제 저장): 파일을 고르면 형식·크기를 바로 검사하고 올린다. 프로필이 아직 없으면 고른 파일을 들고 있다가 프로필을 만든 직후 올린다.
function HeroUpload({ hero, hasProfile, pending, onPending, onDone }: { hero?: NonNullable<MyProfile["hero"]>; hasProfile: boolean; pending: File | null; onPending: (f: File | null) => void; onDone: (text: string, err?: boolean) => void }) {
  const [kind, setKind] = useState<"image" | "video">(hero?.kind ?? "image");
  const [msg, setMsg] = useState("");
  const [picked, setPicked] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [copyNote, setCopyNote] = useState("");
  const rule = HERO_RULE[kind];
  const router = useRouter();

  // 「이미지」·「영상」 태그를 누르면 그 종류로 바꾸고 바로 파일 고르는 창을 연다(아래 큰 칸을 눌러도 같다).
  function pickKind(k: "image" | "video") {
    setKind(k);
    setMsg("");
    const el = fileRef.current;
    if (!el) return;
    el.value = "";
    el.accept = HERO_RULE[k].accept;
    el.click();
  }
  async function copyVideoPrompt() {
    try {
      await navigator.clipboard.writeText(VIDEO_PROMPT);
      setCopyNote("영상 변환 프롬프트를 복사했어요.");
    } catch {
      setCopyNote("복사하지 못했어요. 브라우저의 복사 권한을 확인해 주세요.");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    setPicked("");
    if (!f) return setMsg("");
    if (!(rule.types as readonly string[]).includes(f.type)) {
      input.value = "";
      return setMsg(kind === "image" ? "JPG, PNG, WEBP 파일만 올릴 수 있어요." : "MP4 파일만 올릴 수 있어요.");
    }
    if (f.size > rule.max) {
      input.value = "";
      return setMsg(`선택한 파일이 ${(f.size / 1024 / 1024).toFixed(1)}MB예요. ${rule.max / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
    }
    setMsg("");
    setPicked(`${f.name} · ${mb(f.size)}`);
    if (!hasProfile) {
      onPending(f);
      return onDone("프로필을 저장하면 이 파일도 함께 올라가요.");
    }
    setBusy(true);
    const err = await uploadHeroFile(f, kind);
    setBusy(false);
    input.value = "";
    setPicked("");
    if (err) return setMsg(err);
    onDone(hero ? "대표 파일을 바꿨어요." : "대표 파일을 올렸어요.");
    router.refresh();
  }
  async function remove() {
    if (!window.confirm("대표 이미지·영상을 지울까요? 되돌릴 수 없어요.")) return;
    setBusy(true);
    const r = await removeHero();
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    onDone("대표 파일을 지웠어요.");
    router.refresh();
  }

  return (
    <div className="pp-field">
      <span className="pp-label" id="pp-hero-label">
        대표 이미지·영상 <span className="pp-hint-inline">(선택)</span>
      </span>
      <div className="pp-hero">
        <div className="pp-roles" role="group" aria-labelledby="pp-hero-label">
          <button type="button" className="opt" aria-pressed={kind === "image"} onClick={() => pickKind("image")} disabled={busy}>
            이미지
          </button>
          <button type="button" className="opt" aria-pressed={kind === "video"} onClick={() => pickKind("video")} disabled={busy}>
            영상
          </button>
          <button type="button" className="opt" onClick={copyVideoPrompt} aria-label="영상 변환 프롬프트 복사" style={{ position: "relative", paddingRight: 30 }}>
            영상 변환 프롬프트
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: "absolute", top: 5, right: 8 }}>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </svg>
          </button>
        </div>
        {copyNote && (
          <p className="len" role="status" aria-live="polite">
            {copyNote}
          </p>
        )}
        <input type="file" hidden ref={fileRef} accept={rule.accept} onChange={onFile} disabled={busy} aria-label={kind === "image" ? "대표 이미지 파일" : "대표 영상 파일"} aria-describedby="pp-hero-hint" />
        <button type="button" className="pp-drop" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="대표 파일 고르기">
          {hero?.src ? (
            hero.kind === "video" ? (
              <video src={hero.src} muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.src} alt="대표 이미지" />
            )
          ) : pending && !hasProfile ? (
            `올릴 파일: ${pending.name}`
          ) : picked ? (
            `고른 파일: ${picked}${busy ? " · 올리는 중…" : ""}`
          ) : (
            "눌러서 올리기"
          )}
        </button>
        <p id="pp-hero-hint" className="len">
          이미지 JPG · PNG · WEBP, 5MB 이하 · 영상 MP4(H.264), 10MB 이하, 1280×720, 15~30초
        </p>
        {hero && (
          <p className="len">
            지금 걸린 {hero.kind === "video" ? "영상" : "이미지"} · {mb(hero.bytes)}{" "}
            <button type="button" className="btn btn-ghost" onClick={remove} disabled={busy}>
              지우기
            </button>
          </p>
        )}
        {msg && (
          <p className="pp-err" role="alert">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

// ── 크리에이터 등록 ─────────────────────────────────────────────────────────────────
export function CreatorProfileForm({ profile, workCount = 0, showSaved = false }: { profile: MyProfile | null; workCount?: number; showSaved?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  // 작품 없이 프로필만 저장했을 때 뜨는 안내 창. 저장하면 주소에 ?saved=1을 붙이고, 창은 서버가 그 주소를 보고 그린다(저장 직후 화면을 다시 읽어도 사라지지 않는다).
  const [dismissed, setDismissed] = useState(false);
  const savedPopup = showSaved && !dismissed;
  const [busy, setBusy] = useState(false);
  // 프로필을 만들기 전에 고른 대표 파일: 프로필을 만든 직후에 올린다.
  const [pendingHero, setPendingHero] = useState<{ file: File; kind: "image" | "video" } | null>(null);

  async function check(handle: string): Promise<HandleCheck> {
    const r = await checkHandleAction(handle);
    return r.ok ? (r.available ? "available" : "taken") : "error";
  }
  async function onSubmit(v: ProfileValues): Promise<SaveResult> {
    setNote("");
    const r = await saveCreatorProfile({ handle: v.handle, roles: v.roles, about: v.about, channels: v.channels, openToCollab: v.openToCollab, isPublic: v.isPublic });
    if (!r.ok) return { ok: false, errors: r.fieldErrors as ProfileErrors | undefined, error: r.error };
    setNote(r.created ? "프로필을 만들었어요." : "프로필을 저장했어요.");
    if (pendingHero) {
      const err = await uploadHeroFile(pendingHero.file, pendingHero.kind);
      setPendingHero(null);
      setNote(err ? `프로필은 저장했어요. 대표 파일은 올리지 못했어요. ${err}` : "프로필과 대표 파일을 저장했어요.");
    }
    if (workCount === 0) {
      setDismissed(false);
      router.replace("/portfolio/new?step=profile&saved=1");
      return { ok: true };
    }
    // 포트폴리오가 이미 있으면 저장 뒤 내 크리에이터 상세로 간다(포트폴리오 저장 뒤와 같이, 바뀐 모습을 바로 보게, 2026-11-13).
    router.push(`/creators/${r.handle}`);
    return { ok: true };
  }
  async function togglePublic() {
    if (!profile) return;
    setBusy(true);
    const r = await setProfilePublic(!profile.isPublic);
    setBusy(false);
    setNote(r.ok ? (r.isPublic ? "프로필을 공개했어요." : "프로필을 비공개로 바꿨어요.") : r.error);
    if (r.ok) router.refresh();
  }

  return (
    <>
      {profile && (
        <div className="mp-top-row" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <Link className="mp-addr" href={`/creators/${profile.handle}`} style={{ justifySelf: "start" }}>
            /creators/{profile.handle} ↗
          </Link>
          <button
            type="button"
            className={`mp-state ${profile.isPublic ? "on" : ""}`}
            onClick={togglePublic}
            disabled={busy}
            aria-label={profile.isPublic ? "공개 중. 누르면 비공개로 바뀝니다" : "비공개. 누르면 공개로 바뀝니다"}
            style={{ cursor: busy ? "default" : "pointer", font: "inherit", fontWeight: 700 }}
          >
            {profile.isPublic ? "공개 중" : "비공개"}
          </button>
          <span />
        </div>
      )}
      <div className="pl mp-pl">
        <PublishProfile
          key={profile ? `${profile.handle}-${profile.roles.join()}-${profile.bio}-${profile.channels.length}-${profile.openToCollab}-${profile.isPublic}` : "new"}
          mode={profile ? "edit" : "create"}
          context="mypage"
          submitLabel={profile ? undefined : "저장하고 포트폴리오 등록으로"}
          initial={profile ? { ...profile, about: profile.bio } : undefined}
          onSubmit={onSubmit}
          checkHandle={check}
          heroField={
            <HeroUpload
              hero={profile?.hero}
              hasProfile={Boolean(profile)}
              pending={pendingHero?.file ?? null}
              onPending={(f) => setPendingHero(f ? { file: f, kind: f.type === "video/mp4" ? "video" : "image" } : null)}
              onDone={(text, err) => setNote(err ? text : text)}
            />
          }
        />
      </div>
      {note && (
        <p role="status" className="mp-note">
          {note}
        </p>
      )}
      {savedPopup && (
        <div className="mp-modal-back" role="presentation">
          <div className="mp-modal" role="dialog" aria-modal="true" aria-labelledby="mp-saved-title">
            <p id="mp-saved-title" className="mp-modal-title">프로필을 저장했어요.</p>
            <button type="button" className="btn btn-primary mp-modal-btn" onClick={() => router.push("/portfolio/new")}>
              포트폴리오 등록하기
            </button>
            <p className="mp-modal-note">포트폴리오를 등록해야 크리에이터로 등록됩니다.</p>
            <button
              type="button"
              className="mp-modal-close"
              onClick={() => {
                setDismissed(true);
                router.replace("/portfolio/new?step=profile");
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── 포트폴리오 등록 ─────────────────────────────────────────────────────────────────
// 접은 목록(시안 02·07): 맨 윗줄 「＋ 새 포트폴리오 등록」이 접힌 등록 화면이고, 아래에 내 작품이 한 줄씩 있다.
// 줄마다 손잡이(순서 저장)·제목·대표·역할·장르·수정일·공개 스위치·수정·삭제. 「수정」과 새 등록 줄을 펼치면 그 아래에 편집 칸(WorkEditor)이 열린다.
const kstDate = (iso: string) => {
  const p = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}.${g("month")}.${g("day")}`;
};

export function PortfolioManager({ works, usedBytes, hasProfile, openWorkId = null, nickname = "", onOpenNew, onOpenEdit }: { works: MyWork[]; usedBytes: number; hasProfile: boolean; openWorkId?: string | null; nickname?: string; onOpenNew?: () => void; onOpenEdit?: (id: string) => void }) {
  const router = useRouter();
  // 기획안 화면의 「포트폴리오 작성하기」로 넘어오면(?work=) 그 작품의 편집 칸이 열려 있다.
  const [editing, setEditing] = useState<string | null>(openWorkId && works.some((w) => w.id === openWorkId) ? openWorkId : null);
  const [newOpen, setNewOpen] = useState(false);
  const [newKey, setNewKey] = useState(0);
  const [del, setDel] = useState<MyWork | null>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // 공개 스위치: 누르는 즉시 바뀌어 보이고(서버 응답을 기다리지 않는다), 저장 중에는 그 스위치만 잠근다. 서버가 실패하면 원래대로 되돌리고 그 작품 줄 아래에 오류를 보여 준다.
  const [pubOverride, setPubOverride] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const isPub = (w: MyWork) => pubOverride[w.id] ?? w.isPublic;

  async function togglePublic(w: MyWork) {
    if (savingId === w.id) return;
    const before = isPub(w);
    const next = !before;
    setRowErr((cur) => {
      const copy = { ...cur };
      delete copy[w.id];
      return copy;
    });
    setPubOverride((cur) => ({ ...cur, [w.id]: next }));
    setSavingId(w.id);
    setMsg(null);
    const r = await setWorkPublic(w.id, next);
    setSavingId(null);
    if (!r.ok) {
      setPubOverride((cur) => ({ ...cur, [w.id]: before }));
      return setRowErr((cur) => ({ ...cur, [w.id]: r.error }));
    }
    setMsg({ text: r.isPublic ? "작품을 포트폴리오에 올렸어요." : "작품을 포트폴리오에서 내렸어요." });
    router.refresh();
  }
  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    const r = await deleteWork(del.id);
    setBusy(false);
    if (!r.ok) {
      setDel(null);
      return setMsg({ text: r.error, err: true });
    }
    if (editing === del.id) setEditing(null);
    setDel(null);
    setMsg({ text: "작품을 지웠어요." });
    router.refresh();
  }
  // 손잡이 순서(공통 동작: components/ui/use-live-reorder.ts)
  const reorder = useLiveReorder(
    works.map((w) => w.id),
    async (ids) => {
      setMsg(null);
      const r = await reorderWorks(ids);
      if (!r.ok) {
        setMsg({ text: r.error, err: true });
        return false;
      }
      router.refresh();
      return true;
    },
  );
  const byId = new Map(works.map((w) => [w.id, w]));
  const list = reorder.order.map((id) => byId.get(id)).filter((w): w is MyWork => Boolean(w));

  return (
    <div className="pf" aria-busy={busy || undefined}>
      {!hasProfile && <p className="mp-note">작품을 포트폴리오에 올리려면 먼저 위의 「크리에이터 등록」에서 프로필을 만들어 주세요.</p>}
      {msg && (
        <p role={msg.err ? "alert" : "status"} className={`mp-msg ${msg.err ? "err" : "ok"}`}>
          {msg.text}
        </p>
      )}

      {/* 맨 윗줄이 접힌 등록 화면이다. 누르면 이 줄 아래로 등록 화면이 펼쳐진다. */}
      <button type="button" className="pf-new" aria-expanded={newOpen} onClick={() => (onOpenNew ? onOpenNew() : setNewOpen((v) => !v))} disabled={!newOpen && works.length >= WORK_LIMIT} title={works.length >= WORK_LIMIT ? `작품은 ${WORK_LIMIT}개까지 만들 수 있어요.` : undefined}>
        <span className="pf-new-main">
          <span className="pf-plus" aria-hidden="true">＋</span> 새 포트폴리오 등록
        </span>
        <span className="pf-new-fold">
          <span className="pf-long">등록 화면 {newOpen ? "접기 ▴" : "펼치기 ▾"}</span>
          <span className="pf-short">{newOpen ? "접기 ▴" : "펼치기 ▾"}</span>
        </span>
      </button>
      {newOpen && (
        <WorkEditor
          key={`new${newKey}`}
          work={null}
          nickname={nickname}
          onClose={() => {
            setNewOpen(false);
            setNewKey((k) => k + 1);
          }}
          onCreated={(id) => {
            setNewOpen(false);
            setNewKey((k) => k + 1);
            setEditing(id);
          }}
        />
      )}

      {works.length > 0 && (
        <div className="pf-head" aria-hidden="true">
          <span />
          <span>제목</span>
          <span>대표</span>
          <span>수정일</span>
          <span className="pf-head-end">관리</span>
        </div>
      )}

      <div className="pf-list" {...reorder.listProps}>
      {list.map((w) => (
        <div key={w.id} className={`pf-item${reorder.dragging === w.id ? " dragging" : ""}`} {...reorder.itemProps(w.id)}>
          <div className={`pf-row${isPub(w) ? "" : " off"}`}>
            <button type="button" className="pf-grip" aria-label={`${w.title} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`} {...reorder.gripProps(w.id)}>
              ⠿
            </button>
            <span className="pf-title">{w.title}</span>
            <span className="pf-meta">
              <span className="pf-rep">{representativeOf(w)}</span>
            </span>
            <span className="pf-date">{kstDate(w.updatedAt).slice(2)}</span>
            <span className="pf-sw-wrap">
              <button type="button" role="switch" aria-checked={isPub(w)} aria-label={`${w.title} 공개`} className="pf-sw" disabled={busy || savingId === w.id} onClick={() => void togglePublic(w)}>
                <i aria-hidden="true" />
                <span>{isPub(w) ? "공개" : "비공개"}</span>
              </button>
            </span>
            <span className="pf-actions">
              <button type="button" className="btn btn-ghost" aria-expanded={editing === w.id} onClick={() => (onOpenEdit ? onOpenEdit(w.id) : setEditing(editing === w.id ? null : w.id))}>
                수정
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDel(w)}>
                삭제
              </button>
            </span>
          </div>
          {rowErr[w.id] && (
            <AlertPopup key={rowErr[w.id]}>{rowErr[w.id]}</AlertPopup>
          )}
          {editing === w.id && <WorkEditor key={w.id} work={{ ...w, isPublic: isPub(w) }} nickname={nickname} onClose={() => setEditing(null)} onTogglePublic={() => void togglePublic(w)} busyOuter={busy} />}
        </div>
      ))}
      </div>

      <div className="pf-count pf-count-end">
        <span>
          작품 {works.length} / {WORK_LIMIT}
        </span>
        <span>
          파일 {mb(usedBytes)} / {mb(QUOTA_BYTES)}
        </span>
      </div>

      {del && (
        <div className="pf-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && setDel(null)}>
          <div className="pf-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pf-del-h" aria-describedby="pf-del-p" onKeyDown={(e) => e.key === "Escape" && !busy && setDel(null)}>
            <h3 id="pf-del-h">「{del.title}」을 삭제할까요?</h3>
            <p id="pf-del-p">삭제하면 되돌릴 수 없습니다.</p>
            <div className="pf-dialog-btns">
              <button type="button" className="btn btn-ghost pf-cancel" autoFocus disabled={busy} onClick={() => setDel(null)}>
                취소
              </button>
              <button type="button" className="btn pf-danger" disabled={busy} onClick={() => void confirmDelete()}>
                {busy ? "지우는 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SlotKind = "logline" | "text" | "image" | "video";
type Slot = { id: string; kind: SlotKind; text: string; url: string; file: File | null; sub: string };
let slotSeq = 0;
const newSlot = (kind: SlotKind): Slot => ({ id: `s${++slotSeq}`, kind, text: "", url: "", file: null, sub: "" });

// 요소 종류 칩(시안 01). 영상은 티저·예고편…, 글·문서는 시놉시스·트리트먼트…를 고른다. 다시 누르면 비운다. 고른 것은 요소의 sub_kind(0012)에 저장된다.
// 요소 종류 태그. 고른 태그만 요소별 색(외곽선·글자)이 보인다: 영상 소프트 틸, 문서 딥 슬레이트 블루, 이미지 뮤트 세이지(2026-11-13).
type SubTone = "video" | "doc" | "image";
const SUB_ITEMS: Record<SubTone, readonly string[]> = { video: VIDEO_SUBKINDS, doc: DOC_SUBKINDS, image: IMAGE_SUBKINDS };
const SUB_LABEL: Record<SubTone, string> = { video: "영상 종류", doc: "문서 종류", image: "이미지 종류" };
const toneOf = (kind: string): SubTone => (kind === "video" ? "video" : kind === "image" ? "image" : "doc");
function SubChips({ tone, value, onPick, disabled }: { tone: SubTone; value: string; onPick: (v: string) => void; disabled?: boolean }) {
  const items = SUB_ITEMS[tone];
  return (
    <div className={`we-pick we-sub tone-${tone}`} role="group" aria-label={SUB_LABEL[tone]}>
      {items.map((x) => (
        <button key={x} type="button" className="opt" aria-pressed={value === x} disabled={disabled} onClick={() => onPick(value === x ? "" : x)}>
          {x}
        </button>
      ))}
    </div>
  );
}

// 새로 만든 작품에 채운 칸을 순서대로 넣는다. 실패하면 이유 한 줄을 돌려준다(성공이면 null).
async function addSlots(workId: string, slots: Slot[]): Promise<{ error: string | null; order: string[] }> {
  // order: 만든 요소 번호를 슬롯 순서대로 담고, 로그라인 자리에는 글자 「logline」을 둔다(만든 요소만 센다. D35-2).
  const order: string[] = [];
  for (const sl of slots) {
    if (sl.kind === "logline") {
      order.push(LOGLINE_TOKEN);
    } else if (sl.kind === "text" && (sl.text.trim() || sl.file)) {
      if (sl.text.trim()) {
        const r = await addTextBlock(workId, sl.text, sl.sub || null);
        if (!r.ok) return { error: `문서를 넣지 못했어요. ${r.error}`, order };
        order.push(r.id);
      }
      if (sl.file) {
        if (kindOfMime(sl.file.type) !== "document") return { error: "PDF 파일만 올릴 수 있어요.", order };
        const slot = await prepareFileUpload(workId, { kind: "document", type: sl.file.type, size: sl.file.size });
        if (!slot.ok) return { error: slot.error, order };
        const up = await uploadToSlot(slot.path, slot.token, sl.file);
        if (!up.ok) return { error: up.error, order };
        const fin = await finishFileUpload(workId, { path: slot.path, kind: "document", name: sl.file.name, subKind: sl.sub || null });
        if (!fin.ok) return { error: fin.error, order };
        order.push(fin.id);
      }
    } else if (sl.kind === "video" && sl.url.trim() && sl.file) {
      return { error: "영상은 유튜브 주소와 파일 중 하나만 넣어 주세요.", order };
    } else if (sl.kind === "video" && sl.url.trim()) {
      const r = await addVideoBlock(workId, sl.url, sl.sub || null);
      if (!r.ok) return { error: `영상을 넣지 못했어요. ${r.error}`, order };
      order.push(r.id);
    } else if ((sl.kind === "image" || sl.kind === "video") && sl.file) {
      const kind = sl.kind === "image" ? "image" : sl.kind === "video" ? "video" : "document";
      if (kindOfMime(sl.file.type) !== kind) return { error: kind === "image" ? "JPG, PNG, WEBP 이미지만 올릴 수 있어요." : kind === "video" ? "MP4 파일만 올릴 수 있어요." : "PDF 파일만 올릴 수 있어요.", order };
      const slot = await prepareFileUpload(workId, { kind, type: sl.file.type, size: sl.file.size });
      if (!slot.ok) return { error: slot.error, order };
      const up = await uploadToSlot(slot.path, slot.token, sl.file);
      if (!up.ok) return { error: up.error, order };
      const fin = await finishFileUpload(workId, { path: slot.path, kind, name: sl.file.name, subKind: sl.sub || null });
      if (!fin.ok) return { error: fin.error, order };
      order.push(fin.id);
    }
  }
  return { error: null, order };
}

// 편집 칸이 바뀔 때마다 「포트폴리오 화면에 보일 카드」(독립 등록 화면 오른쪽)에 알려 주는 값. 대표는 작품 안 맨 위의 이미지·영상이고, 없으면 로그라인이다.
export type WorkPreview = { title: string; logline: string; genres: string[]; roles: Role[]; top: "video" | "image" | "doc" | "logline" };

export function WorkEditor({
  work,
  nickname,
  onClose,
  onCreated,
  onTogglePublic,
  busyOuter,
  onPreview,
  profileRoles,
  topNote,
}: {
  work: MyWork | null;
  nickname: string;
  profileRoles?: Role[]; // 작품의 역할은 프로필에서 가져온다(시안 01: 여기서 고르지 않음)
  topNote?: string; // 맨 윗줄에 보일 「내 포트폴리오 4 / 12 · 파일 12MB / 20MB」
  onClose: () => void;
  onCreated?: (id: string, allSaved: boolean) => void;
  onTogglePublic?: () => void;
  busyOuter?: boolean;
  onPreview?: (p: WorkPreview) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(work?.title ?? "");
  // 역할은 프로필 한 곳에만 둔다. 프로필 역할을 먼저 쓰고, 프로필 역할을 못 받은 화면에서만 작품에 남은 역할을 쓴다(2026-11-13).
  const [roles, setRoles] = useState<Role[]>(profileRoles ?? work?.roles ?? []);
  const [genres, setGenres] = useState<string[]>(work?.genres ?? []);
  const [kind] = useState(work?.kind ?? "");
  const [form] = useState<string>(work?.form ?? "");
  const [logline, setLogline] = useState(work?.logline ?? "");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPublic, setNewPublic] = useState(true);
  // 제목 없이 저장하면 가운데 팝업으로 알리고, 버튼을 누르면 제목 칸에 커서를 둔다.
  const [askTitle, setAskTitle] = useState(false);
  const [slotFold, setSlotFold] = useState<Record<string, boolean>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  // 새 작품: 승인 샘플처럼 글·이미지·영상·문서 칸이 처음부터 있고 순서를 바꾸거나 지울 수 있다. 「저장」을 누르면 작품을 만든 뒤 채운 칸을 이 순서대로 넣는다.
  const [slots, setSlots] = useState<Slot[]>(() => (work ? [] : (["logline", "text", "video", "image"] as SlotKind[]).map(newSlot)));
  // 새 작품의 칸은 화면에만 있으므로 손잡이 순서는 바로 화면 순서가 된다(저장은 「저장」을 누를 때).
  const slotReorder = useLiveReorder(
    slots.map((x) => x.id),
    (ids) => {
      setSlots((cur) => ids.map((id) => cur.find((x) => x.id === id)).filter((x): x is Slot => Boolean(x)));
      return true;
    },
  );
  const shownSlots = slotReorder.order.map((id) => slots.find((x) => x.id === id)).filter((x): x is Slot => Boolean(x));
  const moveSlotTo = (id: string, to: number) => setSlots((cur) => {
    const from = cur.findIndex((x) => x.id === id);
    if (from < 0 || to < 0 || to >= cur.length || from === to) return cur;
    const next = [...cur];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    return next;
  });
  const patchSlot = (id: string, patch: Partial<Slot>) => setSlots((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // 맨 위에 놓인 것이 이 작품의 대표다(D35-2). 글·문서가 맨 위면 「문서」로 본다.
  const topItem = work ? orderItems(work.blocks, work.loglinePosition)[0] : (slots[0]?.kind ?? "logline");
  const topKind: WorkPreview["top"] = (() => {
    if (typeof topItem === "string") return topItem === "image" || topItem === "video" ? topItem : topItem === "text" ? "doc" : "logline";
    return topItem.kind === "image" || topItem.kind === "video" ? topItem.kind : "doc";
  })();
  const genresKey = genres.join("|");
  const rolesKey = roles.join("|");
  useEffect(() => {
    onPreview?.({ title, logline, genres: genresKey ? genresKey.split("|") : [], roles: (rolesKey ? rolesKey.split("|") : []) as Role[], top: topKind });
    // onPreview는 부르는 쪽이 매번 새로 만들어도 다시 부르지 않게 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, logline, genresKey, rolesKey, topKind]);

  // 저장 전에 역할과 대표 콘텐츠가 맞는지 본다. 영상 제작·아트디렉터는 맨 위 이미지·영상이 카드에 보이고, 다른 역할은 로그라인이 카드에 보인다.
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  // 팝업에서 역할을 바꾼다. 태그를 1초 안에 다시 누르면 그 역할이 맨 앞(대표 역할)이 된다(프로필 등록 화면과 같은 방식).
  const lastPress = useRef<{ r: Role; t: number } | null>(null);
  function pressRole(r: Role, now: number) {
    const prev = lastPress.current;
    if (prev && prev.r === r && now - prev.t < 1000) {
      lastPress.current = null;
      setRoles((cur) => [r, ...cur.filter((x) => x !== r)]);
      return;
    }
    lastPress.current = { r, t: now };
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }
  // 팝업에 보여 줄 지금 대표 콘텐츠 이름: 종류 태그가 있으면 「포스터 이미지」, 없으면 「이미지」.
  const topLabel = (() => {
    const kindName = (k: string) => (k === "image" ? "이미지" : k === "video" ? "영상" : k === "logline" ? "로그라인" : "문서");
    if (typeof topItem === "string") {
      if (work) return kindName(topItem === LOGLINE_TOKEN ? "logline" : topItem);
      const sl = slots[0];
      return sl ? `${sl.kind !== "logline" && sl.sub ? `${sl.sub} ` : ""}${kindName(sl.kind)}` : "로그라인";
    }
    const sub = "sub" in topItem && topItem.sub ? `${topItem.sub} ` : "";
    return `${sub}${kindName(topItem.kind)}`;
  })();
  function askSave() {
    if (!title.trim()) return void save();
    const visual = roles.some((x) => x === "video" || x === "art_director");
    const mediaTop = topKind === "image" || topKind === "video";
    if (!visual && mediaTop) {
      return setConfirmMsg(`지금 대표 콘텐츠는 「${topLabel}」입니다.\n역할에 맞는 대표 콘텐츠가 아닙니다.\n그래도 등록하시겠어요?`);
    }
    if (visual && !mediaTop) {
      return setConfirmMsg(`지금 대표 콘텐츠는 「${topLabel}」입니다.\n역할에 맞는 대표 콘텐츠가 아닙니다.\n그래도 등록하시겠어요?`);
    }
    void save();
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    setErrs({});
    const input = { title, roles, genres, kind: kind || null, form: form || null, logline, planId: work?.planId ?? null };
    const r = work ? await updateWork(work.id, input) : await createWork(input);
    setBusy(false);
    if (!r.ok) {
      const fe = { ...(r.fieldErrors ?? {}) } as Record<string, string>;
      if (fe.title) {
        delete fe.title;
        setErrs(fe);
        setAskTitle(true);
        const rest = Object.values(fe);
        return rest.length ? setMsg({ text: rest[0], err: true }) : undefined;
      }
      setErrs(fe);
      return setMsg({ text: r.error, err: true });
    }
    if (!work) {
      // 채운 칸을 위에서부터 차례로 넣는다. 하나라도 안 되면 그 이유를 보여 주고, 만든 작품은 남아서 이어서 고칠 수 있다.
      const { error: failed, order } = await addSlots(r.id, slots);
      // 로그라인이 맨 위가 아니면 그 자리(앞에 있는 요소 개수)를 함께 저장한다.
      let moved: string | null = null;
      if (!failed && order[0] !== LOGLINE_TOKEN && order.includes(LOGLINE_TOKEN)) {
        const m = await reorderWorkItems(r.id, order);
        if (!m.ok) moved = m.error;
      }
      // 「공개 중」으로 두고 저장했으면 만든 작품을 올린다. 올리지 못하면 이유를 보여 주고 작품은 비공개로 남는다.
      let publishErr: string | null = null;
      if (newPublic) {
        const p = await setWorkPublic(r.id, true);
        if (!p.ok) publishErr = p.error;
      }
      router.refresh();
      onCreated?.(r.id, !publishErr && !failed && !moved);
      if (publishErr) return setMsg({ text: `작품은 저장했어요. 공개로 올리지는 못했어요. ${publishErr}`, err: true });
      if (failed) return setMsg({ text: `작품은 저장했어요. ${failed}`, err: true });
      if (moved) return setMsg({ text: `작품은 저장했어요. 로그라인 자리는 저장하지 못했어요. ${moved}`, err: true });
      return;
    }
    router.push("/creators");
  }

  async function removeWork() {
    if (!work) return onClose();
    if (!window.confirm(`「${work.title}」을 지울까요? 안에 올린 문서·이미지·영상도 함께 지워지고 되돌릴 수 없어요.`)) return;
    setBusy(true);
    const r = await deleteWork(work.id);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, err: true });
    router.refresh();
    onClose();
  }

  const disabled = busy || busyOuter;
  // 새 작품은 처음부터 「공개 중」. 저장할 때 이 값대로 올린다. 이미 있는 작품은 누르는 즉시 바뀐다.
  const shownPublic = work ? work.isPublic : newPublic;
  function togglePublicChip() {
    if (work) return onTogglePublic?.();
    setNewPublic((v) => !v);
  }
  return (
    <div className="mp-work we">
      <div className="we-top" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
        <span className="we-note">{topNote}</span>
        <button
          type="button"
          className={`mp-state ${shownPublic ? "on" : ""}`}
          onClick={togglePublicChip}
          disabled={disabled}
          aria-label={shownPublic ? "공개 중. 누르면 비공개로 바꿉니다" : "비공개. 누르면 공개로 바꿉니다"}
        >
          {shownPublic ? "공개 중" : "비공개"}
        </button>
        <span className="we-top-btns" style={{ justifySelf: "end" }}>
          {work && (
            <button type="button" className="btn btn-ghost we-close" onClick={onClose}>
              접기 ▴
            </button>
          )}
        </span>
      </div>

      <div className="we-head">
        {confirmMsg && (
          <ConfirmPopup
            confirmLabel="등록"
            cancelLabel="다시 작성"
            onCancel={() => setConfirmMsg(null)}
            onConfirm={async () => {
              setConfirmMsg(null);
              // 팝업에서 바꾼 역할(맨 앞이 대표)을 프로필에 저장한다. 그래야 프로필·탐색 카드와 맞는다.
              if (roles.join("|") !== (profileRoles ?? []).join("|")) {
                const pr = await setProfileRoles(roles);
                if (!pr.ok) return setMsg({ text: pr.error, err: true });
              }
              void save();
            }}
          >
            {confirmMsg}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 18 }}>
              {(Object.keys(ROLES) as Role[]).map((r) => {
                const on = roles.includes(r);
                const rc = ROLE_HEX[ROLE_TONE[r]];
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    onClick={(e) => pressRole(r, e.timeStamp)}
                    style={{ position: "relative", height: 34, padding: "0 15px", borderRadius: 999, border: `1.5px solid ${rc}`, background: on ? rc : "#fff", color: on ? "#fff" : rc, font: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    {roles[0] === r && (
                      <span style={{ position: "absolute", top: -13, left: -8, height: 18, padding: "0 7px", display: "grid", placeItems: "center", border: "2px solid #fff", borderRadius: 999, background: "#574a50", color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1, boxSizing: "content-box" }}>대표</span>
                    )}
                    {ROLES[r]}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#574a50" }}>태그를 &apos;빠르게 두 번&apos; 클릭해서 대표 역할을 골라주세요.</p>
          </ConfirmPopup>
        )}
        {askTitle &&
          createPortal(
            <div role="dialog" aria-modal="true" aria-labelledby="ask-title-text" style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(42,32,37,.45)" }}>
              <div style={{ width: "100%", maxWidth: 320, padding: "28px 24px 24px", borderRadius: 16, background: "#fff", textAlign: "center" }}>
                <p id="ask-title-text" style={{ margin: 0, fontSize: 15, fontWeight: 400, color: "#2a2025" }}>작품 제목을 입력해 주세요.</p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setAskTitle(false);
                    titleRef.current?.focus();
                  }}
                  style={{ marginTop: 20, height: 40, padding: "0 28px", border: 0, borderRadius: 999, background: "#a61e5c", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  확인
                </button>
              </div>
            </div>,
            document.body,
          )}
        <input ref={titleRef} className="we-title" type="text" placeholder="〈제목〉" aria-label="작품 제목" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} aria-invalid={errs.title ? true : undefined} />
        <p className="we-by">
          {nickname || "닉네임"}{work && work.isPublic ? ` · ${new Date(work.publishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}
        </p>
        {errs.roles && <AlertPopup key={errs.roles}>{errs.roles}</AlertPopup>}
        <div className="we-pick we-genre" role="group" aria-label="장르">
          {GENRES.map((g) => (
            <button key={g} type="button" className="opt" aria-pressed={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <p className="we-rep-note">
        <span className="we-rep-tag">대표</span>
        맨 위에 끌어다 놓은 것이 대표입니다. 포트폴리오 카드에 이것이 보입니다.
      </p>

      {work ? (
        <BlockList work={work} onMessage={setMsg} logline={logline} onLogline={setLogline} loglineErr={errs.logline} />
      ) : (
        <div className="we-body">
          <div {...slotReorder.listProps}>
          {shownSlots.map((sl, i) => (
            <div key={sl.id} className={slotReorder.dragging === sl.id ? "we-dragging" : undefined} {...slotReorder.itemProps(sl.id)}>
              <div className="we-gap">
                <button type="button" className="we-mini" aria-label="여기에 요소 넣기" onClick={() => setSlots((cur) => [...cur.slice(0, i), newSlot("text"), ...cur.slice(i)])}>
                  +
                </button>
              </div>
              <div className={`we-el${i === 0 ? " rep" : ""}`} tabIndex={0}>
                <button type="button" className="we-grip" aria-label={`${sl.kind === "logline" ? "로그라인" : "요소"} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`} {...slotReorder.gripProps(sl.id)}>
                  ⠿
                </button>
                <div className={`we-main${sl.kind !== "logline" ? " we-card" : ""}`}>
                  <button type="button" className="we-fold" aria-expanded={!slotFold[sl.id]} onClick={() => setSlotFold({ ...slotFold, [sl.id]: !slotFold[sl.id] })}>
                    {slotFold[sl.id] ? "▸ 펼치기" : "▾ 접기"}
                  </button>
                  <ElementName kind={sl.kind} />
                  {sl.kind === "logline" && !slotFold[sl.id] && (
                    <label className="we-logline-label">
                      <textarea className="we-text" aria-label="로그라인" rows={3} value={logline} onChange={(e) => setLogline(e.target.value)} placeholder={LOGLINE_FRAME} aria-invalid={errs.logline ? true : undefined} />
                      {errs.logline && <AlertPopup key={errs.logline}>{errs.logline}</AlertPopup>}
                    </label>
                  )}
                  {sl.kind !== "logline" && <SubChips tone={toneOf(sl.kind)} value={sl.sub} onPick={(v) => patchSlot(sl.id, { sub: v })} />}
                  {sl.kind === "text" && !slotFold[sl.id] && <DocFilePick file={sl.file} onFile={(f) => patchSlot(sl.id, { file: f })} />}
                  {sl.kind === "text" && !slotFold[sl.id] && <textarea className="we-text we-doc-text" rows={3} placeholder="〈직접 입력〉" aria-label="문서" value={sl.text} onChange={(e) => patchSlot(sl.id, { text: e.target.value })} />}
                  {sl.kind === "image" && !slotFold[sl.id] && <ImageSlotBox bare file={sl.file} onFile={(f) => patchSlot(sl.id, { file: f })} />}
                  {sl.kind === "video" && !slotFold[sl.id] && <input className="mp-input" type="url" aria-label="유튜브 주소" placeholder="영상 〈유튜브 주소〉 https://youtu.be/…" value={sl.url} onChange={(e) => patchSlot(sl.id, { url: e.target.value })} />}
                  {sl.kind === "video" && !slotFold[sl.id] && <VideoFilePick file={sl.file} onFile={(f) => patchSlot(sl.id, { file: f })} />}
                </div>
                <div className="we-tools">
                  <button type="button" className="we-mini" aria-label="위로" disabled={i === 0} onClick={() => moveSlotTo(sl.id, i - 1)}>↑</button>
                  <button type="button" className="we-mini" aria-label="아래로" disabled={i === slots.length - 1} onClick={() => moveSlotTo(sl.id, i + 1)}>↓</button>
                  {sl.kind !== "logline" && <button type="button" className="we-mini" aria-label="지우기" onClick={() => setSlots((cur) => cur.filter((x) => x.id !== sl.id))}>지우기</button>}
                </div>
              </div>
            </div>
          ))}
          </div>
          <div className="we-add">
            <span>추가</span>
            {([["text", "문서"], ["image", "이미지"], ["video", "영상"]] as [SlotKind, string][]).map(([k, l]) => (
              <button key={k} type="button" className={`btn btn-ghost we-add-${k}`} onClick={() => setSlots((cur) => [...cur, newSlot(k)])}>
                + {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <p role={msg.err ? "alert" : "status"} className={`mp-msg ${msg.err ? "err" : "ok"}`}>
          {msg.text}
        </p>
      )}
      <div className="we-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={disabled}>
          취소
        </button>
        {work && (
          <button type="button" className="btn btn-ghost we-del" onClick={removeWork} disabled={disabled}>
            삭제
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={askSave} disabled={disabled}>
          {busy ? "저장하는 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

// 작품 안 요소. 접기는 이 편집 화면을 정리하는 용도일 뿐이고, 저장한 요소는 접어도 남에게 보인다(D36 안 3).
// 등록 화면의 빈 칸(파일·글을 아직 넣지 않은 요소). 서버에는 없고 화면에만 있다. 넣으면 그 자리에 저장된다.
// at은 화면 전체 순서(로그라인·저장된 요소·빈 칸을 모두 센 자리)다.
type EmptyKind = "video" | "image" | "text";
type EmptySlot = { id: string; kind: EmptyKind; at: number; sub: string; text: string; url: string; fold: boolean };
let emptySeq = 0;
const LAST = Number.MAX_SAFE_INTEGER;
const newEmpty = (kind: EmptyKind, at: number, fold = false, sub = ""): EmptySlot => ({ id: `empty-${++emptySeq}`, kind, at, sub, text: "", url: "", fold });

function BlockList({ work, onMessage, logline, onLogline, loglineErr }: { work: MyWork; onMessage: (m: { text: string; err?: boolean } | null) => void; logline: string; onLogline: (v: string) => void; loglineErr?: string }) {
  const router = useRouter();
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [insertAt, setInsertAt] = useState<number | null>(null); // 요소 사이의 「+」를 누르면 다음에 추가하는 빈 칸이 그 자리에 들어간다
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  // 작품에 이미지 요소가 하나도 없을 때만 맨 끝에 접힌 빈 이미지 칸 하나를 둔다(지울 수 있다). 이미지가 이미 있으면 붙이지 않는다.
  const [empties, setEmpties] = useState<EmptySlot[]>(() => (work.blocks.length >= BLOCK_LIMIT || work.blocks.some((b) => b.kind === "image") ? [] : [newEmpty("image", LAST, true)]));
  const full = work.blocks.length + empties.length >= BLOCK_LIMIT;
  // 저장된 순서(로그라인 블록 포함, D35-2). 로그라인 자리는 글자 「logline」이다.
  // 손잡이로 바꾼 순서는 서버가 새 순서를 돌려줄 때까지 pending으로 화면에 그대로 둔다.
  const serverItems = orderItems(work.blocks, work.loglinePosition);
  const keyOfItem = (it: (typeof serverItems)[number]) => (it === LOGLINE_TOKEN ? LOGLINE_TOKEN : it.id);
  const serverKey = serverItems.map(keyOfItem).join("|");
  const [pendingState, setPendingState] = useState<{ base: string; ids: string[] } | null>(null);
  const pending = pendingState && pendingState.base === serverKey ? pendingState.ids : null;
  const setPending = (ids: string[] | null) => setPendingState(ids ? { base: serverKey, ids } : null);
  const items = pending ? pending.map((k) => serverItems.find((it) => keyOfItem(it) === k)).filter((it): it is (typeof serverItems)[number] => it !== undefined) : serverItems;
  const idsOf = () => items.map(keyOfItem);

  // 화면에 그릴 줄: 저장된 것 사이사이에 빈 칸을 at 자리에 끼운다.
  type Row = { type: "saved"; it: (typeof items)[number]; savedIndex: number } | { type: "empty"; e: EmptySlot };
  const baseRows: Row[] = items.map((it, k) => ({ type: "saved" as const, it, savedIndex: k }));
  [...empties].sort((a, b) => a.at - b.at).forEach((e) => baseRows.splice(Math.min(e.at, baseRows.length), 0, { type: "empty", e }));
  const rowKey = (r: Row) => (r.type === "empty" ? r.e.id : keyOfItem(r.it));

  // 저장된 요소와 빈 칸을 한 줄로 보고 순서를 바꾼다. 빈 칸은 화면 자리만 바꾸고, 저장된 요소의 순서가 바뀌었으면 서버에 저장한다.
  async function applyRowOrder(keys: string[]) {
    setEmpties((cur) => cur.map((x) => ({ ...x, at: keys.indexOf(x.id) })));
    const saved = keys.filter((k) => !empties.some((x) => x.id === k));
    if (saved.join("|") === idsOf().join("|")) return true;
    setPending(saved);
    onMessage(null);
    const r = await reorderWorkItems(work.id, saved);
    if (!r.ok) {
      setPending(null);
      onMessage({ text: r.error ?? "순서를 저장하지 못했어요.", err: true });
      return false;
    }
    router.refresh();
    return true;
  }
  const rowReorder = useLiveReorder(baseRows.map(rowKey), applyRowOrder);
  const rows: Row[] = rowReorder.order.map((k) => baseRows.find((r) => rowKey(r) === k)).filter((r): r is Row => r !== undefined);
  const moveRow = (ri: number, to: number) => {
    if (to < 0 || to >= rows.length || ri === to) return;
    const keys = rows.map(rowKey);
    const [k] = keys.splice(ri, 1);
    keys.splice(to, 0, k);
    void applyRowOrder(keys);
  };
  const savedBefore = (ri: number) => rows.slice(0, ri).filter((r) => r.type === "saved").length;
  const patchEmpty = (id: string, patch: Partial<EmptySlot>) => setEmpties((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const dropEmpty = (id: string) => setEmpties((cur) => cur.filter((x) => x.id !== id));
  const removeEmpty = (ri: number, id: string) => setEmpties((cur) => cur.filter((x) => x.id !== id).map((x) => (x.at !== LAST && x.at > ri ? { ...x, at: x.at - 1 } : x)));
  const addEmpty = (kind: EmptyKind) => {
    setEmpties((cur) => [...cur, newEmpty(kind, insertAt ?? LAST)]);
    setInsertAt(null);
  };

  async function run(fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, savedPos?: number) {
    setBusy(true);
    onMessage(null);
    const r = await fn();
    if (!r.ok) {
      setBusy(false);
      return onMessage({ text: r.error ?? "처리하지 못했어요.", err: true }), false;
    }
    // 빈 칸을 채워 새 요소가 생겼으면 그 빈 칸이 있던 자리로 옮긴다.
    if (savedPos !== undefined && r.id) {
      const ids = idsOf();
      ids.splice(Math.min(savedPos, ids.length), 0, r.id);
      await reorderWorkItems(work.id, ids);
    }
    setBusy(false);
    router.refresh();
    return true;
  }

  async function upload(file: File | undefined, kind: "image" | "document" | "video", slot: { ri: number; e?: EmptySlot }) {
    if (!file) return;
    const k = kindOfMime(file.type);
    if (k !== kind) return onMessage({ text: kind === "image" ? "JPG, PNG, WEBP 이미지만 올릴 수 있어요." : kind === "video" ? "MP4 파일만 올릴 수 있어요." : "PDF 파일만 올릴 수 있어요.", err: true });
    const ok = await run(async () => {
      const up = await prepareFileUpload(work.id, { kind, type: file.type, size: file.size });
      if (!up.ok) return up;
      const sent = await uploadToSlot(up.path, up.token, file);
      if (!sent.ok) return sent;
      return finishFileUpload(work.id, { path: up.path, kind, name: file.name, subKind: slot.e?.sub || null });
    }, savedBefore(slot.ri));
    if (ok && slot.e) dropEmpty(slot.e.id);
  }

  async function saveEmpty(ri: number, e: EmptySlot) {
    const ok = await run(() => (e.kind === "video" ? addVideoBlock(work.id, e.url, e.sub || null) : addTextBlock(work.id, e.text, e.sub || null)), savedBefore(ri));
    if (ok) dropEmpty(e.id);
  }

  // 저장된 요소의 「지우기」: 내용(파일·주소·글)만 지우고 같은 자리에 같은 종류의 빈 칸을 남긴다.
  async function clearSaved(ri: number, b: Exclude<(typeof items)[number], typeof LOGLINE_TOKEN>) {
    if (!window.confirm("이 요소의 내용을 지울까요? 빈 칸은 남고, 지운 내용은 되돌릴 수 없어요.")) return;
    const kind: EmptyKind = b.kind === "video" ? "video" : b.kind === "image" ? "image" : "text";
    const sub = "sub" in b && b.sub ? b.sub : "";
    const ok = await run(() => deleteBlock(b.id));
    if (ok) setEmpties((cur) => [...cur, newEmpty(kind, ri, false, sub)]);
  }

  const tools = (ri: number, up: () => void, down: () => void, del: () => void) => (
    <div className="we-tools">
      <button type="button" className="we-mini" aria-label="위로" disabled={ri === 0} onClick={up}>↑</button>
      <button type="button" className="we-mini" aria-label="아래로" disabled={ri === rows.length - 1} onClick={down}>↓</button>
      <button type="button" className="we-mini" aria-label="지우기" disabled={busy} onClick={del}>지우기</button>
    </div>
  );

  return (
    <div className="we-body">
      {/* 작품 안에서 맨 위에 놓인 것(로그라인이든 요소든)이 그 작품의 대표다. 순서는 끌거나 ↑↓로 바꾼다(D35-2). */}
      <div {...rowReorder.listProps}>
      {rows.map((row, ri) => {
        const gap = (
          <div className="we-gap">
            <button type="button" className="we-mini" aria-label="여기에 요소 넣기" aria-pressed={insertAt === ri} onClick={() => setInsertAt(insertAt === ri ? null : ri)}>
              +
            </button>
          </div>
        );
        if (row.type === "empty") {
          const e = row.e;
          return (
            <div key={e.id} className={rowReorder.dragging === e.id ? "we-dragging" : undefined} {...rowReorder.itemProps(e.id)}>
              {gap}
              <div className="we-el" tabIndex={0}>
                <button type="button" className="we-grip" aria-label="요소 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)" {...rowReorder.gripProps(e.id)}>
                  ⠿
                </button>
                <div className="we-main we-card">
                  {(
                    <>
                      <button type="button" className="we-fold" aria-expanded={!e.fold} onClick={() => patchEmpty(e.id, { fold: !e.fold })}>
                        {e.fold ? "▸ 펼치기" : "▾ 접기"}
                      </button>
                      <ElementName kind={e.kind} />
                      <SubChips tone={toneOf(e.kind)} value={e.sub} disabled={busy} onPick={(v) => patchEmpty(e.id, { sub: v })} />
                      {!e.fold && e.kind === "image" && <ImageSlotBox bare file={null} onFile={(f) => { if (f) void upload(f, "image", { ri, e }); }} />}
                      {!e.fold && e.kind === "video" && (
                        <>
                          <input className="mp-input" type="url" aria-label="유튜브 주소" placeholder="영상 〈유튜브 주소〉 https://youtu.be/…" value={e.url} onChange={(ev) => patchEmpty(e.id, { url: ev.target.value })} />
                          {e.url.trim() && (
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void saveEmpty(ri, e)}>
                              주소 저장
                            </button>
                          )}
                          <VideoFilePick disabled={busy} onFile={(f) => { if (f) void upload(f, "video", { ri, e }); }} />
                        </>
                      )}
                      {!e.fold && e.kind === "text" && (
                        <>
                          <DocFilePick file={null} disabled={busy} onFile={(f) => { if (f) void upload(f, "document", { ri, e }); }} />
                          <textarea className="we-text we-doc-text" rows={3} placeholder="〈직접 입력〉" aria-label="문서" value={e.text} onChange={(ev) => patchEmpty(e.id, { text: ev.target.value })} />
                          {e.text.trim() && (
                            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void saveEmpty(ri, e)}>
                              문서 저장
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
                {tools(ri, () => moveRow(ri, ri - 1), () => moveRow(ri, ri + 1), () => removeEmpty(ri, e.id))}
              </div>
            </div>
          );
        }
        const it = row.it;
        const itemId = keyOfItem(it);
        const b = it === LOGLINE_TOKEN ? null : it;
        return (
        <div key={itemId} className={rowReorder.dragging === itemId ? "we-dragging" : undefined} {...rowReorder.itemProps(itemId)}>
        {gap}
        <div className={`we-el${savedBefore(ri) === 0 ? " rep" : ""}`} tabIndex={0}>
          <button type="button" className="we-grip" aria-label={`${b ? "요소" : "로그라인"} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`} {...rowReorder.gripProps(itemId)}>
            ⠿
          </button>
          <div className={`we-main${b ? " we-card" : ""}`}>
            {!b && (
              <button type="button" className="we-fold" aria-expanded={!folded.logline} onClick={() => setFolded({ ...folded, logline: !folded.logline })}>
                {folded.logline ? "▸ 펼치기" : "▾ 접기"}
              </button>
            )}
            {!b && <ElementName kind="logline" />}
            {!b && !folded.logline && (
              <label className="we-logline-label">
                <textarea className="we-text" aria-label="로그라인" rows={3} value={logline} onChange={(e) => onLogline(e.target.value)} placeholder={LOGLINE_FRAME} aria-invalid={loglineErr ? true : undefined} />
                {loglineErr && <AlertPopup key={loglineErr}>{loglineErr}</AlertPopup>}
              </label>
            )}
            {b && (
              <button type="button" className="we-fold" aria-expanded={!folded[b.id]} onClick={() => setFolded({ ...folded, [b.id]: !folded[b.id] })}>
                {folded[b.id] ? "▸ 펼치기" : "▾ 접기"}
              </button>
            )}
            {b && <ElementName kind={b.kind === "document" ? "text" : b.kind} />}
            {b && <SubChips tone={toneOf(b.kind)} value={("sub" in b && b.sub) || ""} disabled={busy} onPick={(v) => void run(() => setBlockSubKind(b.id, v || null))} />}
            {b && b.kind === "text" && !folded[b.id] && (
              <>
                <DocFilePick file={null} disabled={busy} onFile={(f) => { if (f) void upload(f, "document", { ri: ri + 1 }); }} />
                <textarea className="we-text we-doc-text" rows={3} placeholder="〈직접 입력〉" aria-label="문서" value={edits[b.id] ?? b.body} onChange={(e) => setEdits({ ...edits, [b.id]: e.target.value })} />
                {edits[b.id] !== undefined && edits[b.id] !== b.body && (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => { if (await run(() => updateTextBlock(b.id, edits[b.id]))) setEdits((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== b.id))); }}>
                    문서 저장
                  </button>
                )}
              </>
            )}
            {b && b.kind === "image" && !folded[b.id] && (
              <>
                <div className="we-line">{b.fileName ?? "첨부된 이미지"}{b.fileBytes ? ` · ${mb(b.fileBytes)}` : ""}</div>
                {/* 카드에 보일 때: 꽉 채우기(가장자리가 조금 잘릴 수 있음) / 여백 두기(자르지 않고 남는 곳을 카드 배경색으로) */}
                <div className="we-fit" role="group" aria-label="카드에 보일 때">
                  <span>카드에 보일 때</span>
                  {([["cover", "꽉 채우기"], ["contain", "여백 두기"]] as const).map(([v, l]) => (
                    <button key={v} type="button" className="opt" aria-pressed={(b.fit ?? "contain") === v} disabled={busy} onClick={() => void run(() => setBlockFit(b.id, v))}>
                      {l}
                    </button>
                  ))}
                </div>
                {b.src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.src} alt={b.fileName ?? "이미지"} style={{ maxWidth: "100%", borderRadius: 14 }} />
                )}
              </>
            )}
            {b && b.kind === "video" && !folded[b.id] && (b.youtubeId ? (
              <div className="we-media" style={{ overflow: "hidden" }}>
                <iframe src={`https://www.youtube-nocookie.com/embed/${b.youtubeId}`} title="영상" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }} />
              </div>
            ) : b.src ? (
              <div className="we-media" style={{ overflow: "hidden", background: "#000" }}>
                <video src={b.src} controls playsInline preload="metadata" style={{ width: "100%", height: "100%" }} />
              </div>
            ) : (
              <div className="we-line">{b.fileName ?? "첨부된 영상"}{b.fileBytes ? ` · ${mb(b.fileBytes)}` : ""}</div>
            ))}
            {b && b.kind === "document" && !folded[b.id] && (
              <div className="we-line">
                {b.src ? <a href={b.src} target="_blank" rel="noopener noreferrer">{b.fileName ?? "문서"} 열기 ↗</a> : <span>{b.fileName ?? "첨부된 문서"}</span>}
                {b.fileBytes ? ` · ${mb(b.fileBytes)}` : ""}
              </div>
            )}
          </div>
          {b ? (
            tools(ri, () => moveRow(ri, ri - 1), () => moveRow(ri, ri + 1), () => void clearSaved(ri, b))
          ) : (
            <div className="we-tools">
              <button type="button" className="we-mini" aria-label="위로" disabled={ri === 0} onClick={() => moveRow(ri, ri - 1)}>↑</button>
              <button type="button" className="we-mini" aria-label="아래로" disabled={ri === rows.length - 1} onClick={() => moveRow(ri, ri + 1)}>↓</button>
            </div>
          )}
        </div>
        </div>
        );
      })}
      </div>

      <div className="we-add">
        <span>추가</span>
        <button type="button" className="btn btn-ghost we-add-text" disabled={busy || full} onClick={() => addEmpty("text")}>+ 문서</button>
        <button type="button" className="btn btn-ghost we-add-image" disabled={busy || full} onClick={() => addEmpty("image")}>+ 이미지</button>
        <button type="button" className="btn btn-ghost we-add-video" disabled={busy || full} onClick={() => addEmpty("video")}>+ 영상</button>
      </div>
    </div>
  );
}
