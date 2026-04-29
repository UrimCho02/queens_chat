import "./globals.css";

export const metadata = {
  title: "더퀸즈여성의원 AI 상담",
  description: "더퀸즈여성의원 AI 상담 채널",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}