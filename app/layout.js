import "./globals.css";

// 중립 fallback — 챗봇(/) 페이지는 자체 generateMetadata 로 병원명 동적 적용,
// /admin /login 등 자체 메타데이터 없는 경로는 여기를 사용.
export const metadata = {
  title: "ClinicTalk",
  description: "병원 AI 상담 채널",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // safe-area-inset-* CSS env() 활성화 — iPhone 노치/홈인디케이터 영역에
  // 헤더/입력바가 가려지지 않도록 inset 패딩과 함께 사용.
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}