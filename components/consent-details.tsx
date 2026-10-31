import Link from "next/link";
import { CONSENT_ITEMS, CONSENT_NOTES } from "@/lib/consent";

// 동의 문구 전문(접어 둔 상태). 가입·협업 신청 화면의 체크 칸 아래에 붙인다. 글은 lib/consent.ts 한 곳에서만 가져온다.
export function ConsentDetails() {
  return (
    <details className="rounded-lg border border-[#e8dfe3] bg-[#faf7f8] px-3 py-2 text-[12px] text-[#574a4f]">
      <summary className="cursor-pointer font-medium text-[#292126]">동의 내용 자세히 보기</summary>
      <ul className="mt-2 flex flex-col gap-1.5 leading-normal">
        {CONSENT_ITEMS.map((item) => (
          <li key={item.label}>
            <span className="font-medium text-[#292126]">{item.label}:</span> {item.text}
          </li>
        ))}
        {CONSENT_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p className="mt-2">
        자세한 내용은{" "}
        <Link href="/privacy" className="text-jaju underline" target="_blank">
          개인정보처리방침
        </Link>
        에서 볼 수 있습니다.
      </p>
    </details>
  );
}
