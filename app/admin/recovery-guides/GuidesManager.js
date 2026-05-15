"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GuidesManager({ initialGuides, clinicName }) {
  const router = useRouter();
  const [guides, setGuides] = useState(initialGuides);
  const [status, setStatus] = useState(null);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleAddNew = () => {
    const maxSort = guides.reduce(
      (m, g) => Math.max(m, g.sort_order || 0),
      0
    );
    setGuides((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        description: "",
        items: [],
        sort_order: maxSort + 10,
        is_active: true,
        _isNew: true,
      },
    ]);
  };

  const handleSavedNew = (tempId, saved) => {
    setGuides((prev) => prev.map((g) => (g.id === tempId ? saved : g)));
    showStatus("success", "가이드가 추가되었습니다.");
  };
  const handleUpdated = (id, updated) => {
    setGuides((prev) => prev.map((g) => (g.id === id ? updated : g)));
    showStatus("success", "수정되었습니다.");
  };
  const handleDeleted = (id) => {
    setGuides((prev) => prev.filter((g) => g.id !== id));
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

      <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <div>
            <div className="text-white text-sm font-medium">
              {clinicName || "병원"}
            </div>
            <div className="text-white/80 text-xs">수술 후 회복 가이드</div>
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
            onClick={() => router.push("/admin/faqs")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            FAQ
          </button>
          <button
            onClick={handleLogout}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3 pb-28">
        <div className="text-xs text-gray-500 px-1 leading-relaxed">
          여기서 등록한 수술별 회복 가이드는 챗봇이 시스템 프롬프트에서 참고합니다.
          "사용" 체크된 가이드만 챗봇에 반영됩니다. 챗봇은 의학적 판단 없이
          등록된 내용을 그대로 안내하며, 가이드에 없는 일자 또는 증상 동반
          질문은 자동으로 직원 확인으로 전환됩니다.
        </div>

        {guides.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            아직 등록된 가이드가 없습니다. 아래 [+ 새 가이드 추가] 버튼으로
            시작하세요.
          </div>
        )}

        {guides.map((guide) => (
          <GuideCard
            key={guide.id}
            guide={guide}
            onSavedNew={handleSavedNew}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onError={handleError}
          />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button
            onClick={handleAddNew}
            className="bg-[#C9A96E] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#b8965d] active:bg-[#b8965d] cursor-pointer transition-colors"
          >
            + 새 가이드 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideCard({ guide, onSavedNew, onUpdated, onDeleted, onError }) {
  const isNew = !!guide._isNew;
  const [name, setName] = useState(guide.name || "");
  const [description, setDescription] = useState(guide.description || "");
  const [items, setItems] = useState(
    Array.isArray(guide.items)
      ? guide.items.map((it) => ({
          day_from: it?.day_from ?? "",
          day_to: it?.day_to ?? "",
          title: it?.title || "",
          content: it?.content || "",
        }))
      : []
  );
  const [sortOrder, setSortOrder] = useState(guide.sort_order ?? 0);
  const [isActive, setIsActive] = useState(guide.is_active !== false);
  const [busy, setBusy] = useState(false);

  const initial = {
    name: guide.name || "",
    description: guide.description || "",
    items: Array.isArray(guide.items) ? guide.items : [],
    sort_order: guide.sort_order ?? 0,
    is_active: guide.is_active !== false,
  };
  const current = {
    name,
    description,
    items,
    sort_order: Number(sortOrder) || 0,
    is_active: isActive,
  };
  const dirty =
    isNew || JSON.stringify(initial) !== JSON.stringify(current);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { day_from: "", day_to: "", title: "", content: "" },
    ]);
  };
  const updateItem = (idx, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  };
  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      onError("수술명을 입력해 주세요.");
      return;
    }
    const cleanedItems = items
      .map((it) => ({
        day_from: Number.parseInt(it.day_from, 10),
        day_to:
          it.day_to === "" || it.day_to === null
            ? null
            : Number.parseInt(it.day_to, 10),
        title: (it.title || "").trim(),
        content: (it.content || "").trim(),
      }))
      .filter(
        (it) =>
          Number.isFinite(it.day_from) && it.title
      );

    setBusy(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      items: cleanedItems,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };
    try {
      const res = isNew
        ? await fetch("/api/recovery-guides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/recovery-guides/${guide.id}`, {
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
        onSavedNew(guide.id, saved);
      } else {
        onUpdated(guide.id, saved);
      }
    } catch (e) {
      onError(e.message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 가이드를 삭제하시겠습니까?")) return;
    if (isNew) {
      onDeleted(guide.id);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/recovery-guides/${guide.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(err.error || "삭제 실패");
        return;
      }
      onDeleted(guide.id);
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
        <label className="text-xs text-gray-500 font-medium">수술명</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 자궁근종 수술"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A96E]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500 font-medium">
          설명 (선택)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="예: 복강경 자궁근종 절제술 기준 회복 일정. 환자 컨디션에 따라 차이가 있을 수 있음."
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#C9A96E] resize-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 font-medium">일정 항목</label>
        <div className="text-xs text-gray-400">
          종료일은 비워두면 단일일, 채우면 범위 (예: 2~3일차).
        </div>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                value={item.day_from}
                onChange={(e) => updateItem(idx, "day_from", e.target.value)}
                placeholder="시작일"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#C9A96E]"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="number"
                value={item.day_to}
                onChange={(e) => updateItem(idx, "day_to", e.target.value)}
                placeholder="종료일"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#C9A96E]"
              />
              <span className="text-xs text-gray-500">일차</span>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(idx, "title", e.target.value)}
                placeholder="제목 (예: 가벼운 보행)"
                className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#C9A96E]"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-gray-300 hover:text-red-500 cursor-pointer px-1"
                title="삭제"
              >
                ✕
              </button>
            </div>
            <textarea
              value={item.content}
              onChange={(e) => updateItem(idx, "content", e.target.value)}
              rows={2}
              placeholder="상세 안내 (예: 실내 보행 가능, 무리한 활동 금지)"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm leading-relaxed outline-none focus:border-[#C9A96E] resize-none"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="self-start text-xs text-[#C9A96E] hover:underline cursor-pointer mt-1"
        >
          + 일정 추가
        </button>
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
