"use client";

import { useRef, useState } from "react";
import { GENRES } from "@/components/creators/genres";

// 샘플 미리보기용: 포트폴리오 등록 화면(시안 01-C). 왼쪽은 등록 카드, 오른쪽은 포트폴리오 화면에 보일 카드.
// 요소(영상·로그라인·문서·이미지)는 끌어서(또는 ↑↓로) 순서를 바꾸고, 맨 위에 둔 요소가 대표가 되어 오른쪽 카드에 바로 반영된다. 저장·올리기·파일 올리기는 서버에 없어서 이 화면 안에서만 움직인다.
type Kind = "video" | "logline" | "doc" | "image";
type El = { id: string; kind: Kind; sub: string; folded: boolean };

const SUBS: Record<"video" | "doc", string[]> = {
  video: ["티저", "예고편", "선공개", "파일럿", "피치 영상"],
  doc: ["시놉시스", "트리트먼트", "아웃라인", "시리즈 바이블", "파일럿", "피치 문서"],
};
const FRAME = "어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.";
const LOGLINE_LABEL = "로그라인 (이미지, 영상 담당 크리에이터는 컨셉 등 기획을 소개해주세요)";
const KIND_NAME: Record<Kind, string> = { video: "영상", logline: "로그라인", doc: "문서", image: "이미지" };
const ADD: { kind: Exclude<Kind, "logline">; label: string }[] = [
  { kind: "doc", label: "문서" },
  { kind: "image", label: "이미지" },
  { kind: "video", label: "영상" },
];

let seq = 10;
const make = (kind: Kind): El => ({ id: `e${seq++}`, kind, sub: kind === "video" ? SUBS.video[0] : kind === "doc" ? SUBS.doc[0] : "", folded: false });

function Chips({ items, value, onPick, label }: { items: string[]; value: string; onPick: (v: string) => void; label: string }) {
  return (
    <div className="rg-chips" role="group" aria-label={label}>
      {items.map((x) => (
        <button key={x} type="button" className="rg-chip" aria-pressed={value === x} onClick={() => onPick(x)}>
          {x}
        </button>
      ))}
    </div>
  );
}

