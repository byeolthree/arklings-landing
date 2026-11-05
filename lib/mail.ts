import nodemailer from "nodemailer";

// 메일 보내기. 보내는 주소·계정·비밀번호는 모두 환경 변수에서 읽는다(코드에 직접 쓰지 않는다).
// 나중에 도메인을 사서 다른 발송 서비스로 옮길 때도 이 환경 변수 값만 바꾸면 된다.
//   MAIL_SMTP_HOST, MAIL_SMTP_PORT, MAIL_SMTP_USER, MAIL_SMTP_PASS, MAIL_FROM
export type MailResult = { ok: true } | { ok: false; reason: "not_configured" | "send_failed" };

const FROM_NAME = "아클링스";

function readConfig() {
  const host = process.env.MAIL_SMTP_HOST;
  const port = Number(process.env.MAIL_SMTP_PORT);
  const user = process.env.MAIL_SMTP_USER;
  const pass = process.env.MAIL_SMTP_PASS;
  const from = process.env.MAIL_FROM;
  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

export function isMailConfigured(): boolean {
  return readConfig() !== null;
}

export type MailAttachment = { filename: string; content: Buffer; contentType: string };

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}): Promise<MailResult> {
  const c = readConfig();
  if (!c) {
    console.warn("[mail] 메일 설정(MAIL_*)이 없어 메일을 보내지 않았습니다.");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465, // 465는 처음부터 암호화 연결, 그 밖의 포트(587 등)는 연결 뒤 암호화로 올린다
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    await transport.sendMail({
      from: { name: FROM_NAME, address: c.from },
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    return { ok: true };
  } catch (e) {
    // 비밀번호와 받는 사람 주소는 로그에 남기지 않는다.
    const err = e as { code?: string; responseCode?: number; command?: string; response?: string };
    const code = err?.code ?? err?.responseCode ?? "unknown";
    // 원인을 찾을 수 있게 메일 서버가 돌려준 응답 문구(예: "535 5.7.1 …")와 실패한 단계를 함께 남긴다. 이메일 주소는 가리고 길이를 줄인다.
    const reply = String(err?.response ?? "").replace(/[^\s@<>]+@[^\s@<>]+/g, "***").replace(/\s+/g, " ").slice(0, 160);
    console.error(`[mail] 발송 실패 (${String(code)}) 단계=${err?.command ?? "?"} 응답코드=${err?.responseCode ?? "?"} 응답=${reply || "없음"}`);
    return { ok: false, reason: "send_failed" };
  }
}
