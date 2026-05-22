"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HeaderIcon from "../HeaderIcon";

export default function FaqsManager({ initialFaqs, clinicName, logoUrl, isSuperadmin }) {
  const router = useRouter();
  const [faqs, setFaqs] = useState(initialFaqs);
  const [status, setStatus] = useState(null);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleAddNew = () => {
    const maxSort = faqs.reduce(
      (m, f) => Math.max(m, f.sort_order || 0),
      0
    );
    setFaqs((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        question: "",
        answer: "",
        sort_order: maxSort + 1,
        is_active: true,
        _isNew: true,
      },
    ]);
  };

  const handleSavedNew = (tempId, savedFaq) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === tempId ? savedFaq : f))
    );
    showStatus("success", "FAQ가 추가되었습니다.");
  };

  const handleUpdated = (id, updatedFaq) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? updatedFaq : f))
    );
    showStatus("success", "수정되었습니다.");
  };

  const handleDeleted = (id) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    showStatus("success", "삭제되었습니다.");
  };

  const handleError = (msg) => showStatus("error", msg);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 토스트 */}
      {status && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            status.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <span className="text-base">
            {status.type === "success" ? "✓" : "⚠"}
          </span>
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeaderIcon logoUrl={logoUrl} />
          <div>
            <div className="text-white text-sm font-medium">
              {clinicName || "병원"}
            </div>
            <div className="text-white/80 text-xs">FAQ 관리</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            ← 문의 목록
          </button>
          <button
            onClick={() => router.push("/admin/settings")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            ⚙ 설정
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

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3 pb-28">
        <div className="text-xs text-gray-500 px-1">
          여기서 추가한 FAQ는 챗봇이 시스템 프롬프트에서 참고합니다. "사용"
          체크된 항목만 챗봇에 반영됩니다. 순서가 작을수록 위에 표시됩니다.
        </div>

        {faqs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            아직 등록된 FAQ가 없습니다. 아래 [+ 새 FAQ 추가] 버튼으로
            시작하세요.
          </div>
        )}

        {faqs.map((faq) => (
          <FaqCard
            key={faq.id}
            faq={faq}
            onSavedNew={handleSavedNew}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onError={handleError}
          />
        ))}
      </div>

      {/* 하단 고정바: 추가 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button
            onClick={handleAddNew}
            className="bg-[#C9A96E] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#b8965d] active:bg-[#b8965d] cursor-pointer transition-colors"
          >
            + 새 FAQ 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqCard({ faq, onSavedNew, onUpdated, onDeleted, onError }) {
  const isNew = !!faq._isNew;
  const [question, setQuestion] = useState(faq.question || "");
  const [answer, setAnswer] = useState(faq.answer || "");
  const [sortOrder, setSortOrder] = useState(faq.sort_order ?? 0);
  const [isActive, setIsActive] = useState(faq.is_active !== false);
  const [busy, setBusy] = useState(false);

  const dirty =
    isNew ||
    question !== (faq.question || "") ||
    answer !== (faq.answer || "") ||
    sortOrder !== (faq.sort_order ?? 0) ||
    isActive !== (faq.is_active !== false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      onError("질문과 답변을 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    const body = {
      question: question.trim(),
      answer: answer.trim(),
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };
    try {
      const res = isNew
        ? await fetch("/api/clinic-faqs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/clinic-faqs/${faq.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.error || "저장 실패");
        return;
      }

      const saved = await res.json();
      if (isNew) {
        onSavedNew(faq.id, saved);
      } else {
        onUpdated(faq.id, saved);
      }
    } catch (e) {
      onError(e.message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 FAQ를 삭제하시겠습니까?")) return;
    if (isNew) {
      onDeleted(faq.id);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/clinic-faqs/${faq.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.error || "삭제 실패");
        return;
      }
      onDeleted(faq.id);
    } catch (e) {
      onError(e.message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-3 ${
        isNew ? "border-[#C9A96E]" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-gray-500 font-medium">순서</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#C9A96E]"
        />
        <label
          className={`px-3 py-1 rounded-full text-xs cursor-pointer border transition-colors ${
            isActive
              ? "bg-[#C9A96E] text-white border-[#C9A96E]"
              : "bg-white text-gray-500 border-gray-200"
          }`}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="hidden"
          />
          {isActive ? "사용" : "비활성"}
        </label>
        {isNew && (
          <span className="text-xs text-[#C9A96E] font-medium">새 항목</span>
        )}
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-gray-300 hover:text-red-500 cursor-pointer disabled:opacity-50 text-sm"
          title="삭제"
        >
          ✕ 삭제
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500 font-medium">질문</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="예: 진료시간이 어떻게 되나요?"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#C9A96E] resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500 font-medium">답변</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          placeholder="예: 평일 10:00-19:00, 토요일 09:00-14:00입니다."
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#C9A96E] resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!dirty || busy}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
            dirty && !busy
              ? "bg-[#C9A96E] text-white hover:bg-[#b8965d] cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {busy ? "저장 중..." : isNew ? "저장" : "수정 저장"}
        </button>
      </div>
    </div>
  );
}
