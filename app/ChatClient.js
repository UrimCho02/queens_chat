"use client";
import { useState, useRef, useEffect } from "react";
import PusherClient from "pusher-js";
import { HOST_SLUG_MAP } from "@/lib/clinicSlug";

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

// 챗봇 색 테마 — 병원 홈페이지 템플릿(classic/modern/soft)에 맞춰 자동 적용.
// 위젯이 홈페이지에 임베드되므로 챗봇과 홈페이지 색을 맞춘다.
const CHAT_THEMES = {
  classic: { primary: "#C9A96E", bg: "#F5EFE6" }, // 골드
  modern: { primary: "#2563EB", bg: "#EFF6FF" }, // 블루
  soft: { primary: "#10B981", bg: "#ECFDF5" }, // 민트
};

function ChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

// 챗봇 메시지 옆 아바타. 옛 👑(더퀸즈 전용) 대신 진료과·병원 중립 아이콘.
function BotAvatar({ primary, topMargin }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${
        topMargin ? "mt-1" : ""
      }`}
      style={{ backgroundColor: primary }}
    >
      <ChatIcon className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

function MessageText({ text, isUser, accent }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, lineIdx) => {
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        return (
          <span key={lineIdx}>
            {parts.map((part, i) =>
              /https?:\/\/[^\s]+/.test(part) ? (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                  style={{ color: isUser ? "rgba(255,255,255,0.9)" : accent }}
                >
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

const DEFAULT_DISCLAIMER =
  "본 채널은 일반 안내용 AI 상담 채널이며, 진료를 대신할 수 없습니다. 정확한 진단·치료는 의사 진료가 필요합니다.";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState(null);
  const [clinicSlug, setClinicSlug] = useState("");
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef(null);
  const isOpen = chatInfo?.isOpen ?? null;
  const disclaimer = chatInfo?.disclaimer || DEFAULT_DISCLAIMER;
  // 챗봇 비활성 병원(비산부인과 데모 등) — UI 는 그대로 보이되 입력 잠금.
  const chatbotEnabled = chatInfo?.chatbotEnabled !== false;
  // 병원 템플릿에 맞춘 색 테마. 응답 도착 전엔 클래식(골드)로 fallback.
  const theme = CHAT_THEMES[chatInfo?.template] || CHAT_THEMES.classic;
  const inputRef = useRef(null);
  const prevLoadingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // loading이 true→false로 바뀌는 순간(메시지 응답 완료)에만 입력창 포커스 복원.
    // 초기 마운트 때는 모바일 키보드 자동 팝업 방지 위해 포커스 안 함.
    if (prevLoadingRef.current && !loading) {
      inputRef.current?.focus();
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    // 임베드된 홈페이지 위젯이 ?clinic=<slug> 로 병원을 지정. 쿼리 우선,
    // 없으면 호스트네임 매핑(데모 서브도메인 등), 그것도 없으면 서버 fallback(더퀸즈).
    const slug =
      new URLSearchParams(window.location.search).get("clinic") ||
      HOST_SLUG_MAP[window.location.hostname] ||
      "";
    setClinicSlug(slug);

    fetch(`/api/chat${slug ? `?clinic=${encodeURIComponent(slug)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setChatInfo(data);
        const clinicName = data.clinicName || "병원";
        const greeting = {
          id: 1,
          text: `안녕하세요! ${clinicName} AI 상담 채널입니다.\n진료시간, 예약, 비용 등 궁금하신 점을 편하게 물어보세요.\n\n※ 증상 관련 문의는 담당 직원이 확인 후 답변드립니다.`,
          isUser: false,
          isStaff: false,
        };
        const msgs = [greeting];
        if (data.currentEvent || data.eventImageUrl) {
          msgs.push({
            id: 2,
            text: data.currentEvent
              ? `🎉 이번달 이벤트\n\n${data.currentEvent}`
              : `🎉 이번달 이벤트`,
            image: data.eventImageUrl || null,
            isUser: false,
            isStaff: false,
            isEvent: true,
          });
        }
        if (data.chatMenu) {
          msgs.push({
            id: 3,
            isUser: false,
            isStaff: false,
            isMenu: true,
            menu: data.chatMenu,
          });
        }
        setMessages(msgs);
      });

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`client-${sessionId}`);
    channel.bind("staff-reply", (data) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: data.reply, isUser: false, isStaff: true },
      ]);
    });

    return () => pusher.disconnect();
  }, [sessionId]);

  const addMessage = (text, isUser, isStaff = false) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text, isUser, isStaff },
    ]);
  };

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading || !chatbotEnabled) return;
    setInput("");
    addMessage(messageText, true);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, sessionId, clinicSlug }),
      });
      const data = await res.json();

      if (data.error) {
        addMessage(data.error, false);
      } else if (data.isStaffRequired) {
        addMessage(
          "말씀해 주셔서 감사합니다. 담당 직원이 확인 후 곧 답변드릴게요. 💗",
          false
        );
      } else {
        addMessage(data.reply, false);
      }
    } catch {
      const phone = chatInfo?.clinicPhone;
      addMessage(
        `일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.${
          phone ? ` 문의: ${phone}` : ""
        }`,
        false
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ maxHeight: "100dvh", backgroundColor: theme.bg }}
    >

      {/* 헤더 */}
      <div
        className="px-4 pb-3 flex items-center gap-3 flex-shrink-0"
        style={{
          backgroundColor: theme.primary,
          // iOS 노치 영역 회피 — viewport-fit=cover 와 짝.
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
        }}
      >
        {chatInfo?.logoUrl ? (
          <img
            src={chatInfo.logoUrl}
            alt=""
            className="w-9 h-9 rounded-full object-contain bg-white p-1 flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <ChatIcon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-white text-sm font-medium">
            {chatInfo?.clinicName || "병원"}
          </div>
          <div className="text-white/80 text-xs">AI 상담 채널</div>
        </div>
        {isOpen !== null && (
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            isOpen ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {isOpen ? "● 상담 가능" : "● AI 상담 가능"}
          </div>
        )}
      </div>

      {/* 운영 상태 안내 */}
      {isOpen !== null && (
        <div className={`px-4 py-2 text-xs text-center flex-shrink-0 ${
          isOpen ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        }`}>
          {isOpen
            ? "현재 상담 직원 대기 중입니다. 편하게 질문해 주세요 😊"
            : "현재 담당 직원은 부재중입니다. AI가 답변 가능한 부분은 바로 답변드립니다. 증상 관련 문의는 운영시간 내 직원이 답변드립니다."}
        </div>
      )}

      {/* 면책 안내 */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 text-center flex-shrink-0 leading-snug">
        ⚠ {disclaimer}
      </div>

      {/* 데모 미리보기 안내 (챗봇 비활성 병원) */}
      {!chatbotEnabled && (
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 text-[11px] text-gray-600 text-center flex-shrink-0 leading-snug">
          🔒 이 챗봇은 홈페이지 디자인 미리보기입니다. 실제 도입 시 작동합니다.
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 overscroll-contain">
        {messages.map((msg) => {
          if (msg.isMenu) {
            return (
              <div key={msg.id} className="flex justify-start">
                <BotAvatar primary={theme.primary} topMargin />
                <div className="max-w-[78%] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
                  <div
                    className="text-white text-sm font-medium px-4 py-2.5"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {msg.menu.header}
                  </div>
                  <div className="flex flex-col">
                    {msg.menu.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(item.text)}
                        disabled={loading}
                        className="text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100 first:border-t-0 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
              {!msg.isUser && <BotAvatar primary={theme.primary} topMargin />}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                ${msg.isUser
                  ? "text-white rounded-tr-sm"
                  : msg.isStaff
                  ? "bg-blue-50 border border-blue-200 text-gray-800 rounded-tl-sm"
                  : msg.isEvent
                  ? "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"
                  : "bg-white text-gray-800 rounded-tl-sm"
                }`}
                style={msg.isUser ? { backgroundColor: theme.primary } : undefined}
              >
                {msg.isStaff && (
                  <div className="text-xs text-blue-500 font-medium mb-1">직원 답변</div>
                )}
                {msg.image && (
                  <a
                    href={msg.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={msg.image}
                      alt="이벤트 이미지 (클릭하면 원본 보기)"
                      className="rounded-xl mb-2 max-w-[560px] max-h-[448px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}
                <MessageText text={msg.text} isUser={msg.isUser} accent={theme.primary} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <BotAvatar primary={theme.primary} />
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-400 shadow-sm">
              입력 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div
        className="px-3 pt-3 flex gap-2 items-center bg-white flex-shrink-0"
        style={{
          // iPhone 홈인디케이터 회피 — viewport-fit=cover 와 짝.
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={
            chatbotEnabled
              ? "메시지를 입력하세요..."
              : "데모 미리보기 — 입력이 비활성화되어 있어요"
          }
          disabled={loading || !chatbotEnabled}
          // iOS 한글 채팅 입력에서 의도치 않은 자동 보정 차단.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          // iOS Safari/WebView 는 font-size < 16px input 에 focus 시 페이지를
          // 강제 zoom-in 한다. 인라인 16px 로 차단.
          style={{ fontSize: 16 }}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 outline-none focus:border-gray-400 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim() || !chatbotEnabled}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: theme.primary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
