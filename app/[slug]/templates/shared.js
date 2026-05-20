// 홈페이지 템플릿 공통 모듈.
// clinic + clinic_settings 한 쌍을 받아 모든 템플릿이 쓰는 가공 데이터 객체로 변환.
// 템플릿(Classic/Modern/Soft)은 이 데이터를 받아 "보이는 것"만 다르게 렌더.

export const DAY_LABELS = {
  sun: "일",
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  holiday: "공휴일",
};

// features 구조 정규화 — 신구 호환.
// 신: [{title, items[]}]  /  구: string[] → 단일 그룹으로 wrap (title 없음)
export function normalizeFeatureGroups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return [{ title: "", items: raw.filter(Boolean) }];
  }
  return raw
    .map((g) => ({
      title: g?.title || "",
      items: Array.isArray(g?.items) ? g.items.filter(Boolean) : [],
    }))
    .filter((g) => g.items.length > 0);
}

// 홈페이지 공지 이미지. event_image_url은 챗봇 환영 이미지 전용이라 fallback 안 함.
export function normalizeNotices(s) {
  if (!Array.isArray(s.notices)) return [];
  return s.notices.filter((n) => n && n.image_url);
}

// clinic 행 + clinic_settings 행 → 템플릿이 쓰는 단일 데이터 객체.
export function buildHomeData(clinic, settingsRow, slug) {
  const s = settingsRow?.settings || {};
  const hours = s.hours || {};
  const closedLabels = (hours.closed || []).map((c) => DAY_LABELS[c] || c);
  const hoursNotes = (s.hours_notes || []).filter((n) => n?.enabled && n?.text);
  const departments = s.departments || [];
  const services = s.services || [];
  const featureGroups = normalizeFeatureGroups(s.features);
  const notices = normalizeNotices(s);
  const doctorImages = Array.isArray(s.doctor_images)
    ? s.doctor_images.filter((u) => typeof u === "string" && u)
    : [];

  const showHours = !!(
    hours.weekday ||
    hours.saturday ||
    hours.lunch ||
    closedLabels.length > 0 ||
    hoursNotes.length > 0 ||
    s.substitute_holiday_policy
  );
  const showCare = departments.length > 0 || services.length > 0;
  const showVisit = !!(clinic.address || s.parking || s.reservation_note);

  const navItems = [
    { id: "intro", label: "소개" },
    showHours && { id: "hours", label: "진료시간" },
    showCare && { id: "care", label: "진료안내" },
    doctorImages.length > 0 && { id: "doctors", label: "의료진" },
    showVisit && { id: "visit", label: "위치" },
  ].filter(Boolean);

  return {
    clinic,
    slug,
    slogan: settingsRow?.slogan || "",
    bookingUrl: settingsRow?.booking_url || "",
    hours,
    closedLabels,
    hoursNotes,
    departments,
    services,
    featureGroups,
    notices,
    doctorImages,
    doctorsSummary: s.doctors_summary || "",
    parking: s.parking || "",
    reservationNote: s.reservation_note || "",
    substituteHolidayPolicy: s.substitute_holiday_policy || "",
    showHours,
    showCare,
    showVisit,
    navItems,
  };
}
