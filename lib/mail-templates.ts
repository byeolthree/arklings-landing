const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const wrap = (body: string) =>
  `<div style="font-family:'Noto Sans KR',Arial,sans-serif;color:#574a50;line-height:1.7;max-width:520px">${body}<p style="margin:24px 0 0;color:#8c8c8c;font-size:12px">아클링스 · 이 메일은 발신 전용입니다. 스팸함으로 들어가면 「스팸 아님」으로 표시해 주세요.</p></div>`;

// 새 협업 신청이 왔다는 안내(받는 사람에게). 신청자의 연락처·내용은 메일에 싣지 않고, 로그인해서 보도록 링크만 준다.
export function newRequestNotice(origin: string) {
  const link = `${origin}/collab`;
  return {
    subject: "[아클링스] 새 협업 신청이 도착했어요",
    text: `새 협업 신청이 도착했어요.\n로그인한 뒤 「받은 협업 신청」에서 확인해 주세요.\n\n${link}\n`,
    html: wrap(
      `<h2 style="margin:0 0 12px;color:#2a2025;font-size:18px">새 협업 신청이 도착했어요</h2><p style="margin:0 0 16px">로그인한 뒤 「받은 협업 신청」에서 내용을 확인해 주세요.</p><p style="margin:0"><a href="${esc(link)}" style="display:inline-block;background:#a61e5c;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">받은 협업 신청 보기</a></p>`,
    ),
  };
}

// 신청 접수 확인(신청자에게). 신청 내용은 싣지 않는다.
export function applicantReceipt(applicantName: string) {
  const name = applicantName.trim().slice(0, 30);
  return {
    subject: "[아클링스] 협업 신청이 접수됐어요",
    text: `${name}님, 협업 신청이 접수됐어요.\n검토 후 남겨 주신 연락처로 안내드릴게요.\n`,
    html: wrap(
      `<h2 style="margin:0 0 12px;color:#2a2025;font-size:18px">협업 신청이 접수됐어요</h2><p style="margin:0">${esc(name)}님, 신청해 주셔서 고마워요.<br />검토 후 남겨 주신 연락처로 안내드릴게요.</p>`,
    ),
  };
}
