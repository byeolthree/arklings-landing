import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-teal">
      <div className="mx-auto max-w-[1440px] px-4 pb-3 pt-4 md:px-20">
        {/* 모바일 */}
        <div className="flex flex-col gap-1 md:hidden">
          <p className="text-[14px] font-bold text-[#292126]">Arklings</p>
          <p className="text-[10px] text-[#574a4f]">© 2026 Arklings · 연락처 · 참여 방법</p>
        </div>
        {/* 데스크톱 */}
        <div className="hidden items-start justify-between md:flex">
          <div className="flex flex-col gap-0.5">
            <p className="text-[18px] font-bold text-[#292126]">Arklings</p>
            <p className="text-[12px] text-[#574a4f]">한국 신화·고대사 기반 IP 스튜디오. 다양한 창작자가 함께 고유 세계관을 만들어갑니다.</p>
            <p className="text-[11px] text-[#574a4f]">© 2026 Arklings. All rights reserved.</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-[11px] text-[#574a4f]">
            <span>이용약관</span>
            <Link href="/privacy" className="hover:text-jaju">
              개인정보처리방침
            </Link>
            <span>hello@arklings.kr</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
