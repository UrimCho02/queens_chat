"use client";

// 홈페이지 우하단 챗봇 위젯.
// 닫힘 상태: 동그란 버튼(병원 템플릿 색). 클릭 시 모달처럼 iframe 패널 열림.
// 페이지 어디서든 data-clinictalk-open 속성 가진 element 를 클릭해도 열림.
//
// iframe src 는 `/?clinic=<slug>` — 챗봇이 어느 병원인지 인식하도록 slug 전달.
// 챗봇 비활성 병원이어도 챗봇 UI 는 그대로 노출됨 — 입력 잠금/안내는 챗봇 페이지에서 처리.

import { useEffect, useState } from "react";

// 위젯 버튼 색 — 홈페이지 템플릿에 맞춤 (챗봇 본체 CHAT_THEMES 와 동일 색).
const WIDGET_COLORS = {
  classic: { primary: "#C9A96E", hover: "#B8965D" },
  modern: { primary: "#2563EB", hover: "#1D4ED8" },
  soft: { primary: "#10B981", hover: "#059669" },
};

export default function ChatWidget({ slug, template }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const color = WIDGET_COLORS[template] || WIDGET_COLORS.classic;

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={open ? "챗봇 닫기" : "챗봇 열기"}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-all cursor-pointer ${
          open
            ? "bg-white text-gray-700 border border-gray-200"
            : "text-white"
        }`}
        style={
          open
            ? undefined
            : { backgroundColor: hovered ? color.hover : color.primary }
        }
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-30 w-[min(380px,calc(100vw-2.5rem))] h-[min(620px,calc(100vh-8rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
          <iframe
            src={slug ? `/?clinic=${encodeURIComponent(slug)}` : "/"}
            title="AI 챗봇"
            className="w-full h-full border-0"
          />
        </div>
      )}
    </>
  );
}
