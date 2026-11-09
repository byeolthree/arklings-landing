"use client";

// 마이페이지의 「크리에이터 등록」과 「포트폴리오 등록」 실제 화면. 샘플(mypage-preview, work-editor)과 같은 모양이고 진짜로 저장한다.
// 모든 저장은 app/actions/creators.ts의 Server Action이 하고(서버가 로그인·이메일 확인·글자 수를 다시 검사한다), 끝나면 서버에서 다시 읽는다(router.refresh).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  reorderWorks,
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
import { representativeOf } from "@/lib/creator-cards";
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
// 접은 목록(시안 02·07): 맨 윗줄 「＋ 새 포트폴리오 등록」이 접힌 등록 화면이고, 아래에 내 작품이 한 줄씩 있다.
// 줄마다 손잡이(순서 저장)·제목·대표·역할·장르·수정일·공개 스위치·수정·삭제. 「수정」과 새 등록 줄을 펼치면 그 아래에 편집 칸(WorkEditor)이 열린다.
const kstDate = (iso: string) => {
  const p = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}.${g("month")}.${g("day")}`;
};

export function PortfolioManager({ works, usedBytes, hasProfile, openWorkId = null, nickname = "" }: { works: MyWork[]; usedBytes: number; hasProfile: boolean; openWorkId?: string | null; nickname?: string }) {
  const router = useRouter();
  // 기획안 화면의 「포트폴리오 작성하기」로 넘어오면(?work=) 그 작품의 편집 칸이 열려 있다.
  const [editing, setEditing] = useState<string | null>(openWorkId && works.some((w) => w.id === openWorkId) ? openWorkId : null);
  const [newOpen, setNewOpen] = useState(false);
  const [newKey, setNewKey] = useState(0);
  const [del, setDel] = useState<MyWork | null>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<string | null>(null);

  async function togglePublic(w: MyWork) {
    setBusy(true);
    setMsg(null);
    const r = await setWorkPublic(w.id, !w.isPublic);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, err: true });
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
  async function moveTo(id: string, to: number) {
    const ids = works.map((w) => w.id);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    setBusy(true);
    setMsg(null);
    const r = await reorderWorks(ids);
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.error, err: true });
    router.refresh();
  }

  return (
    <div className="pf" aria-busy={busy || undefined}>
      <div className="pf-count">
        <span>
          작품 {works.length} / {WORK_LIMIT}
        </span>
        <span>
          파일 {mb(usedBytes)} / {mb(QUOTA_BYTES)}
        </span>
      </div>
      {!hasProfile && <p className="mp-note">작품을 포트폴리오에 올리려면 먼저 위의 「크리에이터 등록」에서 프로필을 만들어 주세요.</p>}
      {msg && (
        <p role={msg.err ? "alert" : "status"} className={`mp-msg ${msg.err ? "err" : "ok"}`}>
          {msg.text}
        </p>
      )}

      <div className="pf-head" aria-hidden="true">
        <span />
        <span>제목</span>
        <span>대표</span>
        <span>역할</span>
        <span>장르</span>
        <span>수정일</span>
        <span className="pf-head-end">관리</span>
      </div>

      {/* 맨 윗줄이 접힌 등록 화면이다. 누르면 이 줄 아래로 등록 화면이 펼쳐진다. */}
      <button type="button" className="pf-new" aria-expanded={newOpen} onClick={() => setNewOpen((v) => !v)} disabled={!newOpen && works.length >= WORK_LIMIT} title={works.length >= WORK_LIMIT ? `작품은 ${WORK_LIMIT}개까지 만들 수 있어요.` : undefined}>
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

      {works.map((w, i) => (
        <div
          key={w.id}
          className="pf-item"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (drag.current) void moveTo(drag.current, i);
            drag.current = null;
          }}
        >
          <div className={`pf-row${w.isPublic ? "" : " off"}`}>
            <button
              type="button"
              className="pf-grip"
              draggable
              aria-label={`${w.title} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`}
              onDragStart={(e) => {
                drag.current = w.id;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", w.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  void moveTo(w.id, e.key === "ArrowUp" ? i - 1 : i + 1);
                }
              }}
            >
              ⠿
            </button>
            <span className="pf-title">{w.title}</span>
            <span className="pf-meta">
              <span className="pf-rep">{representativeOf(w)}</span>
              <span className="pf-roles">{w.roles.map((x) => ROLES[x]).join(" · ")}</span>
              <span className="pf-genres">
                {w.genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </span>
            </span>
            <span className="pf-date">{kstDate(w.updatedAt)}</span>
            <span className="pf-sw-wrap">
              <button type="button" role="switch" aria-checked={w.isPublic} aria-label={`${w.title} 공개`} className="pf-sw" disabled={busy} onClick={() => void togglePublic(w)}>
                <i aria-hidden="true" />
                <span>{w.isPublic ? "공개" : "비공개"}</span>
              </button>
            </span>
            <span className="pf-actions">
              <button type="button" className="btn btn-ghost" aria-expanded={editing === w.id} onClick={() => setEditing(editing === w.id ? null : w.id)}>
                수정
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setDel(w)}>
                삭제
              </button>
            </span>
          </div>
          {editing === w.id && <WorkEditor key={w.id} work={w} nickname={nickname} onClose={() => setEditing(null)} onTogglePublic={() => void togglePublic(w)} busyOuter={busy} />}
        </div>
      ))}

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

type SlotKind = "text" | "image" | "video" | "doc";
type Slot = { id: string; kind: SlotKind; text: string; url: string; file: File | null };
let slotSeq = 0;
const newSlot = (kind: SlotKind): Slot => ({ id: `s${++slotSeq}`, kind, text: "", url: "", file: null });

// 새로 만든 작품에 채운 칸을 순서대로 넣는다. 실패하면 이유 한 줄을 돌려준다(성공이면 null).
async function addSlots(workId: string, slots: Slot[]): Promise<string | null> {
  for (const sl of slots) {
    if (sl.kind === "text" && sl.text.trim()) {
      const r = await addTextBlock(workId, sl.text);
      if (!r.ok) return `글을 넣지 못했어요. ${r.error}`;
    } else if (sl.kind === "video" && sl.url.trim()) {
      const r = await addVideoBlock(workId, sl.url);
      if (!r.ok) return `영상을 넣지 못했어요. ${r.error}`;
    } else if ((sl.kind === "image" || sl.kind === "doc") && sl.file) {
      const kind = sl.kind === "image" ? "image" : "document";
      if (kindOfMime(sl.file.type) !== kind) return kind === "image" ? "JPG, PNG, WEBP 이미지만 올릴 수 있어요." : "PDF 파일만 올릴 수 있어요.";
      const slot = await prepareFileUpload(workId, { kind, type: sl.file.type, size: sl.file.size });
      if (!slot.ok) return slot.error;
      const up = await uploadToSlot(slot.path, slot.token, sl.file);
      if (!up.ok) return up.error;
      const fin = await finishFileUpload(workId, { path: slot.path, kind, name: sl.file.name });
      if (!fin.ok) return fin.error;
    }
  }
  return null;
}

// 편집 칸이 바뀔 때마다 「포트폴리오 화면에 보일 카드」(독립 등록 화면 오른쪽)에 알려 주는 값. 대표는 작품 안 맨 위의 이미지·영상이고, 없으면 로그라인이다.
export type WorkPreview = { title: string; logline: string; genres: string[]; roles: Role[]; top: "video" | "image" | "logline" };

export function WorkEditor({
  work,
  nickname,
  onClose,
  onCreated,
  onTogglePublic,
  busyOuter,
  onPreview,
}: {
  work: MyWork | null;
  nickname: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
  onTogglePublic?: () => void;
  busyOuter?: boolean;
  onPreview?: (p: WorkPreview) => void;
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
  // 새 작품: 승인 샘플처럼 글·이미지·영상·문서 칸이 처음부터 있고 순서를 바꾸거나 지울 수 있다. 「저장」을 누르면 작품을 만든 뒤 채운 칸을 이 순서대로 넣는다.
  const [slots, setSlots] = useState<Slot[]>(() => (work ? [] : (["text", "image", "video", "doc"] as SlotKind[]).map(newSlot)));
  const moveSlot = (i: number, d: -1 | 1) => setSlots((cur) => {
    const next = [...cur];
    const j = i + d;
    if (j < 0 || j >= next.length) return cur;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const patchSlot = (id: string, patch: Partial<Slot>) => setSlots((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const topKind: WorkPreview["top"] = work
    ? ((work.blocks.find((b) => b.kind === "image" || b.kind === "video")?.kind as "image" | "video" | undefined) ?? "logline")
    : ((slots.find((x) => x.kind === "image" || x.kind === "video")?.kind as "image" | "video" | undefined) ?? "logline");
  const genresKey = genres.join("|");
  const rolesKey = roles.join("|");
  useEffect(() => {
    onPreview?.({ title, logline, genres: genresKey ? genresKey.split("|") : [], roles: (rolesKey ? rolesKey.split("|") : []) as Role[], top: topKind });
    // onPreview는 부르는 쪽이 매번 새로 만들어도 다시 부르지 않게 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, logline, genresKey, rolesKey, topKind]);

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
    if (!work) {
      // 채운 칸을 위에서부터 차례로 넣는다. 하나라도 안 되면 그 이유를 보여 주고, 만든 작품은 남아서 이어서 고칠 수 있다.
      const failed = await addSlots(r.id, slots);
      router.refresh();
      onCreated?.(r.id);
      if (failed) return setMsg({ text: `작품은 저장했어요. ${failed}`, err: true });
      return setMsg({ text: "저장했어요." });
    }
    setMsg({ text: "저장했어요." });
    router.refresh();
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
        {work && (
          <button type="button" className="btn btn-ghost we-close" onClick={onClose}>
            접기 ▴
          </button>
        )}
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

      {work ? (
        <BlockList work={work} onMessage={setMsg} />
      ) : (
        <div className="we-body">
          {slots.map((sl, i) => (
            <div key={sl.id}>
              <div className="we-gap">
                <button type="button" className="we-mini" aria-label="여기에 요소 넣기" onClick={() => setSlots((cur) => [...cur.slice(0, i), newSlot("text"), ...cur.slice(i)])}>
                  +
                </button>
              </div>
              <div className="we-el" tabIndex={0}>
                <span className="we-grip" aria-hidden="true">⠿</span>
                <div className="we-main">
                  {sl.kind === "text" && <textarea className="we-text" rows={3} placeholder="〈글〉" aria-label="글" value={sl.text} onChange={(e) => patchSlot(sl.id, { text: e.target.value })} />}
                  {sl.kind === "image" && (
                    <label className="we-line">
                      이미지 (JPG·PNG·WEBP){" "}
                      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="이미지 파일" onChange={(e) => patchSlot(sl.id, { file: e.target.files?.[0] ?? null })} />
                    </label>
                  )}
                  {sl.kind === "video" && <input className="mp-input" type="url" aria-label="유튜브 주소" placeholder="영상 〈유튜브 주소〉 https://youtu.be/…" value={sl.url} onChange={(e) => patchSlot(sl.id, { url: e.target.value })} style={{ flex: "1 1 100%" }} />}
                  {sl.kind === "doc" && (
                    <label className="we-line">
                      문서 (PDF){" "}
                      <input type="file" accept="application/pdf" aria-label="문서 파일" onChange={(e) => patchSlot(sl.id, { file: e.target.files?.[0] ?? null })} />
                    </label>
                  )}
                </div>
                <div className="we-tools">
                  <button type="button" className="we-mini" aria-label="위로" disabled={i === 0} onClick={() => moveSlot(i, -1)}>↑</button>
                  <button type="button" className="we-mini" aria-label="아래로" disabled={i === slots.length - 1} onClick={() => moveSlot(i, 1)}>↓</button>
                  <button type="button" className="we-mini" aria-label="지우기" onClick={() => setSlots((cur) => cur.filter((x) => x.id !== sl.id))}>지우기</button>
                </div>
              </div>
            </div>
          ))}
          <div className="we-add">
            <span>추가</span>
            {([["text", "글"], ["image", "이미지"], ["video", "영상"], ["doc", "문서"]] as [SlotKind, string][]).map(([k, l]) => (
              <button key={k} type="button" className="btn btn-ghost" onClick={() => setSlots((cur) => [...cur, newSlot(k)])}>
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
