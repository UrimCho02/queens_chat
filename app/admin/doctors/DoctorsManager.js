"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DoctorsManager({ initialImages, clinicName }) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages || []);
  const [savedImages, setSavedImages] = useState(initialImages || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const dirty = JSON.stringify(images) !== JSON.stringify(savedImages);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", "doctor");
        const res = await fetch("/api/clinic-assets/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "이미지 업로드 실패");
        }
        const { url } = await res.json();
        uploaded.push(url);
      }
      setImages((prev) => [...prev, ...uploaded]);
      showStatus(
        "success",
        `이미지 ${uploaded.length}장 추가됨. [저장]을 눌러 반영하세요.`
      );
    } catch (err) {
      showStatus("error", err.message || "이미지 업로드 중 오류");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const moveImage = (idx, delta) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/clinic-doctors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_images: images }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showStatus("error", err.error || "저장 실패");
        return;
      }
      setSavedImages(images);
      showStatus("success", "저장되었습니다.");
    } catch (err) {
      showStatus("error", err.message || "네트워크 오류");
    } finally {
      setSaving(false);
    }
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
            <div className="text-white/80 text-xs">의료진 소개</div>
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
          여기에 등록한 의료진 소개 이미지가 병원 홈페이지의 "의료진 소개"
          섹션에 표시됩니다. 의료진 사진·이름·이력이 함께 들어간 이미지(네이버
          플레이스의 의료진 소개 이미지 등)를 의료진 한 분당 한 장씩 올리시면
          됩니다. ←/→ 로 노출 순서를 바꿀 수 있습니다. jpg / png / webp, 각 2MB
          이하. 한 번에 여러 장 선택 가능.
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
          <label className="text-sm text-gray-700 font-medium">
            의료진 소개 이미지
          </label>

          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="bg-white border border-gray-200 rounded-xl p-2 flex flex-col gap-2"
                >
                  <img
                    src={url}
                    alt={`의료진 ${idx + 1}`}
                    className="w-full max-h-80 object-contain rounded-lg"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        className="px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="앞으로"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        className="px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="뒤로"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                      title="삭제"
                    >
                      ✕ 제거
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-1 text-gray-400 text-sm">
              <span className="text-3xl">👥</span>
              <span>등록된 의료진 이미지가 없습니다.</span>
            </div>
          )}

          <label className="self-start cursor-pointer bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 hover:border-[#C9A96E] transition-colors">
            {uploading ? "업로드 중..." : "+ 이미지 추가"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {images.length === 0 && savedImages.length > 0 && (
            <div className="text-xs text-amber-700">
              이미지를 모두 제거했습니다. [저장]을 눌러야 홈페이지에 반영됩니다.
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button
            onClick={handleSave}
            disabled={!dirty || saving || uploading}
            className={`rounded-xl px-8 py-2.5 text-sm font-medium transition-colors ${
              dirty && !saving && !uploading
                ? "bg-[#C9A96E] text-white hover:bg-[#b8965d] cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
