import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import "@/components/landing-kit.css";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "아클링스", template: "%s | 아클링스" },
  description: "한국 신화·고대사 기반 IP 스튜디오, 아클링스의 협업 신청.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-body">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
        {/* 방문 통계(Vercel Web Analytics). 대시보드에서 켜기 전에는 아무것도 모이지 않는다. */}
        <Analytics />
      </body>
    </html>
  );
}
