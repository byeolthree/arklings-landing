export type WorkBadge = {
  label: string;
  className: string;
};

export type StudioWork = {
  title: string;
  badges: WorkBadge[];
};

const darkOnGold = "bg-gold text-title";
const darkOnSage = "bg-sage text-title";
const whiteOnTeal = "bg-teal text-white";
const whiteOnDusty = "bg-dusty text-white";
const whiteOnInfo = "bg-info text-white";
const outlineSamhan = "border border-[#8c8c8c] bg-transparent text-[#595959]";

export const studioWorks: StudioWork[] = [
  {
    title: "소금비 내리는 나라 · 3화",
    badges: [
      { label: "신라", className: whiteOnTeal },
      { label: "영상 제작 중", className: darkOnGold },
    ],
  },
  {
    title: "연하국이 바다를 잃게 된 사연",
    badges: [
      { label: "가야", className: darkOnSage },
      { label: "대본 초고", className: whiteOnInfo },
    ],
  },
  {
    title: "원화 미실 · 1화",
    badges: [
      { label: "신라", className: whiteOnTeal },
      { label: "자료 3건", className: whiteOnDusty },
    ],
  },
  {
    title: "악의 꽃 · 파일럿",
    badges: [
      { label: "백제", className: whiteOnDusty },
      { label: "영상 제작 중", className: darkOnGold },
    ],
  },
  {
    title: "단 하나의 꿈 · 프롤로그",
    badges: [
      { label: "삼한", className: outlineSamhan },
      { label: "기획 중", className: darkOnSage },
    ],
  },
  {
    title: "2036 삼한일통 · 1화",
    badges: [
      { label: "신라", className: whiteOnTeal },
      { label: "대본 초고", className: whiteOnInfo },
    ],
  },
];
