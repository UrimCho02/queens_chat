import "./globals.css";

export const metadata = {
  title: "더퀸즈여성의원 AI 상담",
  description: "더퀸즈여성의원 AI 상담 채널",
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