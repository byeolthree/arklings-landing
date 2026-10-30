import { applicantReceipt, newRequestNotice } from "@/lib/mail-templates";
import { sendMail } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 받는 사람의 이메일. 아클링스 앞 신청은 환경 변수(ADMIN_NOTIFY_EMAIL), 회원 앞 신청은 그 회원의 확인된 이메일.
async function recipientEmail(kind: "arklings" | "user", recipientId: string | null): Promise<string | null> {
  if (kind === "arklings") return process.env.ADMIN_NOTIFY_EMAIL?.trim() || null;
  if (!recipientId) return null;
  const { data, error } = await createAdminClient().auth.admin.getUserById(recipientId);
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  return data.user.email;
}

// 새 신청이 접수된 뒤에 부른다. 메일이 실패해도 신청 접수에는 영향이 없도록 모든 오류를 여기서 삼킨다.
export async function notifyNewRequest(input: {
  origin: string;
  recipientKind: "arklings" | "user";
  recipientId: string | null;
  applicantName: string;
  contact: string;
}): Promise<void> {
  try {
    const to = await recipientEmail(input.recipientKind, input.recipientId);
    if (to) {
      const m = newRequestNotice(input.origin);
      await sendMail({ to, ...m });
    } else {
      console.warn("[mail] 알림을 받을 이메일이 없어 새 신청 알림을 보내지 않았습니다.");
    }
  } catch {
    console.error("[mail] 새 신청 알림을 보내는 중 오류가 났습니다.");
  }
  // 연락처가 이메일일 때만 신청자에게 접수 확인을 보낸다(전화번호면 생략).
  try {
    const contact = input.contact.trim();
    if (EMAIL_RE.test(contact)) {
      const m = applicantReceipt(input.applicantName);
      await sendMail({ to: contact, ...m });
    }
  } catch {
    console.error("[mail] 접수 확인 메일을 보내는 중 오류가 났습니다.");
  }
}
