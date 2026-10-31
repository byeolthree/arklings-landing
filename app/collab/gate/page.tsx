import { redirect } from "next/navigation";

// 임시 운영자 비밀번호 화면은 없어졌다. 협업 신청 목록은 받는 사람이 로그인해서 본다.
export default function GatePage() {
  redirect("/login?next=%2Fcollab");
}
