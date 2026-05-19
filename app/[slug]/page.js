// 병원 홈페이지 템플릿 (공개 페이지, 비인증).
// clinic_settings 데이터를 그대로 1페이지로 렌더링.
// 우하단에 챗봇 위젯 임베드.

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import ChatWidget from "./ChatWidget";

const DAY_LABELS = {
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
// 신: [{title, items[]}]
// 구: string[] → 단일 그룹으로 wrap (title 없음)
function normalizeFeatureGroups(raw) {
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
function normalizeNotices(s) {
  if (!Array.isArray(s.notices)) return [];
  return s.notices.filter((n) => n && n.image_url);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!clinic) return { title: "병원을 찾을 수 없습니다" };
  return {
    title: clinic.name,
    description: `${clinic.name} 공식 홈페이지`,
  };
}

export default async function ClinicHomepage({ params }) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, phone, address, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!clinic) notFound();

  const { data: row } = await supabase
    .from("clinic_settings")
    .select("slogan, booking_url, settings")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  const s = row?.settings || {};
  const slogan = row?.slogan || "";
  const bookingUrl = row?.booking_url || "";
  const hours = s.hours || {};
  const closedLabels = (hours.closed || []).map((c) => DAY_LABELS[c] || c);
  const hoursNotes = (s.hours_notes || []).filter((n) => n?.enabled && n?.text);
  const departments = s.departments || [];
  const services = s.services || [];
  const featureGroups = normalizeFeatureGroups(s.features);
  const notices = normalizeNotices(s);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={`${clinic.name} 로고`}
                className="h-9 sm:h-10 w-auto flex-shrink-0"
              />
            ) : (
              <span className="text-lg">👑</span>
            )}
            <div className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              {clinic.name}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors"
              >
                📞 {clinic.phone}
              </a>
            )}
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-full bg-[#C9A96E] text-white hover:bg-[#b8965d] transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#FBF6EE] to-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          {clinic.logo_url ? (
            <img
              src={clinic.logo_url}
              alt={`${clinic.name} 로고`}
              className="mx-auto mb-6 h-24 sm:h-32 w-auto"
            />
          ) : (
            <div className="text-xs font-medium text-[#C9A96E] tracking-widest uppercase mb-3">
              {clinic.name}
            </div>
          )}
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {clinic.name}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 leading-tight">
            {slogan || "환자 한 분 한 분, 진심으로 진료합니다"}
          </h1>
          {s.doctors_summary && (
            <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {s.doctors_summary}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-clinictalk-open
              className="inline-flex items-center gap-2 bg-[#C9A96E] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#b8965d] transition-colors shadow-sm cursor-pointer"
            >
              💬 AI 챗봇으로 문의하기
            </button>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full text-sm font-medium hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Notice */}
      {notices.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <SectionHeader badge="NOTICE" title="공지사항" />
          <div
            className={`mt-6 grid gap-4 ${
              notices.length === 1
                ? "grid-cols-1 max-w-xl mx-auto"
                : notices.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {notices.map((n, i) => (
              <a
                key={i}
                href={n.image_url}
                target="_blank"
                rel="noreferrer"
                className="block bg-[#FBF6EE] border border-[#E8D9BC] rounded-2xl p-3 hover:shadow-md transition-shadow"
              >
                <img
                  src={n.image_url}
                  alt={`공지 ${i + 1}`}
                  className="w-full rounded-xl"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Hours */}
      {(hours.weekday ||
        hours.saturday ||
        hours.lunch ||
        closedLabels.length > 0 ||
        hoursNotes.length > 0 ||
        s.substitute_holiday_policy) && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <SectionHeader badge="HOURS" title="진료시간" />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hours.weekday && (
              <HourRow label="평일" value={hours.weekday} />
            )}
            {hours.saturday && (
              <HourRow label="토요일" value={hours.saturday} />
            )}
            {hours.lunch && (
              <HourRow label="점심시간" value={hours.lunch} />
            )}
            {closedLabels.length > 0 && (
              <HourRow label="휴진" value={closedLabels.join(", ")} />
            )}
          </div>
          {(hoursNotes.length > 0 || s.substitute_holiday_policy) && (
            <ul className="mt-5 space-y-1.5 text-sm text-gray-600">
              {hoursNotes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#C9A96E]">•</span>
                  <span>{n.text}</span>
                </li>
              ))}
              {s.substitute_holiday_policy && (
                <li className="flex gap-2">
                  <span className="text-[#C9A96E]">•</span>
                  <span>{s.substitute_holiday_policy}</span>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {/* Departments / Services */}
      {(departments.length > 0 || services.length > 0) && (
        <section className="bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <SectionHeader badge="CARE" title="진료 안내" />
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.length > 0 && (
                <Card title="진료과목">
                  <ul className="space-y-2">
                    {departments.map((d, i) => (
                      <li key={i} className="flex gap-2 text-gray-700">
                        <span className="text-[#C9A96E]">✦</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {services.length > 0 && (
                <Card title="주요 진료 항목">
                  <ul className="space-y-2">
                    {services.map((sv, i) => (
                      <li key={i} className="flex gap-2 text-gray-700">
                        <span className="text-[#C9A96E]">✦</span>
                        <span>{sv}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features (병원의 특별함) */}
      {featureGroups.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <SectionHeader badge="WHY US" title={`${clinic.name}의 특별함`} />
          <div className="mt-8 flex flex-col gap-8">
            {featureGroups.map((g, gi) => (
              <div key={gi}>
                {g.title && (
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-[#C9A96E]">✦</span>
                    {g.title}
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-3"
                    >
                      <span className="text-[#C9A96E] text-xl">★</span>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Location */}
      {(clinic.address || s.parking || s.reservation_note) && (
        <section className="bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <SectionHeader badge="VISIT" title="찾아오시는 길" />
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {clinic.address && (
                <Card title="주소">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {clinic.address}
                  </p>
                  {clinic.phone && (
                    <a
                      href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                      className="inline-block mt-3 text-sm text-[#C9A96E] hover:underline"
                    >
                      📞 {clinic.phone}
                    </a>
                  )}
                </Card>
              )}
              {(s.parking || s.reservation_note) && (
                <Card title="이용 안내">
                  {s.parking && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        주차
                      </div>
                      <div className="text-gray-700">{s.parking}</div>
                    </div>
                  )}
                  {s.reservation_note && (
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        예약 안내
                      </div>
                      <div className="text-gray-700">{s.reservation_note}</div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-500 space-y-2">
          <p>
            © {new Date().getFullYear()} {clinic.name}. All rights reserved.
          </p>
          <p className="text-gray-400">
            powered by{" "}
            <span className="text-[#C9A96E] font-medium">ClinicTalk</span>
          </p>
        </div>
      </footer>

      <ChatWidget clinicName={clinic.name} />
    </div>
  );
}

function SectionHeader({ badge, title }) {
  return (
    <div className="text-center">
      <div className="text-xs font-medium text-[#C9A96E] tracking-widest uppercase">
        {badge}
      </div>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
        {title}
      </h2>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function HourRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
