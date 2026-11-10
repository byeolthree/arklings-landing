// 서버(Vercel)는 UTC로 돌기 때문에 시간대를 지정하지 않으면 한국 시간보다 9시간 이르게 보인다.
// 화면에 보이는 시각은 모두 이 파일을 거쳐 한국 시간(Asia/Seoul)으로 통일한다.
const TIME_ZONE = "Asia/Seoul";

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatKst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${dateTime.format(d)} KST`;
}

export function formatKstDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${dateOnly.format(d)} KST`;
}

// 표에 쓰는 짧은 시각: 「11-10 09:12」(한국 시간).
export function formatKstShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const k = new Date(d.getTime() + 9 * 3600 * 1000).toISOString();
  return `${k.slice(5, 10)} ${k.slice(11, 16)}`;
}
