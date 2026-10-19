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
  async redirects() {
    return [{ source: "/apply", destination: "/collab/new", permanent: false }];
  },
};

export default nextConfig;
