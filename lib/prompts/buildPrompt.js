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

  const [clinicResult, settingsResult, faqsResult, guidesResult] =
    await Promise.all([
      supabase
        .from("clinics")
        .select("id, name, phone, address, specialty")
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
      supabase
        .from("clinic_recovery_guides")
        .select("name, description, items, sort_order")
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
  const guides = guidesResult.data || [];

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
  const featureLines = flattenFeatures(s.features);
  if (featureLines.length) {
    sections.push(`[병원 특징]\n${featureLines.join("\n")}`);
  }

  // 안전 규칙은 FAQ/회복가이드보다 먼저 와야 함. 참고 데이터의 답변 패턴이
  // 안전 규칙(증상→STAFF_REQUIRED 등)을 덮어쓰는 현상을 방지.
  const tone = s.tone === "formal" ? "formal" : "warm";
  const specialty = clinic.specialty || "obgyn";
  sections.push(
    safetyRules({ specialty, clinicName: clinic.name, bookingUrl, tone })
  );

  if (guides.length) {
    sections.push(formatRecoveryGuides(guides));
  }

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

// features 구조 호환: string[] 또는 [{title, items[]}] 모두 flat 한 줄 배열로.
function flattenFeatures(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return raw.filter(Boolean).map((x) => `- ${x}`);
  }
  const lines = [];
  for (const group of raw) {
    const items = Array.isArray(group?.items) ? group.items.filter(Boolean) : [];
    if (items.length === 0) continue;
    if (group?.title) lines.push(`■ ${group.title}`);
    for (const item of items) lines.push(`- ${item}`);
  }
  return lines;
}

function formatRecoveryGuides(guides) {
  const blocks = guides.map((g) => {
    const lines = [];
    if (g.description) lines.push(g.description);
    const items = Array.isArray(g.items) ? g.items : [];
    items.forEach((it) => {
      if (!it || !it.title) return;
      const days =
        it.day_to && it.day_to !== it.day_from
          ? `${it.day_from}~${it.day_to}일차`
          : `${it.day_from}일차`;
      const content = it.content ? ` — ${it.content}` : "";
      lines.push(`- ${days}: ${it.title}${content}`);
    });
    return `■ ${g.name}\n${lines.join("\n")}`;
  });
  return `[참고: 수술 후 회복 가이드]\n위 [답변 규칙]을 반드시 우선 적용. 아래는 원장님이 등록한 회복 일정으로, 환자가 "수술 N일차" 관련 질문 시 그대로 안내. 등록되지 않은 수술/일자, 또는 증상 묘사 동반 질문(부어요/통증 심해요 등)은 STAFF_REQUIRED.\n\n${blocks.join("\n\n")}`;
}
