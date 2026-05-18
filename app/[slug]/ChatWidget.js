"use client";

// 홈페이지 우하단 챗봇 위젯.
// 닫힘 상태: 동그란 골드 버튼. 클릭 시 모달처럼 iframe 패널 열림.
// 페이지 어디서든 data-clinictalk-open 속성 가진 element 를 클릭해도 열림.
//
// iframe src 는 `/` (현재 챗봇 라우트). 추후 챗봇이 slug 기반으로 분기되면
// `/${slug}/chat` 같은 경로로 교체.

import { useEffect, useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    const openers = document.querySelectorAll("[data-clinictalk-open]");
    openers.forEach((el) => el.addEventListener("click", handler));
    return () => {
      openers.forEach((el) => el.removeEventListener("click", handler));
    };
  }, []);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "챗봇 닫기" : "챗봇 열기"}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-all cursor-pointer ${
          open
            ? "bg-white text-gray-700 border border-gray-200"
            : "bg-[#C9A96E] text-white hover:bg-[#b8965d]"
        }`}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-30 w-[min(380px,calc(100vw-2.5rem))] h-[min(620px,calc(100vh-8rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          <iframe
            src="/"
            title="AI 챗봇"
            className="w-full h-full border-0"
          />
        </div>
      )}
    </>
  );
}
