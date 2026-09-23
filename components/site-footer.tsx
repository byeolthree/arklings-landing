export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-teal bg-background">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 py-4 md:flex-row md:items-start md:justify-between md:px-20 md:pb-3 md:pt-4">
        <div className="flex max-w-[560px] flex-col gap-0.5">
          <p className="text-sm font-bold text-title md:text-lg">Arklings</p>
          <p className="hidden text-xs leading-normal text-body md:block">
            한국 신화·고대사 기반 IP 스튜디오. 다양한 창작자가 함께 고유 세계관을
            만들어갑니다.
          </p>
          <p className="text-[10px] text-body md:text-[11px]">
            <span className="md:hidden">© 2026 Arklings · 연락처 · 참여 방법</span>
            <span className="hidden md:inline">
              © 2026 Arklings. All rights reserved.
            </span>
          </p>
        </div>
        <div className="hidden flex-col items-end gap-1.5 text-right text-[11px] text-body md:flex">
          <span>이용약관</span>
          <span>개인정보처리방침</span>
          <span>hello@arklings.kr</span>
        </div>
      </div>
    </footer>
  );
}
