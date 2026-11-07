"use client";

// 마이페이지의 「크리에이터 등록」과 「포트폴리오 등록」 실제 화면. 샘플(mypage-preview, work-editor)과 같은 모양이고 진짜로 저장한다.
// 모든 저장은 app/actions/creators.ts의 Server Action이 하고(서버가 로그인·이메일 확인·글자 수를 다시 검사한다), 끝나면 서버에서 다시 읽는다(router.refresh).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  addTextBlock,
  addVideoBlock,
  checkHandle as checkHandleAction,
  createWork,
  deleteBlock,
  deleteWork,
  finishFileUpload,
  moveBlock,
  prepareFileUpload,
  reorderBlocks,
  saveCreatorProfile,
  setProfilePublic,
  setWorkPublic,
  updateTextBlock,
  updateWork,
} from "@/app/actions/creators";
import { GENRES } from "@/components/creators/genres";
import { PublishProfile, type HandleCheck, type SaveResult } from "@/components/planner/publish-profile";
import { ROLES, type Role } from "@/lib/collab";
import { BLOCK_LIMIT, QUOTA_BYTES, TITLE_MAX, WORK_LIMIT, type ProfileErrors, type ProfileValues } from "@/lib/creator-rules";
import { kindOfMime, uploadToSlot } from "@/lib/creator-upload-client";
import type { MyBlock, MyProfile, MyWork } from "@/lib/creators-mine";

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

// ── 크리에이터 등록 ─────────────────────────────────────────────────────────────────
export function CreatorProfileForm({ profile }: { profile: MyProfile | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(handle: string): Promise<HandleCheck> {
    const r = await checkHandleAction(handle);
    return r.ok ? (r.available ? "available" : "taken") : "error";
  }
  async function onSubmit(v: ProfileValues): Promise<SaveResult> {
    setNote("");
    const r = await saveCreatorProfile({ handle: v.handle, roles: v.roles, about: v.about, channels: v.channels, openToCollab: v.openToCollab, isPublic: v.isPublic });
    if (!r.ok) return { ok: false, errors: r.fieldErrors as ProfileErrors | undefined, error: r.error };
    setNote(r.created ? "프로필을 만들었어요." : "프로필을 저장했어요.");
    router.refresh();
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
        <div className="mp-top-row" style={{ marginBottom: 12 }}>
          <Link className="mp-addr" href={`/creators/${profile.handle}`}>
            /creators/{profile.handle} ↗
          </Link>
          <span className={`mp-state ${profile.isPublic ? "on" : ""}`}>{profile.isPublic ? "공개 중" : "비공개"}</span>
          <button type="button" className="btn btn-ghost" onClick={togglePublic} disabled={busy}>
            {profile.isPublic ? "비공개로 바꾸기" : "공개하기"}
          </button>
        </div>
      )}
      <div className="pl mp-pl">
        <PublishProfile
          key={profile ? `${profile.handle}-${profile.roles.join()}-${profile.bio}-${profile.channels.length}-${profile.openToCollab}-${profile.isPublic}` : "new"}
          mode={profile ? "edit" : "create"}
          context="mypage"
          initial={profile ? { ...profile, about: profile.bio } : undefined}
          onSubmit={onSubmit}
          checkHandle={check}
        />
      </div>
      {note && (
        <p role="status" className="mp-note">
          {note}
        </p>
      )}
    </>
  );
}

