"use client";

// 어드민 헤더의 병원 이름 옆 아이콘.
// 병원이 /admin/settings 에 올린 로고가 있으면 로고, 없으면 진료과 중립 아이콘.
// 옛 👑(더퀸즈 전용 브랜딩)를 대체 — 멀티테넌트에서 병원별로 다르게 보이도록.
export default function HeaderIcon({ logoUrl }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-8 h-8 rounded-full object-contain bg-white p-0.5 flex-shrink-0"
      />
    );
  }
  return (
    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    </span>
  );
}
