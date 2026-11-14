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

// 한국 시간으로 9시간을 더한 뒤 ISO 글자(YYYY-MM-DDTHH:mm:ss.sssZ)로 만든다. 자리를 잘라 쓰는 짧은 표시(아래 formatKstShort, 종 알림, 운영자 주별 표)가 같이 쓴다.
export function kstIso(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString();
}

// 표에 쓰는 짧은 시각: 「11-10 09:12」(한국 시간).
export function formatKstShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const k = kstIso(d);
  return `${k.slice(5, 10)} ${k.slice(11, 16)}`;
}
