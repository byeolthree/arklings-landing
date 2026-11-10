// 채널 주소만 붙여 넣으면 어느 채널인지 이름을 저절로 정한다(화면 도우미, 서버 규칙은 그대로 lib/creator-rules.ts).
// 인스타그램·유튜브는 이름이 「인스타그램」·「유튜브」로 정해져 프로필 화면에서 로고가 뜬다(components/creators/creator-profile.tsx가 이름으로 로고를 고른다).
// 그 밖의 주소는 도메인 이름(예: example.com)을 이름으로 쓴다.
import { CHANNEL_LABEL_MAX } from "@/lib/creator-rules";

function hostOf(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function channelLabelFromUrl(raw: string): string | null {
  const h = hostOf(raw);
  if (!h) return null;
  if (h === "instagram.com" || h.endsWith(".instagram.com") || h === "instagr.am") return "인스타그램";
  if (h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be") return "유튜브";
  return h.slice(0, CHANNEL_LABEL_MAX);
}
