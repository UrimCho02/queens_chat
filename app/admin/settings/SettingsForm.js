"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAY_OPTIONS = [
  { code: "sun", label: "일" },
  { code: "mon", label: "월" },
  { code: "tue", label: "화" },
  { code: "wed", label: "수" },
  { code: "thu", label: "목" },
  { code: "fri", label: "금" },
  { code: "sat", label: "토" },
  { code: "holiday", label: "공휴일" },
];

function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  return (arr || []).join("\n");
}

export default function SettingsForm({ initial }) {
  const router = useRouter();
  const s = initial.settings || {};
  const hours = s.hours || {};

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [slogan, setSlogan] = useState(initial.slogan);
  const [bookingUrl, setBookingUrl] = useState(initial.booking_url);

  const [weekdayHours, setWeekdayHours] = useState(hours.weekday || "");
  const [lunchHours, setLunchHours] = useState(hours.lunch || "");
  const [saturdayHours, setSaturdayHours] = useState(hours.saturday || "");
  const [closedDays, setClosedDays] = useState(hours.closed || []);

  const [doctorsSummary, setDoctorsSummary] = useState(s.doctors_summary || "");
  const [parking, setParking] = useState(s.parking || "");
  const [reservationNote, setReservationNote] = useState(s.reservation_note || "");

  const [departments, setDepartments] = useState(arrayToLines(s.departments));
  const [services, setServices] = useState(arrayToLines(s.services));
  const [features, setFeatures] = useState(arrayToLines(s.features));

  const [tone, setTone] = useState(s.tone === "formal" ? "formal" : "warm");
  const [hoursNotes, setHoursNotes] = useState(
    Array.isArray(s.hours_notes)
      ? s.hours_notes.map((n) => ({
          text: n?.text || "",
          enabled: !!n?.enabled,
        }))
      : []
  );
  const [substituteHolidayPolicy, setSubstituteHolidayPolicy] = useState(
    s.substitute_holiday_policy || ""
  );
  const [currentEvent, setCurrentEvent] = useState(s.current_event || "");
  const [disclaimer, setDisclaimer] = useState(s.disclaimer || "");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const toggleClosedDay = (code) => {
    setClosedDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  const updateHoursNote = (idx, field, value) => {
    setHoursNotes((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n))
    );
  };
  const addHoursNote = () => {
    setHoursNotes((prev) => [...prev, { text: "", enabled: true }]);
  };
  const removeHoursNote = (idx) => {
    setHoursNotes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    const cleanedHoursNotes = hoursNotes
      .map((n) => ({ text: n.text.trim(), enabled: !!n.enabled }))
      .filter((n) => n.text);

    const newSettings = {
      tone,
      hours: {
        ...(weekdayHours && { weekday: weekdayHours }),
        ...(lunchHours && { lunch: lunchHours }),
        ...(saturdayHours && { saturday: saturdayHours }),
        ...(closedDays.length && { closed: closedDays }),
      },
      ...(doctorsSummary && { doctors_summary: doctorsSummary }),
      ...(parking && { parking }),
      ...(reservationNote && { reservation_note: reservationNote }),
      ...(linesToArray(departments).length && {
        departments: linesToArray(departments),
      }),
      ...(linesToArray(services).length && {
        services: linesToArray(services),
      }),
      ...(linesToArray(features).length && {
        features: linesToArray(features),
      }),
      ...(cleanedHoursNotes.length && { hours_notes: cleanedHoursNotes }),
      ...(substituteHolidayPolicy.trim() && {
        substitute_holiday_policy: substituteHolidayPolicy.trim(),
      }),
      ...(currentEvent.trim() && { current_event: currentEvent.trim() }),
      ...(disclaimer.trim() && { disclaimer: disclaimer.trim() }),
    };

    if (Object.keys(newSettings.hours).length === 0) delete newSettings.hours;

    try {
      const res = await fetch("/api/clinic-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          slogan,
          booking_url: bookingUrl,
          settings: newSettings,
        }),
      });
      if (res.ok) {
        setStatus({ type: "success", message: "저장되었습니다." });
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatus({
          type: "error",
          message: `오류: ${err.error || "저장 실패"}`,
        });
      }
    } catch (e) {
      setStatus({ type: "error", message: `오류: ${e.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
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
          <span className="text-lg">👑</span>
          <div>
            <div className="text-white text-sm font-medium">{name || "병원 설정"}</div>
            <div className="text-white/80 text-xs">병원 정보 수정</div>
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
            onClick={() => router.push("/admin/faqs")}
            className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer font-medium"
          >
            FAQ
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4 pb-28">
        <Section title="기본 정보">
          <Field label="병원명" value={name} onChange={setName} />
          <Field label="전화" value={phone} onChange={setPhone} />
          <Field label="주소" value={address} onChange={setAddress} multiline />
          <Field label="슬로건" value={slogan} onChange={setSlogan} />
          <Field
            label="예약 링크"
            value={bookingUrl}
            onChange={setBookingUrl}
            placeholder="https://..."
          />
        </Section>

        <Section title="진료시간">
          <Field
            label="평일"
            value={weekdayHours}
            onChange={setWeekdayHours}
            placeholder="10:00-19:00"
          />
          <Field
            label="점심시간"
            value={lunchHours}
            onChange={setLunchHours}
            placeholder="13:00-14:00"
          />
          <Field
            label="토요일"
            value={saturdayHours}
            onChange={setSaturdayHours}
            placeholder="09:00-14:00"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">휴진</label>
            <div className="flex gap-3 flex-wrap">
              {DAY_OPTIONS.map((d) => {
                const checked = closedDays.includes(d.code);
                return (
                  <label
                    key={d.code}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${
                      checked
                        ? "bg-[#C9A96E] text-white border-[#C9A96E]"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClosedDay(d.code)}
                      className="hidden"
                    />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">
              진료시간 부가 안내
            </label>
            <div className="text-xs text-gray-400">
              "사용" 체크된 항목만 챗봇 응답에 포함됩니다.
            </div>
            {hoursNotes.map((note, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={note.text}
                  onChange={(e) => updateHoursNote(idx, "text", e.target.value)}
                  placeholder="예: 10분 전까지 접수 가능"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A96E]"
                />
                <label
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                    note.enabled
                      ? "bg-[#C9A96E] text-white border-[#C9A96E]"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={note.enabled}
                    onChange={(e) =>
                      updateHoursNote(idx, "enabled", e.target.checked)
                    }
                    className="hidden"
                  />
                  사용
                </label>
                <button
                  type="button"
                  onClick={() => removeHoursNote(idx)}
                  className="text-gray-300 hover:text-red-500 cursor-pointer px-1"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addHoursNote}
              className="self-start text-xs text-[#C9A96E] hover:underline cursor-pointer mt-1"
            >
              + 안내 추가
            </button>
          </div>

          <Field
            label="대체공휴일 안내"
            value={substituteHolidayPolicy}
            onChange={setSubstituteHolidayPolicy}
            placeholder="예: 대체공휴일은 병원 사정에 따라 변동되니 전화로 확인 부탁드립니다."
          />
        </Section>

        <Section title="의료진 / 안내">
          <Field
            label="의료진 요약"
            value={doctorsSummary}
            onChange={setDoctorsSummary}
            placeholder="예: 두 분의 원장님이 직접 진료 (여성 전문의)"
          />
          <Field
            label="주차 안내"
            value={parking}
            onChange={setParking}
            placeholder="예: 무료 발렛 운영"
          />
          <Field
            label="예약 안내"
            value={reservationNote}
            onChange={setReservationNote}
            placeholder="예: 네이버 플레이스에서만 가능"
          />
        </Section>

        <Section
          title="진료과목"
          hint="한 줄에 하나씩 입력"
        >
          <Field
            label=""
            value={departments}
            onChange={setDepartments}
            multiline
            rows={3}
            placeholder={"산부인과\n피부 관리 시술"}
          />
        </Section>

        <Section
          title="주요 진료 항목"
          hint="한 줄에 하나씩 입력. 챗봇 답변에 노출됩니다."
        >
          <Field
            label=""
            value={services}
            onChange={setServices}
            multiline
            rows={6}
            placeholder={"산부인과 일반진료\n여성성형\n갱년기 케어"}
          />
        </Section>

        <Section
          title="병원 특징"
          hint="한 줄에 하나씩 입력. 챗봇이 자랑할 포인트."
        >
          <Field
            label=""
            value={features}
            onChange={setFeatures}
            multiline
            rows={4}
            placeholder={"프라이버시 철저 보호\n무료 발렛"}
          />
        </Section>

        <Section title="챗봇 설정">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-medium">말투</label>
            <div className="flex gap-2">
              {[
                { code: "warm", label: "친근체 (~에요)" },
                { code: "formal", label: "격식체 (~입니다)" },
              ].map((opt) => (
                <label
                  key={opt.code}
                  className={`flex-1 text-center px-3 py-2 rounded-xl text-sm cursor-pointer border transition-colors ${
                    tone === opt.code
                      ? "bg-[#C9A96E] text-white border-[#C9A96E]"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value={opt.code}
                    checked={tone === opt.code}
                    onChange={() => setTone(opt.code)}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <Field
            label="이번달 이벤트"
            value={currentEvent}
            onChange={setCurrentEvent}
            multiline
            rows={2}
            placeholder="비워두면 노출 안 함. 예: 11월 한 달간 골밀도 검사 20% 할인"
          />

          <Field
            label="면책 문구"
            value={disclaimer}
            onChange={setDisclaimer}
            multiline
            rows={2}
            placeholder="예: 본 채널은 일반 안내용이며 진료를 대신할 수 없습니다."
          />
        </Section>
      </div>

      {/* 하단 고정 저장바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#C9A96E] text-white rounded-xl px-6 py-2.5 text-sm font-medium active:bg-[#b8965d] disabled:opacity-60 cursor-pointer hover:bg-[#b8965d] transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium text-gray-800">{title}</h2>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline, rows = 2, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-gray-500 font-medium">{label}</label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#C9A96E] resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C9A96E]"
        />
      )}
    </div>
  );
}