// ── 포트폴리오 등록 ─────────────────────────────────────────────────────────────────
export function PortfolioManager({ works, usedBytes, hasProfile, openWorkId = null, plans, nickname = "" }: { works: MyWork[]; usedBytes: number; hasProfile: boolean; openWorkId?: string | null; plans?: ReactNode; nickname?: string }) {
  // 편집 칸은 한 번에 하나만 펼쳐서 화면이 끝없이 길어지지 않게 한다. 처음에는 기획안에서 넘어온 작품(없으면 맨 위 작품)이 펼쳐져 있고, 나머지는 카드로 접혀 있다.
  const [openWork, setOpenWork] = useState<string | null>(openWorkId && works.some((w) => w.id === openWorkId) ? openWorkId : (works[0]?.id ?? null));
  // 작품이 하나도 없으면 「포트폴리오 등록」답게 새 작품 편집 칸이 바로 열려 있다(목록이 아니라 등록 화면).
  const [adding, setAdding] = useState(false);
  const [newClosed, setNewClosed] = useState(false);
  const showNew = adding || (works.length === 0 && !newClosed);
  const openId = showNew ? "new" : openWork;
  const setOpenId = (id: string | null) => {
    setAdding(id === "new");
    if (id === "new") setNewClosed(false);
    else {
      setOpenWork(id);
      setNewClosed(true);
    }
  };
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function togglePublic(w: MyWork) {
    setBusy(true);
    setMsg(null);
    const r = await setWorkPublic(w.id, !w.isPublic);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, err: true });
    setMsg({ text: r.isPublic ? "작품을 포트폴리오에 올렸어요." : "작품을 포트폴리오에서 내렸어요." });
    router.refresh();
  }

  return (
    <>
      <div className="mp-top-row">
        <div className="mp-count">
          <span>
            작품 {works.length} / {WORK_LIMIT}
          </span>
          <span>
            파일 {mb(usedBytes)} / {mb(QUOTA_BYTES)}
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpenId("new")} disabled={works.length >= WORK_LIMIT || showNew}>
          작품 추가
        </button>
      </div>
      {plans !== undefined && (
        <div className="mp-plans">
          <h3>내 기획안</h3>
          {plans}
        </div>
      )}
      {!hasProfile && <p className="mp-note">작품을 포트폴리오에 올리려면 먼저 위의 「크리에이터 등록」에서 프로필을 만들어 주세요.</p>}
      {msg && (
        <p role={msg.err ? "alert" : "status"} className={`mp-msg ${msg.err ? "err" : "ok"}`}>
          {msg.text}
        </p>
      )}

      <div className="mp-works">
        {showNew && <WorkEditor key="new" work={null} nickname={nickname} onClose={() => setOpenId(null)} onCreated={(id) => setOpenId(id)} />}
        {works.map((w) =>
          openId === w.id ? (
            <WorkEditor key={w.id} work={w} nickname={nickname} onClose={() => setOpenId(null)} onTogglePublic={() => togglePublic(w)} busyOuter={busy} />
          ) : (
            <div className="mp-work" key={w.id}>
              <WorkThumb />
              <div className="mp-work-main">
                <p className="mp-work-title">{w.title}</p>
                <div className="mp-work-meta">
                  {w.roles.map((r) => (
                    <span key={r} className="mp-tag">
                      {ROLES[r]}
                    </span>
                  ))}
                  <span>{w.isPublic ? "공개 중" : "공개하지 않음"}</span>
                </div>
                {w.genres.length > 0 && (
                  <div className="mp-genres">
                    {w.genres.map((g) => (
                      <span key={g} className="mp-tag genre">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mp-work-btns">
                <button type="button" className="btn btn-ghost" onClick={() => togglePublic(w)} disabled={busy}>
                  {w.isPublic ? "포트폴리오에서 내리기" : "포트폴리오에 올리기"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpenId(w.id)}>
                  펼쳐서 꾸미기 ▾
                </button>
              </div>
            </div>
          ),
        )}
      </div>
          </>
  );
}

// 접은 작품 카드의 대표 이미지 자리: 승인받은 샘플 그대로 「대표 이미지」 회색 칸만 둔다(실제 이미지는 이 화면에 걸지 않는다).
function WorkThumb() {
  return <div className="mp-thumb">대표 이미지</div>;
}

function WorkEditor({
  work,
  nickname,
  onClose,
  onCreated,
  onTogglePublic,
  busyOuter,
}: {
  work: MyWork | null;
  nickname: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
  onTogglePublic?: () => void;
  busyOuter?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(work?.title ?? "");
  const [roles, setRoles] = useState<Role[]>(work?.roles ?? []);
  const [genres, setGenres] = useState<string[]>(work?.genres ?? []);
  const [kind] = useState(work?.kind ?? "");
  const [form] = useState<string>(work?.form ?? "");
  const [logline, setLogline] = useState(work?.logline ?? "");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickRoles, setPickRoles] = useState((work?.roles.length ?? 0) === 0);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setBusy(true);
    setMsg(null);
    setErrs({});
    const input = { title, roles, genres, kind: kind || null, form: form || null, logline, planId: work?.planId ?? null };
    const r = work ? await updateWork(work.id, input) : await createWork(input);
    setBusy(false);
    if (!r.ok) {
      setErrs(r.fieldErrors ?? {});
      return setMsg({ text: r.error, err: true });
    }
    setMsg({ text: "저장했어요." });
    router.refresh();
    if (!work) onCreated?.(r.id);
  }

  async function removeWork() {
    if (!work) return onClose();
    if (!window.confirm(`「${work.title}」을 지울까요? 안에 올린 글·이미지·문서도 함께 지워지고 되돌릴 수 없어요.`)) return;
    setBusy(true);
    const r = await deleteWork(work.id);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, err: true });
    router.refresh();
    onClose();
  }

  const disabled = busy || busyOuter;
  return (
    <div className="mp-work we">
      <div className="we-top">
        <span className="we-state">{work ? (work.isPublic ? "공개 중" : "공개하지 않음") : "새 작품"}</span>
        {work && onTogglePublic && (
          <button type="button" className="btn btn-ghost" onClick={onTogglePublic} disabled={disabled}>
            {work.isPublic ? "포트폴리오에서 내리기" : "포트폴리오에 올리기"}
          </button>
        )}
        <button type="button" className="btn btn-ghost we-close" onClick={onClose}>
          접기 ▴
        </button>
      </div>

      <div className="we-head">
        <input className="we-title" type="text" placeholder="〈작품 제목〉" aria-label="작품 제목" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} aria-invalid={errs.title ? true : undefined} />
        {errs.title && <p className="mp-msg err" role="alert">{errs.title}</p>}
        <p className="we-by">
          {nickname || "닉네임"}
          {work && ` · ${new Date(work.publishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`}
        </p>
        <div className="we-tags">
          {roles.map((r) => (
            <span key={r} className="mp-tag">
              {ROLES[r]}
            </span>
          ))}
          <button type="button" className="we-mini" aria-expanded={pickRoles} aria-label="역할 고르기" onClick={() => setPickRoles(!pickRoles)}>
            +
          </button>
        </div>
        {pickRoles && (
          <div className="we-pick" role="group" aria-label="역할">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <button key={r} type="button" className="opt" aria-pressed={roles.includes(r)} onClick={() => setRoles(toggle(roles, r))}>
                {ROLES[r]}
              </button>
            ))}
          </div>
        )}
        {errs.roles && <p className="mp-msg err" role="alert">{errs.roles}</p>}
        <div className="we-pick" role="group" aria-label="장르">
          {GENRES.map((g) => (
            <button key={g} type="button" className="opt" aria-pressed={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="we-logline">
        <label>
          <span className="we-label">로그라인 (이미지, 영상 담당 크리에이터는 컨셉 등 기획을 소개해주세요)</span>
          <textarea className="we-text" rows={3} value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다." />
        </label>
        {errs.logline && <p className="mp-msg err" role="alert">{errs.logline}</p>}
      </div>

      {work ? <BlockList work={work} onMessage={setMsg} /> : <p className="mp-note">작품을 저장하면 글·이미지·영상·문서를 넣을 수 있어요.</p>}

      {msg && (
        <p role={msg.err ? "alert" : "status"} className={`mp-msg ${msg.err ? "err" : "ok"}`}>
          {msg.text}
        </p>
      )}
      <div className="we-foot">
        {work && (
          <Link className="btn btn-ghost" href={`/portfolio/${work.id}`} target="_blank" rel="noopener noreferrer">
            미리 보기
          </Link>
        )}
        <button type="button" className="btn btn-primary" onClick={save} disabled={disabled}>
          {busy ? "저장하는 중…" : "저장"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={disabled}>
          취소
        </button>
        {work && (
          <button type="button" className="btn btn-ghost we-del" onClick={removeWork} disabled={disabled}>
            작품 지우기
          </button>
        )}
      </div>
    </div>
  );
}

// 작품 안 요소. 접기는 이 편집 화면을 정리하는 용도일 뿐이고, 저장한 요소는 접어도 남에게 보인다(D36 안 3).
function BlockList({ work, onMessage }: { work: MyWork; onMessage: (m: { text: string; err?: boolean } | null) => void }) {
  const router = useRouter();
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<null | "text" | "video">(null);
  const [insertAt, setInsertAt] = useState<number | null>(null); // 요소 사이의 「+」를 누르면 새 요소가 그 자리에 들어간다
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const imgInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const full = work.blocks.length >= BLOCK_LIMIT;

  async function run(fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, okText?: string) {
    setBusy(true);
    onMessage(null);
    const r = await fn();
    if (!r.ok) {
      setBusy(false);
      return onMessage({ text: r.error ?? "처리하지 못했어요.", err: true }), false;
    }
    // 새 요소가 생겼고 「여기에 넣기」로 자리를 골랐다면 그 자리로 옮긴다.
    if (insertAt !== null && r.id) {
      const ids = work.blocks.map((b: MyBlock) => b.id);
      ids.splice(Math.min(insertAt, ids.length), 0, r.id);
      await reorderBlocks(work.id, ids);
      setInsertAt(null);
    }
    setBusy(false);
    if (okText) onMessage({ text: okText });
    router.refresh();
    return true;
  }

  async function add() {
    const ok = await run(() => (adding === "text" ? addTextBlock(work.id, draft) : addVideoBlock(work.id, draft)));
    if (ok) {
      setDraft("");
      setAdding(null);
    }
  }

  async function upload(file: File | undefined, kind: "image" | "document") {
    if (!file) return;
    const k = kindOfMime(file.type);
    if (k !== kind) return onMessage({ text: kind === "image" ? "JPG, PNG, WEBP 이미지만 올릴 수 있어요." : "PDF 파일만 올릴 수 있어요.", err: true });
    await run(async () => {
      const slot = await prepareFileUpload(work.id, { kind, type: file.type, size: file.size });
      if (!slot.ok) return slot;
      const up = await uploadToSlot(slot.path, slot.token, file);
      if (!up.ok) return up;
      return finishFileUpload(work.id, { path: slot.path, kind, name: file.name });
    }, "올렸어요.");
  }

  return (
    <div className="we-body">
      {/* 작품 안에서 맨 위에 있는 이미지·영상이 그 작품의 대표다(순서는 ↑↓로 바꾼다). */}
      {work.blocks.map((b: MyBlock, i) => (
        <div key={b.id}>
        <div className="we-gap">
          <button type="button" className="we-mini" aria-label="여기에 요소 넣기" aria-pressed={insertAt === i} onClick={() => setInsertAt(insertAt === i ? null : i)}>
            +
          </button>
        </div>
        <div className="we-el" tabIndex={0}>
          <span className="we-grip" aria-hidden="true">⠿</span>
          <div className="we-main">
            {b.id === work.blocks.find((x: MyBlock) => x.kind === "image" || x.kind === "video")?.id && <span className="we-cover">대표</span>}
            {b.kind !== "text" && (
              <button type="button" className="we-fold" aria-expanded={!folded[b.id]} onClick={() => setFolded({ ...folded, [b.id]: !folded[b.id] })}>
                {folded[b.id] ? "▸ 펼치기" : "▾ 접기"}
              </button>
            )}
            {b.kind === "text" && (
              <>
                <textarea className="we-text" rows={3} aria-label="글" value={edits[b.id] ?? b.body} onChange={(e) => setEdits({ ...edits, [b.id]: e.target.value })} />
                {edits[b.id] !== undefined && edits[b.id] !== b.body && (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => { if (await run(() => updateTextBlock(b.id, edits[b.id]), "글을 저장했어요.")) setEdits((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== b.id))); }}>
                    글 저장
                  </button>
                )}
              </>
            )}
            {b.kind === "image" && (folded[b.id] ? <span className="we-line">이미지 {b.fileName ?? ""}</span> : b.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.src} alt={b.fileName ?? "이미지"} style={{ maxWidth: "100%", borderRadius: 14 }} />
            ) : <div className="we-media">이미지를 불러오지 못했어요</div>)}
            {b.kind === "video" && (folded[b.id] ? <span className="we-line">영상 · youtube.com</span> : (
              <div className="we-media" style={{ overflow: "hidden" }}>
                <iframe src={`https://www.youtube-nocookie.com/embed/${b.youtubeId}`} title="영상" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }} />
              </div>
            ))}
            {b.kind === "document" && (folded[b.id] ? <span className="we-line">문서(PDF) {b.fileName ?? ""} · {b.fileBytes ? mb(b.fileBytes) : ""}</span> : (
              <div className="we-line">
                {b.src ? <a href={b.src} target="_blank" rel="noopener noreferrer">{b.fileName ?? "문서(PDF)"} 열기 ↗</a> : "문서를 불러오지 못했어요"}
                {b.fileBytes ? ` · ${mb(b.fileBytes)}` : ""}
              </div>
            ))}
          </div>
          <div className="we-tools">
            <button type="button" className="we-mini" aria-label="위로" disabled={busy || i === 0} onClick={() => run(() => moveBlock(b.id, "up"))}>↑</button>
            <button type="button" className="we-mini" aria-label="아래로" disabled={busy || i === work.blocks.length - 1} onClick={() => run(() => moveBlock(b.id, "down"))}>↓</button>
            <button type="button" className="we-mini" aria-label="지우기" disabled={busy} onClick={() => { if (window.confirm("이 요소를 지울까요? 되돌릴 수 없어요.")) void run(() => deleteBlock(b.id)); }}>지우기</button>
          </div>
        </div>
        </div>
      ))}

      {adding && (
        <div className="we-el">
          <div className="we-main">
            {adding === "text" ? (
              <textarea className="we-text" rows={3} aria-label="새 글" placeholder="글을 입력해 주세요" value={draft} onChange={(e) => setDraft(e.target.value)} />
            ) : (
              <input className="mp-input" type="url" aria-label="유튜브 주소" placeholder="https://youtu.be/…" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: "1 1 100%" }} />
            )}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={add}>추가</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setAdding(null); setDraft(""); }}>취소</button>
          </div>
        </div>
      )}

      <div className="we-add">
        <span>추가</span>
        <button type="button" className="btn btn-ghost" disabled={busy || full} onClick={() => { setAdding("text"); setDraft(""); }}>+ 글</button>
        <button type="button" className="btn btn-ghost" disabled={busy || full} onClick={() => imgInput.current?.click()}>+ 이미지</button>
        <button type="button" className="btn btn-ghost" disabled={busy || full} onClick={() => { setAdding("video"); setDraft(""); }}>+ 영상</button>
        <button type="button" className="btn btn-ghost" disabled={busy || full} onClick={() => docInput.current?.click()}>+ 문서</button>
        <input ref={imgInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload(e.target.files?.[0], "image"); e.target.value = ""; }} />
        <input ref={docInput} type="file" accept="application/pdf" hidden onChange={(e) => { void upload(e.target.files?.[0], "document"); e.target.value = ""; }} />
      </div>
    </div>
  );
}
