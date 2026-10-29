import type { MetadataRoute } from "next";

// 협업 신청 목록·상세는 운영자용이라 검색에 잡히지 않게 한다(각 화면에는 noindex도 따로 있다).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/collab"] },
  };
}
