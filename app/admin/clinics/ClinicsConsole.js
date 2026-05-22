"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HeaderIcon from "../HeaderIcon";

const TEMPLATE_LABELS = {
  classic: "클래식",
  modern: "모던",
  soft: "소프트",
};

export default function ClinicsConsole({ clinics }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // 병원 선택 → 쿠키 설정 후 해당 병원 어드민으로 진입.
  const manageClinic = async (clinic) => {
    setBusyId(clinic.id);
    setError(null);
    try {
      const res = await fetch("/api/select-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: clinic.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "병원 선택에 실패했습니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e.message || "네트워크 오류");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-xl shadow-lg bg-red-500 text-white flex items-center gap-2">
          <span className="text-base">⚠</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeaderIcon />
          <div>
            <div className="text-white text-sm font-medium">ClinicTalk 운영</div>
            <div className="text-white/80 text-xs">병원 목록</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin/onboarding")}
            className="bg-white text-[#C9A96E] text-xs px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors cursor-pointer font-medium"
          >
            + 병원 등록
          </button>
          <button
            onClick={handleLogout}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3 pb-12">
        <div className="text-xs text-gray-500 px-1">
          관리할 병원을 선택하세요. [관리]를 누르면 해당 병원의 어드민으로
          이동합니다. 운영 콘솔로 돌아오려면 어드민 헤더의 [병원 전환]을
          누르세요.
        </div>

        {clinics.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            아직 등록된 병원이 없습니다. [+ 병원 등록]으로 시작하세요.
          </div>
        )}

        {clinics.map((clinic) => (
          <div
            key={clinic.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-800 truncate">
                  {clinic.name}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  /{clinic.slug}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                <Badge className="bg-gray-100 text-gray-600">
                  {TEMPLATE_LABELS[clinic.template] || clinic.template}
                </Badge>
                <Badge
                  className={
                    clinic.chatbot_enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }
                >
                  챗봇 {clinic.chatbot_enabled ? "ON" : "OFF"}
                </Badge>
                {!clinic.is_active && (
                  <Badge className="bg-red-100 text-red-600">비활성</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => manageClinic(clinic)}
                disabled={busyId === clinic.id}
                className="bg-[#C9A96E] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#b8965d] disabled:opacity-60 cursor-pointer transition-colors"
              >
                {busyId === clinic.id ? "이동 중..." : "관리"}
              </button>
              <a
                href={`/${clinic.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-500 hover:text-[#C9A96E] underline"
              >
                홈페이지
              </a>
              <a
                href={`/?clinic=${clinic.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-500 hover:text-[#C9A96E] underline"
              >
                챗봇
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ className, children }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}