function PreviewCard({ title, kind, logline, genres }: { title: string; kind: Kind; logline: string; genres: string[] }) {
  return (
    <div className="rg-pcard">
      <p className="rg-pcard-title">{title || "〈제목〉"}</p>
      {kind === "logline" ? <p className="rg-pcard-log">{logline || FRAME}</p> : <div className="rg-pcard-media">{KIND_NAME[kind]}</div>}
      <div className="rg-pcard-tags">
        <span className="rg-role">대본</span>
        <ul>
          {genres.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PortfolioEditor({ nickname = "별뜨리" }: { nickname?: string }) {
  const [els, setEls] = useState<El[]>(() => [make("video"), make("logline"), make("doc"), make("image")]);
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [genres, setGenres] = useState<string[]>(["드라마", "스릴러"]);
  const [pub, setPub] = useState(false);
  const [open, setOpen] = useState(true);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const drag = useRef<string | null>(null);

  const move = (id: string, to: number) =>
    setEls((cur) => {
      const from = cur.findIndex((e) => e.id === id);
      if (from < 0 || to < 0 || to >= cur.length || from === to) return cur;
      const next = [...cur];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  const patch = (id: string, p: Partial<El>) => setEls((cur) => cur.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const insert = (at: number, kind: Kind) => {
    setEls((cur) => [...cur.slice(0, at), make(kind), ...cur.slice(at)]);
    setInsertAt(null);
  };
  const top = els[0].kind;
  const otherKind: Kind = top === "logline" ? "video" : "logline";
  const cards: { kind: Kind; heading: string; current: boolean }[] =
    top === "logline"
      ? [
          { kind: "video", heading: "맨 위가 영상일 때", current: false },
          { kind: "logline", heading: "맨 위가 로그라인일 때", current: true },
        ]
      : [
          { kind: top, heading: `맨 위가 ${KIND_NAME[top]}일 때`, current: true },
          { kind: otherKind, heading: "맨 위가 로그라인일 때", current: false },
        ];

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText("첨부한 영상을 웹사이트 작품에 거는 영상으로 변환해 줘. (MP4 H.264, AAC, 16:9 1280×720, 15~30초, 10MB 이하)");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rg-grid">
      <section className="rg-card" aria-label="포트폴리오 등록">
        <div className="rg-bar">
          <span className="rg-state">{pub ? "공개 중" : "공개하지 않음"}</span>
          <span className="rg-count">내 포트폴리오 4 / 12 · 파일 12MB / 20MB</span>
          <div className="rg-bar-btns">
            <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              접기 {open ? "▴" : "▾"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setPub((v) => !v)}>
              {pub ? "포트폴리오에서 내리기" : "포트폴리오에 올리기"}
            </button>
          </div>
        </div>

        <div hidden={!open}>
          <input className="rg-title-in" type="text" placeholder="〈제목〉" aria-label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className="rg-by">
            {nickname} · {pub ? "게시됨" : "게시 전"}
          </p>
          <div className="rg-chips rg-genres" role="group" aria-label="장르">
            {GENRES.map((g) => (
              <button key={g} type="button" className="rg-chip" aria-pressed={genres.includes(g)} onClick={() => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}>
                {g}
              </button>
            ))}
          </div>

          <p className="rg-rep-note">
            <span className="rg-rep-tag">대표</span>
            맨 위에 끌어다 놓은 것이 대표입니다. 포트폴리오 카드에 이것이 보입니다.
          </p>

          <div className="rg-list">
            {els.map((e, i) => (
              <div key={e.id}>
                {i > 0 && (
                  <div className="rg-gap">
                    <button type="button" className="rg-plus" aria-label="여기에 요소 넣기" aria-expanded={insertAt === i} onClick={() => setInsertAt(insertAt === i ? null : i)}>
                      +
                    </button>
                    {insertAt === i && (
                      <span className="rg-gap-menu" role="group" aria-label="넣을 요소">
                        {ADD.map((a) => (
                          <button key={a.kind} type="button" className="btn btn-ghost" onClick={() => insert(i, a.kind)}>
                            + {a.label}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`rg-el${i === 0 ? " rep" : ""}`}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    if (drag.current) move(drag.current, i);
                    drag.current = null;
                  }}
                >
                  <button
                    type="button"
                    className="rg-grip"
                    draggable
                    aria-label={`${KIND_NAME[e.kind]} 순서 바꾸기(끌어서 옮기거나 위아래 화살표 키)`}
                    onDragStart={(ev) => {
                      drag.current = e.id;
                      ev.dataTransfer.effectAllowed = "move";
                      ev.dataTransfer.setData("text/plain", e.id);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
                        ev.preventDefault();
                        move(e.id, ev.key === "ArrowUp" ? i - 1 : i + 1);
                      }
                    }}
                  >
                    ⠿
                  </button>
                  <div className="rg-body">
                    {e.kind === "video" && (
                      <div className="rg-inner">
                        <Chips items={SUBS.video} value={e.sub} onPick={(v) => patch(e.id, { sub: v })} label="영상 종류" />
                        <input className="rg-input" type="text" placeholder="영상 〈유튜브 주소〉 https://youtu.be/…" aria-label="영상 유튜브 주소" />
                        <p className="rg-hint">유튜브 주소로 넣으면 용량 제한 없이 올릴 수 있어요.</p>
                        <div className="rg-drop">
                          <p>영상 파일 첨부 · MP4(H.264) · 10MB 이하 · 가로 1280×720(16:9) · 15~30초 · 소리는 AAC</p>
                          <div className="rg-drop-btns">
                            <button type="button" className="btn btn-ghost" onClick={copyPrompt}>
                              영상 변환 프롬프트 복사
                            </button>
                            <button type="button" className="btn btn-ghost">
                              파일 고르기
                            </button>
                            <span role="status" aria-live="polite" className="rg-hint">
                              {copied ? "복사했어요. 영상 변환 도구에 붙여 넣으세요." : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {e.kind === "logline" && (
                      <div className="rg-log">
                        <label>
                          <span className="rg-log-label">{LOGLINE_LABEL}</span>
                          <textarea className="rg-text" rows={3} placeholder={FRAME} value={logline} onChange={(ev) => setLogline(ev.target.value)} />
                        </label>
                      </div>
                    )}
                    {e.kind === "doc" && (
                      <div className="rg-inner">
                        <Chips items={SUBS.doc} value={e.sub} onPick={(v) => patch(e.id, { sub: v })} label="문서 종류" />
                        <textarea className="rg-text" rows={3} placeholder="〈문서〉" aria-label="문서 글" />
                        <div className="rg-drop rg-drop-row">
                          <span>외부 문서 첨부 (PDF · 10MB 이하)</span>
                          <button type="button" className="btn btn-ghost">
                            파일 고르기
                          </button>
                        </div>
                      </div>
                    )}
                    {e.kind === "image" && (
                      <div className="rg-img">
                        <button type="button" className="rg-fold" aria-expanded={!e.folded} onClick={() => patch(e.id, { folded: !e.folded })}>
                          {e.folded ? "▸ 펼치기" : "▾ 접기"} · 이미지 (JPG · PNG · WEBP, 5MB 이하)
                        </button>
                        {!e.folded && <div className="rg-img-box">이미지</div>}
                      </div>
                    )}
                  </div>
                  <div className="rg-tools">
                    <button type="button" className="rg-mini" aria-label="위로" disabled={i === 0} onClick={() => move(e.id, i - 1)}>
                      ↑
                    </button>
                    <button type="button" className="rg-mini" aria-label="아래로" disabled={i === els.length - 1} onClick={() => move(e.id, i + 1)}>
                      ↓
                    </button>
                    {e.kind !== "logline" && (
                      <button type="button" className="rg-mini" aria-label="지우기" onClick={() => setEls((cur) => cur.filter((x) => x.id !== e.id))}>
                        지우기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rg-add">
            <span>추가</span>
            {ADD.map((a) => (
              <button key={a.kind} type="button" className="btn btn-ghost" onClick={() => insert(els.length, a.kind)}>
                + {a.label}
              </button>
            ))}
          </div>

          <div className="rg-foot">
            <button type="button" className="btn btn-ghost">
              미리 보기
            </button>
            <button type="button" className="btn btn-ghost">
              취소
            </button>
            <button type="button" className="btn btn-ghost">
              삭제
            </button>
            <button type="button" className="btn btn-primary">
              저장
            </button>
          </div>
        </div>
      </section>

      <aside className="rg-side" aria-label="포트폴리오 화면에 보일 카드">
        <h2 className="rg-side-h">포트폴리오 화면에 보일 카드</h2>
        {cards.map((c) => (
          <div key={c.heading}>
            <p className="rg-side-sub">
              {c.heading}
              {c.current && " (지금 왼쪽 모습)"}
            </p>
            <PreviewCard title={title} kind={c.kind} logline={logline} genres={genres} />
          </div>
        ))}
        <p className="rg-side-note">역할은 프로필에서 가져옵니다(여기서 고르지 않음). 왼쪽 맨 위 요소를 끌어 바꾸면 이 카드가 바로 바뀝니다.</p>
      </aside>
    </div>
  );
}
