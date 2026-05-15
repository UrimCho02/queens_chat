"use client";
import { useState, useRef, useEffect } from "react";
import PusherClient from "pusher-js";

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

function MessageText({ text, isUser }) {
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
                  style={{ color: isUser ? "rgba(255,255,255,0.9)" : "#C9A96E" }}
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
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef(null);
  const isOpen = chatInfo?.isOpen ?? null;
  const disclaimer = chatInfo?.disclaimer || DEFAULT_DISCLAIMER;
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
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        setChatInfo(data);
        const clinicName = data.clinicName || "병원";
        const greeting = {
          id: 1,
          text: `안녕하세요! ${clinicName} AI 상담 채널입니다. 👑\n진료시간, 예약, 비용 등 궁금하신 점을 편하게 물어보세요.\n\n※ 증상 관련 문의는 담당 직원이 확인 후 답변드립니다.`,
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
    if (!messageText || loading) return;
    setInput("");
    addMessage(messageText, true);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, sessionId }),
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
      addMessage("일시적인 오류가 발생했습니다. 전화로 문의해 주세요. 031-997-6700", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5EFE6]" style={{ maxHeight: "100dvh" }}>

      {/* 헤더 */}
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
          👑
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">더퀸즈여성의원</div>
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

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          if (msg.isMenu) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                  👑
                </div>
                <div className="max-w-[78%] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
                  <div className="bg-[#C9A96E] text-white text-sm font-medium px-4 py-2.5">
                    {msg.menu.header}
                  </div>
                  <div className="flex flex-col">
                    {msg.menu.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(item.text)}
                        disabled={loading}
                        className="text-left px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 active:bg-amber-100 border-t border-gray-100 first:border-t-0 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
              {!msg.isUser && (
                <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                  👑
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                ${msg.isUser
                  ? "bg-[#C9A96E] text-white rounded-tr-sm"
                  : msg.isStaff
                  ? "bg-blue-50 border border-blue-200 text-gray-800 rounded-tl-sm"
                  : msg.isEvent
                  ? "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"
                  : "bg-white text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.isStaff && (
                  <div className="text-xs text-blue-500 font-medium mb-1">직원 답변</div>
                )}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="이벤트 이미지"
                    className="rounded-xl mb-2 max-w-[260px] max-h-48 object-contain"
                  />
                )}
                <MessageText text={msg.text} isUser={msg.isUser} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-sm mr-2 flex-shrink-0">
              👑
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-400 shadow-sm">
              입력 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="px-3 py-3 flex gap-2 items-center bg-white flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#C9A96E] disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full bg-[#C9A96E] flex items-center justify-center disabled:opacity-50 flex-shrink-0 active:bg-[#b8965d]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}