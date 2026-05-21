"use client";

// 홈페이지 우하단 챗봇 위젯.
// 닫힘 상태: 동그란 골드 버튼. 클릭 시 모달처럼 iframe 패널 열림.
// 페이지 어디서든 data-clinictalk-open 속성 가진 element 를 클릭해도 열림.
//
// iframe src 는 `/?clinic=<slug>` — 챗봇이 어느 병원인지 인식하도록 slug 전달.
// chatbotEnabled=false 면 버튼은 노출하되 패널은 채팅 대신 안내문을 표시
// (산부인과 전용 가드레일 한계로 비산부인과 병원은 챗봇 비활성).

import { useEffect, useState } from "react";

export default function ChatWidget({ slug, chatbotEnabled = true }) {
  const [open, setOpen] = useState(false);
  const disabled = chatbotEnabled === false;

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
      {open &&
        (disabled ? (
          <div className="fixed bottom-24 right-5 z-30 w-[min(380px,calc(100vw-2.5rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-[#C9A96E] px-5 py-4">
              <div className="text-white font-medium text-sm">
                💬 AI 챗봇 상담
              </div>
            </div>
            <div className="p-7 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                이 페이지는 홈페이지 디자인 미리보기입니다.
                <br />
                AI 챗봇 상담은 실제 도입 시 병원에 맞춰 제공됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-24 right-5 z-30 w-[min(380px,calc(100vw-2.5rem))] h-[min(620px,calc(100vh-8rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <iframe
              src={slug ? `/?clinic=${encodeURIComponent(slug)}` : "/"}
              title="AI 챗봇"
              className="w-full h-full border-0"
            />
          </div>
        ))}
    </>
  );
}
