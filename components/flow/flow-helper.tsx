import Link from "next/link";

const STEPS: [string, string][] = [
  ["1 크리에이터 목록", "/dev-preview/flow/creators"],
  ["2 프로필", "/dev-preview/flow/creators/jian-lee"],
  ["3 기획안 창", "/dev-preview/flow/creators/jian-lee?item=jian-lee-1"],
  ["4 협업 신청서", "/dev-preview/flow/apply?creator=jian-lee&plan=jian-lee-1&role=script"],
  ["5 보낸 신청", "/dev-preview/flow/sent"],
  ["5 받은 신청", "/dev-preview/flow/received"],
  ["6 킹덤 작품 화면", "/dev-preview/flow/kingdom"],
];

// 사이트에 없는 상자: 샘플 흐름의 각 화면으로 바로 가는 길
export function FlowHelper() {
  return (
    <details className="fixed bottom-[88px] right-4 z-[60] max-w-[260px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
      <summary className="cursor-pointer">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자, 눌러서 펼침)
      </summary>
      <div className="mt-1">
        가짜 데이터예요. 화면 바로 가기:
        <ul className="mt-1 list-none p-0">
          {STEPS.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
