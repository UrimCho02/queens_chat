"use client";
import { useState, useRef, useEffect } from "react";
import PusherClient from "pusher-js";

const QUICK_BUTTONS = [
  { label: "진료시간", text: "진료시간이 어떻게 되나요?" },
  { label: "예약 방법", text: "예약은 어떻게 하나요?" },
  { label: "여성성형 상담", text: "여성성형 상담을 받고 싶어요." },
  { label: "주차 안내", text: "주차 가능한가요?" },
  { label: "피부과 진료", text: "피부과 진료도 가능한가요?" },
];

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(null);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        setIsOpen(data.isOpen);
        setMessages([{
          id: 1,
          text: "안녕하세요! 더퀸즈여성의원 AI 상담 채널입니다. 👑\n진료시간, 예약, 비용 등 궁금하신 점을 편하게 물어보세요.\n\n※ 증상 관련 문의는 담당 직원이 확인 후 답변드립니다.",
          isUser: false,
          isStaff: false,
        }]);
      });

    // Pusher 구독 — 직원 답변 수신
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`client-${sessionId}`);
    channel.bind("staff-reply", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: data.reply,
          isUser: false,
          isStaff: true,
        },
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
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center gap-3 flex-shrink-0 safe-top">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
          👑
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">더퀸즈여성의원</div>
          <div className="text-white/80 text-xs">AI 상담 채널</div>
        </div>
        {isOpen !== null && (
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
          }`}>
            {isOpen ? "● 상담 가능" : "● 운영 종료"}
          </div>
        )}
      </div>

      {/* 운영 상태 안내 */}
      {isOpen !== null && (
        <div className={`px-4 py-2 text-xs text-center flex-shrink-0 ${
          isOpen ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
        }`}>
          {isOpen
            ? "현재 상담 직원 대기 중입니다. 편하게 질문해 주세요 😊"
            : "현재 운영시간 외입니다. 문의 남겨주시면 운영시간 내 답변드립니다."}
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
            {!msg.isUser && (
              <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                👑
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm
              ${msg.isUser
                ? "bg-[#C9A96E] text-white rounded-tr-sm"
                : msg.isStaff
                ? "bg-blue-50 border border-blue-200 text-gray-800 rounded-tl-sm"
                : "bg-white text-gray-800 rounded-tl-sm"
              }`}
            >
              {msg.isStaff && (
                <div className="text-xs text-blue-500 font-medium mb-1">직원 답변</div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

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

      {/* 빠른 버튼 */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0 bg-white border-t border-gray-100">
        {QUICK_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => sendMessage(btn.text)}
            disabled={loading}
            className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50 active:bg-amber-200"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 입력창 */}
      <div className="px-3 py-3 flex gap-2 items-center bg-white flex-shrink-0 safe-bottom">
        <input
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