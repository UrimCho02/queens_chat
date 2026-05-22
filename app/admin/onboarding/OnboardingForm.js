"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HeaderIcon from "../HeaderIcon";

const TEMPLATES = [
  { key: "classic", label: "클래식 (골드, 우아함)" },
  { key: "modern", label: "모던 (화이트+블루, 카드형)" },
  { key: "soft", label: "소프트 (파스텔 민트, 친근함)" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    slogan: "",
    booking_url: "",
    template: "classic",
    chatbot_enabled: true,
    staff_email: "",
    staff_password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) return setError("병원명을 입력해 주세요.");
    if (!form.slug.trim()) return setError("URL 식별자(slug)를 입력해 주세요.");
    if (!form.staff_email.trim())
      return setError("직원 로그인 이메일을 입력해 주세요.");
    if (form.staff_password.length < 8)
      return setError("직원 임시 비밀번호는 8자 이상이어야 합니다.");

    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "병원 등록에 실패했습니다.");
        return;
      }
      setResult({ ...data, staff_password: form.staff_password });
    } catch (e) {
      setError(e.message || "네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  // ── 등록 완료 화면 ─────────────────────────────────────────────
  if (result) {
    const slug = result.clinic.slug;
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={handleLogout} router={router} />
        <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3 pb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div className="text-lg font-semibold text-gray-800">
                {result.clinic.name} 등록 완료
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <Row label="홈페이지">
                <a
                  href={`/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#C9A96E] underline break-all"
                >
                  /{slug}
                </a>
              </Row>
              <Row label="챗봇">
                <a
                  href={`/?clinic=${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#C9A96E] underline break-all"
                >
                  /?clinic={slug}
                </a>
              </Row>
              <Row label="직원 로그인 ID">
                <span className="text-gray-800">{result.staffEmail}</span>
              </Row>
              <Row label="임시 비밀번호">
                <span className="text-gray-800 font-mono">
                  {result.staff_password}
                </span>
              </Row>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              위 로그인 ID·임시 비밀번호를 병원 직원에게 전달하세요. 직원은
              <span className="font-medium"> /login </span>에서 로그인 후
              <span className="font-medium"> /admin/settings </span>에서 진료시간·
              FAQ 등 세부 정보를 입력하면 됩니다. 보안을 위해 첫 로그인 후
              비밀번호 변경을 안내해 주세요.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setResult(null);
                  setForm({
                    name: "",
                    slug: "",
                    phone: "",
                    address: "",
                    slogan: "",
                    booking_url: "",
                    template: "classic",
                    chatbot_enabled: true,
                    staff_email: "",
                    staff_password: "",
                  });
                }}
                className="bg-[#C9A96E] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[#b8965d] cursor-pointer transition-colors"
              >
                + 병원 추가 등록
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="bg-gray-100 text-gray-600 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-gray-200 cursor-pointer transition-colors"
              >
                문의 목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 입력 폼 화면 ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={handleLogout} router={router} />

      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-xl shadow-lg bg-red-500 text-white flex items-center gap-2">
          <span className="text-base">⚠</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4 pb-12">
        <div className="text-xs text-gray-500 px-1">
          새 병원을 등록하면 홈페이지·챗봇·어드민이 한 번에 생성되고, 입력한
          이메일로 직원 로그인 계정이 만들어집니다.
        </div>

        {/* 병원 정보 */}
        <Section title="병원 정보">
          <Field label="병원명" required>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="예: 더퀸즈여성의원"
              className={inputCls}
            />
          </Field>
          <Field
            label="URL 식별자 (slug)"
            required
            hint="영문 소문자·숫자·하이픈만. 홈페이지 주소가 됩니다. 예: thequeens → /thequeens"
          >
            <input
              value={form.slug}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  slug: e.target.value.toLowerCase().replace(/\s/g, ""),
                }))
              }
              placeholder="thequeens"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="전화번호">
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="예: 031-997-6700"
              className={inputCls}
            />
          </Field>
          <Field label="주소">
            <input
              value={form.address}
              onChange={set("address")}
              placeholder="예: 경기도 OO시 OO로 123, 4층"
              className={inputCls}
            />
          </Field>
          <Field label="슬로건">
            <input
              value={form.slogan}
              onChange={set("slogan")}
              placeholder="예: 여성의 건강한 삶, 가까이에서 함께합니다"
              className={inputCls}
            />
          </Field>
          <Field label="예약 URL" hint="네이버 예약 등 외부 예약 페이지 주소">
            <input
              value={form.booking_url}
              onChange={set("booking_url")}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
        </Section>

        {/* 홈페이지 / 챗봇 */}
        <Section title="홈페이지 · 챗봇">
          <Field label="홈페이지 템플릿">
            <select
              value={form.template}
              onChange={set("template")}
              className={inputCls}
            >
              {TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.chatbot_enabled}
              onChange={set("chatbot_enabled")}
              className="mt-0.5 accent-[#C9A96E] w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              챗봇 사용
              <span className="block text-xs text-gray-400 mt-0.5">
                현재 챗봇은 산부인과 전용입니다. 산부인과가 아니면 체크를
                해제하세요 (홈페이지만 사용, 챗봇 위젯은 입력 잠금).
              </span>
            </span>
          </label>
        </Section>

        {/* 직원 계정 */}
        <Section title="직원 로그인 계정">
          <Field label="직원 이메일" required hint="이 이메일이 어드민 로그인 ID가 됩니다.">
            <input
              type="email"
              value={form.staff_email}
              onChange={set("staff_email")}
              placeholder="staff@clinic.com"
              className={inputCls}
            />
          </Field>
          <Field
            label="임시 비밀번호"
            required
            hint="8자 이상. 직원에게 전달 후 첫 로그인 시 변경 안내."
          >
            <input
              type="text"
              value={form.staff_password}
              onChange={set("staff_password")}
              placeholder="8자 이상"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </Section>

        <button
          onClick={handleSubmit}
          disabled={busy}
          className={`rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
            busy
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#C9A96E] text-white hover:bg-[#b8965d] cursor-pointer"
          }`}
        >
          {busy ? "등록 중..." : "병원 등록"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A96E]";

function Header({ onLogout, router }) {
  return (
    <div className="bg-[#C9A96E] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <HeaderIcon />
        <div>
          <div className="text-white text-sm font-medium">ClinicTalk 운영</div>
          <div className="text-white/80 text-xs">신규 병원 등록</div>
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
          onClick={onLogout}
          className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500 font-medium">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}
