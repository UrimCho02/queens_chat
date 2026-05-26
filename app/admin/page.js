"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PusherClient from "pusher-js";
import { createClient } from "@/lib/supabase/client";
import HeaderIcon from "./HeaderIcon";

const CATEGORIES = ["전체", "예약/진료시간", "비용문의", "여성성형", "피부과", "증상문의", "수술회복", "기타"];

const CATEGORY_STYLE = {
  "예약/진료시간": "bg-blue-100 text-blue-700",
  "비용문의": "bg-purple-100 text-purple-700",
  "여성성형": "bg-pink-100 text-pink-700",
  "피부과": "bg-green-100 text-green-700",
  "증상문의": "bg-amber-100 text-amber-700",
  "수술회복": "bg-teal-100 text-teal-700",
  "기타": "bg-gray-100 text-gray-600",
};

// DB row → 화면용 객체
function mapInquiry(i) {
  return {
    id: i.id,
    sessionId: i.session_id,
    userMessage: i.user_message,
    aiDraft: i.ai_draft,
    category: i.category,
    isStaffRequired: i.is_staff_required,
    status: i.status,
    finalReply: i.final_reply,
    timestamp: i.created_at,
  };
}

export default function AdminPage() {
  const router = useRouter();
  // pending = 처리할 문의(미처리 직원확인, 전량) / recent = 전체 문의(페이지 단위)
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editTexts, setEditTexts] = useState({});
  const [activeTab, setActiveTab] = useState("staff");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const loadInquiries = async () => {
      const res = await fetch("/api/inquiries");
      const data = await res.json();
      // superadmin 이 병원을 아직 안 골랐으면 운영 콘솔로.
      if (data.role === "superadmin" && !data.clinicName) {
        router.replace("/admin/clinics");
        return;
      }
      const pendingMapped = (data.pending || []).map(mapInquiry);
      const recentMapped = (data.recent || []).map(mapInquiry);
      setPending(pendingMapped);
      setRecent(recentMapped);
      setRecentHasMore(!!data.recentHasMore);

      const edits = {};
      [...pendingMapped, ...recentMapped].forEach((i) => { edits[i.id] = i.aiDraft; });
      setEditTexts(edits);

      setTodayCount(data.todayCount || 0);
      setTotalCount(data.totalCount || 0);
      setDailyLimit(data.dailyLimit || 20);
      setIsSuperadmin(data.role === "superadmin");
      setClinicName(data.clinicName || "");
      setLogoUrl(data.logoUrl || null);
    };
    loadInquiries();
  }, [router]);

  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe("admin-channel");
    channel.bind("new-inquiry", (data) => {
      const id = data.id || Date.now();
      const item = { ...data, id, status: "pending" };
      setRecent((prev) => [item, ...prev]);
      // 직원 확인 필요 건이면 처리할 문의 목록에도 추가
      if (item.isStaffRequired) setPending((prev) => [item, ...prev]);
      setEditTexts((prev) => ({ ...prev, [id]: data.aiDraft }));
      setTodayCount((prev) => prev + 1);
      setTotalCount((prev) => prev + 1);
    });
    return () => pusher.disconnect();
  }, []);

  // 전체 문의 탭 — 다음 페이지 추가 로드
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/inquiries?offset=${recent.length}`);
      const data = await res.json();
      const more = (data.recent || []).map(mapInquiry);
      setRecent((prev) => [...prev, ...more]);
      setRecentHasMore(!!data.recentHasMore);
      setEditTexts((prev) => {
        const next = { ...prev };
        more.forEach((i) => { if (!(i.id in next)) next[i.id] = i.aiDraft; });
        return next;
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const sendReply = async (inquiry, text) => {
    await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: inquiry.sessionId, reply: text, inquiryId: inquiry.id }),
    });
    setRecent((prev) =>
      prev.map((i) => i.id === inquiry.id ? { ...i, status: "replied", finalReply: text } : i)
    );
    // 처리 완료 → 처리할 문의 목록에서 제거 (탭이 비워짐)
    setPending((prev) => prev.filter((i) => i.id !== inquiry.id));
  };

  const deleteInquiry = async (inquiry) => {
    await fetch("/api/inquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inquiry.id }),
    });
    setRecent((prev) => prev.filter((i) => i.id !== inquiry.id));
    setPending((prev) => prev.filter((i) => i.id !== inquiry.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${month}/${day} ${time}`;
  };

  // 탭별 소스 — staff: 처리할 문의(이미 미처리만) / all: 전체 문의(페이지)
  const tabSource = activeTab === "staff" ? pending : recent;
  const displayInquiries = activeCategory === "전체"
    ? tabSource
    : tabSource.filter((i) => i.category === activeCategory);

  const pendingCount = pending.length;

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === "전체"
      ? tabSource.length
      : tabSource.filter((i) => i.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 헤더 */}
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeaderIcon logoUrl={logoUrl} />
          <div>
            <div className="text-white text-sm font-medium">
              {clinicName || "병원"}
            </div>
            <div className="text-white/80 text-xs">직원 관리 페이지</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
            오늘 {todayCount}/{dailyLimit}건
          </div>
          <div className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
            전체 {totalCount}건
          </div>
          <button
            onClick={() => router.push("/admin/settings")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            ⚙ 설정
          </button>
          <button
            onClick={() => router.push("/admin/faqs")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            FAQ
          </button>
          <button
            onClick={() => router.push("/admin/doctors")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            의료진
          </button>
          <button
            onClick={() => router.push("/admin/recovery-guides")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            회복가이드
          </button>
          <button
            onClick={() => router.push("/admin/logs")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            변경이력
          </button>
          {isSuperadmin && (
            <button
              onClick={() => router.push("/admin/clinics")}
              className="bg-white text-[#C9A96E] text-xs px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors cursor-pointer font-medium"
            >
              병원 전환
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto sticky top-[52px] z-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-[#C9A96E] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {cat}
            {categoryCounts[cat] > 0 && (
              <span className={`ml-1 ${activeCategory === cat ? "text-white/80" : "text-gray-400"}`}>
                {categoryCounts[cat]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[93px] z-10">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === "staff" ? "border-[#C9A96E] text-[#C9A96E]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          처리할 문의
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === "all" ? "border-[#C9A96E] text-[#C9A96E]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          전체 문의
          <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-1.5 py-0.5">
            {totalCount}
          </span>
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* 문의 없을 때 */}
        {displayInquiries.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">{activeTab === "staff" ? "✅" : "💬"}</div>
            <div className="text-sm">
              {activeTab === "staff" ? "처리할 문의가 없습니다"
                : activeCategory !== "전체" ? `${activeCategory} 문의가 없습니다`
                : "아직 문의가 없습니다"}
            </div>
          </div>
        )}

        {/* 문의 목록 */}
        <div className="flex flex-col gap-4">
          {displayInquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${
                inquiry.status === "replied" ? "border-green-200"
                : inquiry.isStaffRequired ? "border-amber-300"
                : "border-gray-100"
              }`}
            >
              {/* 문의 헤더 */}
              <div className={`px-4 py-2.5 flex items-center justify-between ${
                inquiry.isStaffRequired ? "bg-amber-50" : "bg-gray-50"
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {inquiry.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_STYLE[inquiry.category] || "bg-gray-100 text-gray-600"
                    }`}>
                      {inquiry.category}
                    </span>
                  )}
                  {inquiry.isStaffRequired && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      직원 확인 필요
                    </span>
                  )}
                  <span className="text-xs text-gray-400">#{inquiry.sessionId}</span>
                </div>
                <div className="flex items-center gap-2">
                  {inquiry.status === "replied" && (
                    <span className="text-xs text-green-500 font-medium">✓ 완료</span>
                  )}
                  <span className="text-xs text-gray-400">{formatTime(inquiry.timestamp)}</span>
                  <button
                    onClick={() => deleteInquiry(inquiry)}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-3">
                {/* 고객 문의 */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">고객 문의</div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-800 leading-relaxed">
                    {inquiry.userMessage}
                  </div>
                </div>

                {/* 일반 문의 — AI 자동 답변 */}
                {!inquiry.isStaffRequired && (
                  <div>
                    <div className="text-xs text-blue-400 mb-1">AI 자동 답변</div>
                    <div className="bg-blue-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
                      {inquiry.aiDraft}
                    </div>
                  </div>
                )}

                {/* 직원 확인 필요 — 편집 가능한 초안 */}
                {inquiry.isStaffRequired && inquiry.status !== "replied" && (
                  <div>
                    <div className="text-xs text-amber-500 mb-1">AI 초안 (수정 후 발송)</div>
                    <textarea
                      value={editTexts[inquiry.id] || ""}
                      onChange={(e) =>
                        setEditTexts((prev) => ({ ...prev, [inquiry.id]: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-none outline-none focus:border-[#C9A96E]"
                      rows={4}
                    />
                  </div>
                )}

                {/* 발송 완료 */}
                {inquiry.isStaffRequired && inquiry.status === "replied" && (
                  <div>
                    <div className="text-xs text-green-500 mb-1">✓ 발송 완료</div>
                    <div className="bg-green-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
                      {inquiry.finalReply}
                    </div>
                  </div>
                )}

                {/* 발송 버튼 */}
                {inquiry.isStaffRequired && inquiry.status !== "replied" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReply(inquiry, editTexts[inquiry.id])}
                      className="flex-1 bg-[#C9A96E] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b8965d] active:bg-[#b8965d] cursor-pointer transition-colors"
                    >
                      발송
                    </button>
                    <button
                      onClick={() =>
                        setEditTexts((prev) => ({ ...prev, [inquiry.id]: inquiry.aiDraft }))
                      }
                      className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-200 cursor-pointer transition-colors"
                    >
                      초안 복원
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 전체 문의 탭 — 더 보기 */}
        {activeTab === "all" && recentHasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-white border border-gray-200 text-gray-600 rounded-xl px-6 py-2.5 text-sm font-medium hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
