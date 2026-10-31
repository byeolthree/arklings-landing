import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 첨부 파일(최대 4MB)이 Server Action 요청에 실려 오므로 기본 1MB보다 넉넉히 둔다.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async rewrites() {
    // 사이트 첫 화면(/)은 v14 랜딩 시안(public/landing.html)을 그대로 보여 준다.
    return {
      beforeFiles: [{ source: "/", destination: "/landing.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  // PDF 만들기(pdfkit)는 자기 글꼴 데이터 파일을 읽으므로 묶음에 섞지 않고 그대로 둔다. 한글 글꼴은 PDF를 만드는 화면에 함께 실어 보낸다.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/planner": ["./assets/fonts/*.otf"],
  },
  async redirects() {
    return [
      { source: "/apply", destination: "/collab/new", permanent: false },
      // 예전 기획안 화면 주소. 파일(public/planner.html)은 남겨 두고 새 화면으로 보낸다.
      { source: "/planner.html", destination: "/planner", permanent: false },
    ];
  },
};

export default nextConfig;
