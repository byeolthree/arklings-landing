import type { Metadata } from "next";
import { PaperCard, PaperPage } from "@/components/paper-card";
import { CONSENT_ITEMS, CONSENT_NOTES, CONSENT_PLACEHOLDERS, USAGE_LOG } from "@/lib/consent";

export const metadata: Metadata = { title: "개인정보처리방침" };

// 가입·협업 신청 화면의 동의 문구와 같은 글(lib/consent.ts)을 그대로 보여 준다.
export default function PrivacyPage() {
  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">개인정보처리방침</h1>
        <p className="mt-2 text-[13px] leading-normal text-[#574a4f]">
          아클링스는 로그인, 기획안 저장, 협업 신청을 위해 아래와 같이 개인정보를 수집·이용합니다.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {CONSENT_ITEMS.map((item) => (
            <section key={item.label}>
              <h2 className="text-[15px] font-bold text-[#292126]">{item.label}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#574a4f]">{item.text}</p>
            </section>
          ))}
          <section>
            <h2 className="text-[15px] font-bold text-[#292126]">알아 두실 점</h2>
            <ul className="mt-1.5 list-disc pl-5 text-[14px] leading-relaxed text-[#574a4f]">
              {CONSENT_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-[15px] font-bold text-[#292126]">{USAGE_LOG.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#574a4f]">{USAGE_LOG.intro}</p>
            <div className="mt-3 flex flex-col gap-3">
              {USAGE_LOG.items.map((item) => (
                <div key={item.label}>
                  <h3 className="text-[14px] font-bold text-[#292126]">{item.label}</h3>
                  {item.text ? (
                    <p className="mt-1 text-[14px] leading-relaxed text-[#574a4f]">{item.text}</p>
                  ) : (
                    // 아직 정해지지 않은 항목: 빈칸으로 둔다(정해지면 lib/consent.ts에 적는다)
                    <p className="mt-1 text-[14px] leading-relaxed text-[#8c8c8c]">
                      <span aria-hidden="true">□ ____________</span> (정해지면 적습니다)
                    </p>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-3 list-disc pl-5 text-[14px] leading-relaxed text-[#574a4f]">
              {USAGE_LOG.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-[15px] font-bold text-[#292126]">추가 안내 (작성 예정)</h2>
            <ul className="mt-1.5 list-disc pl-5 text-[14px] leading-relaxed text-[#8c8c8c]">
              {CONSENT_PLACEHOLDERS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
