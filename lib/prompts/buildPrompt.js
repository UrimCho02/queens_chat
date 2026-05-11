// clinic_id로 clinics + clinic_settings + clinic_faqs 읽어서
// [병원 정보] + [주요 진료 항목] + [병원 특징] + [자주 묻는 질문] 섹션 조립 →
// safetyRules와 합쳐 최종 시스템 프롬프트 반환.

import { createServiceClient } from "@/lib/supabase/service";
import { safetyRules } from "./safety";

const DAY_LABELS = {
  sun: "일요일",
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
  sat: "토요일",
  holiday: "공휴일",
};

export async function buildPrompt(clinicId) {
  const supabase = createServiceClient();

  const [clinicResult, settingsResult, faqsResult] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, phone, address")
      .eq("id", clinicId)
      .single(),
    supabase
      .from("clinic_settings")
      .select("booking_url, slogan, settings")
      .eq("clinic_id", clinicId)
      .single(),
    supabase
      .from("clinic_faqs")
      .select("question, answer, sort_order")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (clinicResult.error || !clinicResult.data) {
    throw new Error(
      `buildPrompt: 병원을 찾을 수 없습니다. clinicId=${clinicId} (${clinicResult.error?.message})`
    );
  }

  const clinic = clinicResult.data;
  const settings = settingsResult.data || {};
  const s = settings.settings || {};
  const bookingUrl = settings.booking_url || "";
  const slogan = settings.slogan || "";
  const faqs = faqsResult.data || [];

  const hours = s.hours || {};
  const closedDays = (hours.closed || [])
    .map((d) => DAY_LABELS[d] || d)
    .join(", ");
  const hoursParts = [];
  if (hours.weekday) hoursParts.push(`평일(월~금) ${hours.weekday}`);
  if (hours.lunch) hoursParts.push(`점심 ${hours.lunch}`);
  if (hours.saturday) hoursParts.push(`토요일 ${hours.saturday}`);
  const hoursLine = hoursParts.join(" / ");

  // [병원 정보]
  const infoLines = [`[병원 정보]`, `- 병원명: ${clinic.name}`];
  if (slogan) infoLines.push(`- 슬로건: ${slogan}`);
  if (clinic.address) infoLines.push(`- 주소: ${clinic.address}`);
  if (clinic.phone) infoLines.push(`- 전화: ${clinic.phone}`);
  if (hoursLine) infoLines.push(`- 진료시간: ${hoursLine}`);
  if (closedDays) infoLines.push(`- 휴진: ${closedDays}`);
  if (s.reservation_note) infoLines.push(`- 예약: ${s.reservation_note}`);
  if (bookingUrl) infoLines.push(`- 예약 링크: ${bookingUrl}`);
  if (s.parking) infoLines.push(`- 주차: ${s.parking}`);
  if (s.departments?.length)
    infoLines.push(`- 진료과목: ${s.departments.join(", ")}`);
  if (s.doctors_summary) infoLines.push(`- 의료진: ${s.doctors_summary}`);

  const enabledHoursNotes = (s.hours_notes || [])
    .filter((n) => n && n.enabled && n.text?.trim())
    .map((n) => n.text.trim());
  if (enabledHoursNotes.length) {
    infoLines.push(`- 진료시간 부가 안내: ${enabledHoursNotes.join(" / ")}`);
  }

  const substituteHolidayPolicy =
    s.substitute_holiday_policy?.trim() ||
    "대체공휴일은 병원 사정에 따라 변동되니 전화로 확인 부탁드립니다.";
  infoLines.push(`- 대체공휴일: ${substituteHolidayPolicy}`);

  if (s.current_event?.trim()) {
    infoLines.push(`- 이번달 이벤트: ${s.current_event.trim()}`);
  }

  const sections = [infoLines.join("\n")];

  if (s.services?.length) {
    sections.push(
      `[주요 진료 항목]\n${s.services.map((x) => `- ${x}`).join("\n")}`
    );
  }
  if (s.features?.length) {
    sections.push(
      `[병원 특징]\n${s.features.map((x) => `- ${x}`).join("\n")}`
    );
  }

  // 안전 규칙은 FAQ보다 먼저 와야 함. FAQ의 친절-답변 예시가 안전 규칙을
  // 덮어쓰는 현상을 방지.
  const tone = s.tone === "formal" ? "formal" : "warm";
  sections.push(
    safetyRules({ clinicName: clinic.name, bookingUrl, tone })
  );

  if (faqs.length) {
    sections.push(
      `[참고: 자주 묻는 질문]\n위 [답변 규칙]을 반드시 우선 적용. 아래는 일반 문의(규칙 11)에 해당하는 경우의 참고용 답변 예시입니다.\n\n${faqs
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n")}`
    );
  }

  return `당신은 ${clinic.name}의 AI 상담 어시스턴트입니다. 아래 규칙을 반드시 따르세요.

${sections.join("\n\n")}`;
}
