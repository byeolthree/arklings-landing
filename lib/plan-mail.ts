// 기획안 PDF 메일 문구. 받는 사람은 로그인한 본인의 확인된 이메일뿐이다.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function planPdfMail(title: string) {
  return {
    subject: `[아클링스] 「${title}」 기획안 PDF를 보내드려요`,
    text: [
      `요청하신 기획안 「${title}」을 PDF 파일로 첨부했어요.`,
      "",
      "이 메일은 아클링스에서 직접 요청하신 내용을 보내드린 것이라 회신하지 않으셔도 돼요.",
      "메일이 보이지 않으면 스팸함도 확인해 주세요.",
    ].join("\n"),
    html: `<div style="font-family:'Noto Sans KR',-apple-system,sans-serif;color:#574a50;line-height:1.7;font-size:14px">
<p>요청하신 기획안 <b style="color:#2a2025">「${esc(title)}」</b>을 PDF 파일로 첨부했어요.</p>
<p style="font-size:12px">이 메일은 아클링스에서 직접 요청하신 내용을 보내드린 것이라 회신하지 않으셔도 돼요.<br/>메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
</div>`,
  };
}
