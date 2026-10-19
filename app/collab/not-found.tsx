import Link from "next/link";
import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";

export default function CollabNotFound() {
  return (
    <PaperPage>
      <PaperCard className="text-center">
        <p className="text-[15px] font-bold text-[#292126]">찾을 수 없는 신청입니다.</p>
        <p className="mt-1 text-[13px] text-[#574a4f]">삭제되었거나 주소가 잘못되었을 수 있습니다.</p>
        <Link href="/collab" className={`${primaryBtn} mt-5`}>목록으로</Link>
      </PaperCard>
    </PaperPage>
  );
}
