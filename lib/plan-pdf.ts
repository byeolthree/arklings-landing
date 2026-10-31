import path from "node:path";
import PDFDocument from "pdfkit";
import { loglineText, SLOT_LABELS, type PlanDraft } from "@/lib/plans";
import { formatKst } from "@/lib/time";

// 서버가 한글 글꼴(Noto Sans KR, assets/fonts)로 PDF를 만든다. 파일은 메모리에서만 만들고 서버에 저장하지 않는다.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const COLOR_TITLE = "#2a2025";
const COLOR_BODY = "#574a50";
const COLOR_JAJU = "#a61e5c";

export function pdfFileName(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  return `${safe || "기획안"}.pdf`;
}

export async function buildPlanPdf(draft: PlanDraft & { title: string }): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 64, bottom: 64, left: 64, right: 64 },
    info: { Title: draft.title, Author: "아클링스", Creator: "아클링스" },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("reg", path.join(FONT_DIR, "NotoSansKR-Regular.otf"));
  doc.registerFont("bold", path.join(FONT_DIR, "NotoSansKR-Bold.otf"));

  doc.font("bold").fontSize(11).fillColor(COLOR_JAJU).text("Arklings 기획안", { lineGap: 4 });
  doc.moveDown(0.4);
  doc.font("bold").fontSize(22).fillColor(COLOR_TITLE).text(draft.title, { lineGap: 6 });
  doc.moveDown(0.3);
  doc.font("reg").fontSize(10).fillColor(COLOR_BODY).text(`만든 날 ${formatKst(new Date().toISOString())}`, { lineGap: 4 });
  doc.moveDown(1.2);

  doc.font("bold").fontSize(14).fillColor(COLOR_TITLE).text("로그라인", { lineGap: 4 });
  doc.moveDown(0.3);
  doc.font("reg").fontSize(11.5).fillColor(COLOR_TITLE).text(loglineText(draft), { lineGap: 7, align: "left" });
  doc.moveDown(1.4);

  const answers = SLOT_LABELS.map((label, k) => ({ label, text: draft.slots[k].trim() })).filter((a) => a.text);
  if (answers.length > 0) {
    doc.font("bold").fontSize(14).fillColor(COLOR_TITLE).text("쓴 내용", { lineGap: 4 });
    doc.moveDown(0.3);
    for (const a of answers) {
      doc.font("bold").fontSize(10.5).fillColor(COLOR_JAJU).text(a.label, { lineGap: 3 });
      doc.font("reg").fontSize(11).fillColor(COLOR_TITLE).text(a.text, { lineGap: 6 });
      doc.moveDown(0.6);
    }
  }

  doc.end();
  return done;
}
