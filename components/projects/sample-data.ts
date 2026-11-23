import type { Project, ProjectStep } from "./types";

// 프로젝트 공고 예시 데이터(2026-11-23). 이번 단계는 화면만 만들어서 DB 대신 이 파일을 읽는다.
// 실제 사이트(VERCEL_ENV=production)에서는 /projects가 404다(AGENTS.md 「화면·기능을 덧붙일 때」 1·3번). 테이블·지원 처리는 다음 단계에서 정한다.
export const projectsClosed = () => process.env.VERCEL_ENV === "production";

const steps = (a: [string, string], b: [string, string], c: [string, string], d: [string, string]): ProjectStep[] =>
  [a, b, c, d].map(([label, range]) => ({ label, range }));

const SADAHAM = { title: "사다함의 꿈", blurb: "삼한일통 3부작의 두 번째 이야기입니다. 이 공고의 결과물은 작품 포트폴리오에 함께 올라갑니다.", logline: "열다섯 화랑 사다함이 첫 출정에서 죽음 앞에 선 벗을 구하려다, 약속과 나라 사이에서 선택을 강요받는다." };
const AKUI = { title: "악의 꽃", blurb: "삼한일통 3부작의 첫 이야기입니다. 이 공고의 결과물은 작품 포트폴리오에 함께 올라갑니다.", logline: "금관가야의 마지막 밤, 철을 다루던 소녀가 나라를 삼킨 저주의 꽃을 키워 낸 자가 누구인지 쫓는다." };
const DANHANA = { title: "단 하나의 꿈", blurb: "삼한일통 3부작의 마지막 이야기입니다. 이 공고의 결과물은 작품 포트폴리오에 함께 올라갑니다.", logline: "세 나라가 하나가 되는 날, 단 하나의 꿈을 지키려는 이들이 각자의 방식으로 마지막 선택을 한다." };
const MUSEUM = { title: "박물관 협업 숏폼", blurb: "지역 박물관과 함께 만드는 유물 소개 숏폼 시리즈입니다. 결과물은 시리즈 포트폴리오에 함께 올라갑니다.", logline: "잠든 유물이 1분 안에 제 이야기를 들려준다. 소장품 하나가 한 편이 되는 숏폼 시리즈." };
const STUDIO = { title: "아클링스 스튜디오", blurb: "아클링스 전체 홍보에 쓰이는 작업입니다. 결과물은 스튜디오 소개에 쓰입니다.", logline: "한국 고대사를 여러 크리에이터가 함께 만드는 참여형 제작 스튜디오, 아클링스." };

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: "p-sadaham-conti", title: "「사다함의 꿈」 1화 콘티", summary: "신라 화랑 사다함의 첫 출정을 다룬 1화 대본을 장면별 콘티로 옮깁니다. 약 60컷 분량입니다.",
    status: "open", source: "arklings", roles: ["art_director"], genres: ["사극", "판타지"], rewardMin: 250, rewardMax: 400,
    postedAt: "2026-11-20", opensAt: "2026-11-20", deadline: "2026-12-07", applicants: 3, selected: 1, periodLabel: "5주", periodRange: "12월 15일 ~ 1월 16일",
    heroNote: "「사다함의 꿈」 대표 이미지 자리",
    intro: { heading: "첫 출정 전투를\n장면으로 옮깁니다", body: "「사다함의 꿈」 1화 대본(약 40쪽)을 장면별 콘티로 옮깁니다. 신라 화랑 사다함이 처음 전장에 나서는 회차이고, 전투 장면이 전체의 절반쯤입니다. 대본과 인물·의상 설정 자료는 아클링스가 드립니다." },
    scope: [{ title: "1화 전체 콘티", text: "약 60컷, 흑백 러프로 그립니다." }, { title: "전투 핵심 컷 6장", text: "명암까지 넣어 연출 의도가 보이게 합니다." }, { title: "점검과 수정", text: "중간 점검 1회, 최종 수정 2회입니다." }],
    steps: steps(["모집", "11월 20일 ~ 12월 7일"], ["지원자 검토 · 선정", "12월 8일 ~ 12월 12일"], ["콘티 작업", "12월 15일 ~ 1월 16일"], ["1화 공개", "2월 중"]), currentStep: 0, work: SADAHAM,
  },
  {
    id: "p-gaya-advice", title: "가야 철기 장면 고증 자문 (2회)", summary: "박물관 협업 숏폼에 나오는 가야 철기 장면의 무기와 복식을 검토합니다. 화상 회의 2회입니다.",
    status: "open", source: "request", roles: ["history_advisor"], genres: ["다큐"], rewardMin: 60, rewardMax: 100,
    postedAt: "2026-11-18", opensAt: "2026-11-18", deadline: "2026-11-30", applicants: 1, selected: 1, periodLabel: "2주", periodRange: "12월 3일 ~ 12월 17일",
    heroNote: "가야 철기 장면 대표 이미지 자리",
    intro: { heading: "철기 장면의\n고증을 살펴봅니다", body: "박물관 협업 숏폼의 가야 철기 장면에 나오는 무기·갑옷·복식을 사료와 출토품 기준으로 검토합니다. 장면 자료는 미리 보내 드리고, 화상 회의 2회로 의견을 나눕니다." },
    scope: [{ title: "자료 사전 검토", text: "장면 이미지와 소품 목록을 미리 읽고 메모합니다." }, { title: "화상 회의 2회", text: "회당 1시간, 수정이 필요한 곳을 짚습니다." }, { title: "검토 의견서", text: "A4 2장 안팎으로 정리해 전달합니다." }],
    steps: steps(["모집", "11월 18일 ~ 11월 30일"], ["지원자 검토 · 선정", "12월 1일 ~ 12월 2일"], ["자문 진행", "12월 3일 ~ 12월 17일"], ["숏폼 공개", "1월 중"]), currentStep: 0, work: MUSEUM,
  },
  {
    id: "p-akui-teaser", title: "「악의 꽃」 티저 영상 연출", summary: "「악의 꽃」 세계관을 소개하는 1분 티저를 연출합니다. 대본과 콘티는 아클링스가 준비합니다.",
    status: "soon", source: "arklings", roles: ["video"], genres: ["사극", "스릴러"], rewardMin: 400, rewardMax: 800,
    postedAt: "2026-11-22", opensAt: "2026-12-01", deadline: "2026-12-15", applicants: 0, selected: 1, periodLabel: "6주", periodRange: "1월 5일 ~ 2월 13일",
    heroNote: "「악의 꽃」 대표 이미지 자리",
    intro: { heading: "세계관의 첫인상을\n1분에 담습니다", body: "「악의 꽃」 세계관을 처음 만나는 사람에게 보여 줄 1분 티저를 연출합니다. 대본과 콘티는 아클링스가 준비하고, 촬영·편집·연출 전반을 맡아 주실 분을 찾습니다." },
    scope: [{ title: "연출 계획서", text: "톤·색·편집 방향을 한 장으로 정리합니다." }, { title: "촬영·제작", text: "1분 분량 티저를 제작합니다." }, { title: "최종본 납품", text: "수정 2회 포함, 가로·세로 두 규격으로 납품합니다." }],
    steps: steps(["모집", "12월 1일 ~ 12월 15일"], ["지원자 검토 · 선정", "12월 16일 ~ 12월 22일"], ["티저 제작", "1월 5일 ~ 2월 13일"], ["티저 공개", "2월 말"]), currentStep: 0, work: AKUI,
  },
  {
    id: "p-museum-scripts", title: "박물관 숏폼 대본 3편", summary: "지역 박물관 소장 유물을 소개하는 1분짜리 숏폼 대본 3편을 씁니다. 자문 자료를 함께 드립니다.",
    status: "open", source: "request", roles: ["script"], genres: ["다큐"], rewardMin: 150, rewardMax: 240,
    postedAt: "2026-11-15", opensAt: "2026-11-15", deadline: "2026-12-14", applicants: 5, selected: 1, periodLabel: "4주", periodRange: "12월 18일 ~ 1월 15일",
    heroNote: "박물관 숏폼 대표 이미지 자리",
    intro: { heading: "유물의 이야기를\n1분 대본으로 씁니다", body: "지역 박물관이 소개하고 싶은 유물 3점을 골라 1분짜리 숏폼 대본으로 씁니다. 유물 설명 자료와 역사 자문은 함께 드립니다." },
    scope: [{ title: "대본 3편", text: "편당 1분, 내레이션과 장면 지시를 포함합니다." }, { title: "자문 반영", text: "역사 자문 의견을 받아 1회 고칩니다." }, { title: "최종 정리", text: "박물관 검토 후 최종본을 확정합니다." }],
    steps: steps(["모집", "11월 15일 ~ 12월 14일"], ["지원자 검토 · 선정", "12월 15일 ~ 12월 17일"], ["대본 집필", "12월 18일 ~ 1월 15일"], ["숏폼 제작", "2월 중"]), currentStep: 0, work: MUSEUM,
  },
  {
    id: "p-bible", title: "삼한일통 세계관 바이블 정리", summary: "흩어진 설정 자료를 인물·국가·연표 단위의 세계관 바이블 한 권으로 묶습니다.",
    status: "open", source: "arklings", roles: ["script", "producer"], genres: ["사극"], rewardMin: 200, rewardMax: 350,
    postedAt: "2026-11-12", opensAt: "2026-11-12", deadline: "2026-12-20", applicants: 2, selected: 1, periodLabel: "6주", periodRange: "1월 5일 ~ 2월 13일",
    heroNote: "삼한일통 세계관 대표 이미지 자리",
    intro: { heading: "흩어진 설정을\n한 권으로 묶습니다", body: "문서·대화·이미지에 흩어진 삼한일통 설정 자료를 인물·국가·연표 단위로 모아 세계관 바이블 한 권으로 만듭니다. 이후 모든 크리에이터가 같은 기준으로 작업할 수 있게 하는 일입니다." },
    scope: [{ title: "자료 수집·분류", text: "기존 자료를 읽고 항목별로 분류합니다." }, { title: "바이블 집필", text: "인물·국가·연표 세 부로 정리합니다." }, { title: "검수와 수정", text: "아클링스 검수 후 2회 고칩니다." }],
    steps: steps(["모집", "11월 12일 ~ 12월 20일"], ["지원자 검토 · 선정", "12월 21일 ~ 12월 26일"], ["바이블 작업", "1월 5일 ~ 2월 13일"], ["내부 공개", "2월 말"]), currentStep: 0, work: { ...DANHANA, title: "삼한일통 3부작", blurb: "세 작품이 함께 쓰는 설정 기준 문서입니다. 결과물은 작품 포트폴리오에 함께 올라갑니다." },
  },
  {
    id: "p-sadaham-poster", title: "「사다함의 꿈」 포스터 일러스트", summary: "1화 공개에 맞춘 세로형 포스터 일러스트 1장을 그립니다.",
    status: "closed", source: "arklings", roles: ["art_director"], genres: ["사극"], rewardMin: 150, rewardMax: 250,
    postedAt: "2026-10-20", opensAt: "2026-10-20", deadline: "2026-11-10", applicants: 8, selected: 1, periodLabel: "3주", periodRange: "11월 15일 ~ 12월 6일",
    heroNote: "「사다함의 꿈」 포스터 대표 이미지 자리",
    intro: { heading: "공개일의 첫 그림을\n그립니다", body: "1화 공개에 맞춰 쓰일 세로형 포스터 일러스트 1장을 그립니다. 인물 설정화와 색 기준은 아클링스가 드립니다." },
    scope: [{ title: "러프 시안 2종", text: "구도 두 가지를 먼저 확인합니다." }, { title: "최종 일러스트 1장", text: "세로형, 인쇄 가능한 크기입니다." }, { title: "수정", text: "최종본 수정 2회입니다." }],
    steps: steps(["모집", "10월 20일 ~ 11월 10일"], ["지원자 검토 · 선정", "11월 11일 ~ 11월 14일"], ["일러스트 작업", "11월 15일 ~ 12월 6일"], ["1화 공개", "2월 중"]), currentStep: 2, work: SADAHAM,
  },
  {
    id: "p-danhana-design", title: "「단 하나의 꿈」 인물 설정화", summary: "주요 인물 4명의 전신 설정화와 표정 시트를 그립니다. 인물 설명 자료를 드립니다.",
    status: "open", source: "arklings", roles: ["art_director"], genres: ["판타지", "사극"], rewardMin: 150, rewardMax: 300,
    postedAt: "2026-11-10", opensAt: "2026-11-10", deadline: "2026-12-10", applicants: 4, selected: 1, periodLabel: "5주", periodRange: "12월 14일 ~ 1월 15일",
    heroNote: "「단 하나의 꿈」 대표 이미지 자리",
    intro: { heading: "인물의 얼굴을\n먼저 정합니다", body: "「단 하나의 꿈」에 나오는 주요 인물 4명의 전신 설정화와 표정 시트를 그립니다. 이후 모든 작업의 기준이 되는 그림입니다." },
    scope: [{ title: "전신 설정화 4종", text: "정면·측면·후면을 포함합니다." }, { title: "표정 시트", text: "인물마다 6가지 표정입니다." }, { title: "수정", text: "인물당 1회 수정합니다." }],
    steps: steps(["모집", "11월 10일 ~ 12월 10일"], ["지원자 검토 · 선정", "12월 11일 ~ 12월 13일"], ["설정화 작업", "12월 14일 ~ 1월 15일"], ["설정집 공개", "2월 중"]), currentStep: 0, work: DANHANA,
  },
  {
    id: "p-silla-costume", title: "신라 복식 고증 자문", summary: "화랑 장면에 쓰일 신라 복식과 장신구를 사료 기준으로 검토합니다. 서면 의견 1회입니다.",
    status: "open", source: "request", roles: ["history_advisor"], genres: ["사극"], rewardMin: 80, rewardMax: 120,
    postedAt: "2026-11-08", opensAt: "2026-11-08", deadline: "2026-12-05", applicants: 2, selected: 1, periodLabel: "2주", periodRange: "12월 8일 ~ 12월 22일",
    heroNote: "신라 복식 대표 이미지 자리",
    intro: { heading: "복식의 근거를\n짚어 드립니다", body: "화랑 장면의 복식과 장신구가 사료와 출토품에 맞는지 검토하고, 고칠 곳은 근거와 함께 알려 주는 일입니다." },
    scope: [{ title: "자료 검토", text: "복식 시안 12종을 읽습니다." }, { title: "서면 의견", text: "항목별 근거를 정리해 1회 전달합니다." }],
    steps: steps(["모집", "11월 8일 ~ 12월 5일"], ["지원자 검토 · 선정", "12월 6일 ~ 12월 7일"], ["자문 진행", "12월 8일 ~ 12월 22일"], ["작품 반영", "1월 중"]), currentStep: 0, work: SADAHAM,
  },
  {
    id: "p-akui-script", title: "「악의 꽃」 대본 감수", summary: "「악의 꽃」 1~3화 대본의 대사와 전개를 읽고 감수 의견을 냅니다.",
    status: "open", source: "arklings", roles: ["script"], genres: ["스릴러", "사극"], rewardMin: 100, rewardMax: 180,
    postedAt: "2026-11-05", opensAt: "2026-11-05", deadline: "2026-12-12", applicants: 6, selected: 1, periodLabel: "3주", periodRange: "12월 15일 ~ 1월 5일",
    heroNote: "「악의 꽃」 대표 이미지 자리",
    intro: { heading: "대본을 한 번 더\n읽어 드립니다", body: "「악의 꽃」 1~3화 대본을 읽고 대사의 결과 전개의 힘을 점검해 의견을 냅니다. 고치는 일은 작가가 하고, 감수는 방향을 짚는 일입니다." },
    scope: [{ title: "대본 3편 감수", text: "편당 의견서 1장입니다." }, { title: "전체 흐름 의견", text: "3화 전체를 묶어 한 번 더 정리합니다." }],
    steps: steps(["모집", "11월 5일 ~ 12월 12일"], ["지원자 검토 · 선정", "12월 13일 ~ 12월 14일"], ["감수 진행", "12월 15일 ~ 1월 5일"], ["대본 확정", "1월 중"]), currentStep: 0, work: AKUI,
  },
  {
    id: "p-studio-edit", title: "스튜디오 소개 영상 편집", summary: "아클링스를 소개하는 90초 영상을 기존 영상 소스로 편집합니다. 자막과 음악을 포함합니다.",
    status: "soon", source: "request", roles: ["video"], genres: ["다큐"], rewardMin: 300, rewardMax: 500,
    postedAt: "2026-11-21", opensAt: "2026-12-03", deadline: "2026-12-20", applicants: 0, selected: 1, periodLabel: "4주", periodRange: "1월 5일 ~ 2월 2일",
    heroNote: "아클링스 스튜디오 대표 이미지 자리",
    intro: { heading: "스튜디오의 첫인상을\n영상으로 만듭니다", body: "아클링스가 가진 영상 소스를 모아 90초 소개 영상으로 편집합니다. 자막과 음악은 저작권이 해결된 것만 씁니다." },
    scope: [{ title: "편집 시안", text: "구성안과 1차 편집본입니다." }, { title: "자막·음악", text: "한글 자막과 음악을 넣습니다." }, { title: "최종 납품", text: "수정 2회 포함입니다." }],
    steps: steps(["모집", "12월 3일 ~ 12월 20일"], ["지원자 검토 · 선정", "12월 21일 ~ 12월 26일"], ["편집 작업", "1월 5일 ~ 2월 2일"], ["영상 공개", "2월 중"]), currentStep: 0, work: STUDIO,
  },
  {
    id: "p-gaya-conti", title: "가야 철기 장면 콘티", summary: "가야 철기 장면 30초 분량을 콘티로 옮깁니다. 대본과 고증 자료를 드립니다.",
    status: "closed", source: "request", roles: ["art_director"], genres: ["다큐"], rewardMin: 120, rewardMax: 200,
    postedAt: "2026-10-10", opensAt: "2026-10-10", deadline: "2026-11-05", applicants: 7, selected: 1, periodLabel: "3주", periodRange: "11월 10일 ~ 12월 1일",
    heroNote: "가야 철기 장면 대표 이미지 자리",
    intro: { heading: "철기 장면을\n컷으로 나눕니다", body: "박물관 협업 숏폼의 가야 철기 장면 30초를 컷 단위 콘티로 옮깁니다." },
    scope: [{ title: "콘티 20컷", text: "흑백 러프입니다." }, { title: "수정", text: "1회 수정합니다." }],
    steps: steps(["모집", "10월 10일 ~ 11월 5일"], ["지원자 검토 · 선정", "11월 6일 ~ 11월 9일"], ["콘티 작업", "11월 10일 ~ 12월 1일"], ["숏폼 제작", "1월 중"]), currentStep: 2, work: MUSEUM,
  },
  {
    id: "p-shorts-pd", title: "숏폼 시리즈 총괄 PD", summary: "박물관 협업 숏폼 시리즈 6편의 일정과 인력을 총괄합니다. 주 1회 점검 회의가 있습니다.",
    status: "open", source: "arklings", roles: ["producer"], genres: ["다큐"], rewardMin: 500, rewardMax: 900,
    postedAt: "2026-11-01", opensAt: "2026-11-01", deadline: "2026-12-25", applicants: 1, selected: 1, periodLabel: "12주", periodRange: "1월 5일 ~ 3월 27일",
    heroNote: "박물관 협업 숏폼 대표 이미지 자리",
    intro: { heading: "여섯 편을\n한 흐름으로 이끕니다", body: "박물관 협업 숏폼 시리즈 6편이 제때 같은 품질로 나오도록 일정·인력·검수를 총괄합니다." },
    scope: [{ title: "일정 관리", text: "편별 일정표를 만들고 지킵니다." }, { title: "인력 조율", text: "각 편 담당자와 주 1회 점검합니다." }, { title: "최종 검수", text: "공개 전 품질을 확인합니다." }],
    steps: steps(["모집", "11월 1일 ~ 12월 25일"], ["지원자 검토 · 선정", "12월 26일 ~ 12월 30일"], ["시리즈 제작", "1월 5일 ~ 3월 27일"], ["시리즈 공개", "4월 중"]), currentStep: 0, work: MUSEUM,
  },
];

export const getSampleProject = (id: string) => SAMPLE_PROJECTS.find((p) => p.id === id);
