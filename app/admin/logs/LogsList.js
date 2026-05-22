"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { diffJsonb } from "@/lib/utils/diffJsonb";
import HeaderIcon from "../HeaderIcon";

const TABLE_LABELS = {
  clinics: "병원 정보",
  clinic_settings: "병원 설정",
  clinic_faqs: "FAQ",
  clinic_recovery_guides: "회복 가이드",
};

const ACTION_LABELS = {
  create: "추가",
  update: "수정",
  delete: "삭제",
};

const ACTION_STYLES = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

function formatTime(iso) {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const time = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${month}/${day} ${time}`;
}

export default function LogsList({ initialLogs, clinicName, logoUrl }) {
  const router = useRouter();
  const [logs] = useState(initialLogs);
  const [openIds, setOpenIds] = useState(() => new Set());

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <HeaderIcon logoUrl={logoUrl} />
          <div>
            <div className="text-white text-sm font-medium">
              {clinicName || "병원"}
            </div>
            <div className="text-white/80 text-xs">변경 이력</div>
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
            onClick={handleLogout}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto flex flex-col gap-2">
        <div className="text-xs text-gray-500 px-1">
          어드민 페이지에서 한 변경이 시간 역순으로 표시됩니다. 행을 클릭하면
          상세 변경 내용이 펼쳐집니다. 최근 50건까지.
        </div>

        {logs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            아직 변경 이력이 없습니다.
          </div>
        )}

        {logs.map((log) => {
          const isOpen = openIds.has(log.id);
          const diff = diffJsonb(log.before, log.after);
          return (
            <div
              key={log.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => toggleOpen(log.id)}
                className="w-full px-4 py-3 flex items-center gap-2 flex-wrap text-left hover:bg-gray-50 cursor-pointer"
              >
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                  {formatTime(log.created_at)}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    ACTION_STYLES[log.action] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="text-xs text-gray-700 font-medium">
                  {TABLE_LABELS[log.table_name] || log.table_name}
                </span>
                <span className="text-xs text-gray-500">
                  {log.changed_by_email || "(삭제된 계정)"}
                </span>
                <div className="flex-1" />
                <span className="text-xs text-gray-300">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {diff.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">
                      변경 내용 없음
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {diff.map((d) => (
                        <div key={d.field} className="flex flex-col gap-1">
                          <div className="text-xs text-gray-500 font-mono">
                            {d.field}
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <ValueBox value={d.before} variant="before" />
                            <span className="text-gray-400 mt-1.5">→</span>
                            <ValueBox value={d.after} variant="after" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValueBox({ value, variant }) {
  const style =
    variant === "before"
      ? "bg-red-50 border-red-100 text-red-900"
      : "bg-green-50 border-green-100 text-green-900";

  if (value === undefined) {
    return (
      <div className="flex-1 italic text-gray-300 text-xs px-3 py-1.5">
        (없음)
      </div>
    );
  }

  let content;
  if (value === null) {
    content = <em className="text-gray-400">null</em>;
  } else if (typeof value === "string") {
    content = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    content = String(value);
  } else {
    content = (
      <pre className="whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <div
      className={`flex-1 border rounded-lg px-3 py-1.5 text-xs leading-relaxed break-words ${style}`}
    >
      {content}
    </div>
  );
}
