// Classic 템플릿 — 골드 elegant. 고급 여성의원 톤. (ClinicTalk 기본 템플릿)
// data 객체는 shared.js 의 buildHomeData() 결과.

export default function ClassicTemplate({ data }) {
  const {
    clinic,
    slogan,
    bookingUrl,
    hours,
    closedLabels,
    hoursNotes,
    departments,
    services,
    featureGroups,
    notices,
    doctorImages,
    doctorsSummary,
    parking,
    reservationNote,
    substituteHolidayPolicy,
    showHours,
    showCare,
    showVisit,
    navItems,
  } = data;

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

        {/* 섹션 anchor nav — 1페이지 내 스크롤 이동 */}
        {navItems.length > 1 && (
          <nav className="border-t border-gray-100">
            <div className="max-w-5xl mx-auto px-2 flex gap-0.5 overflow-x-auto">
              {navItems.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className="whitespace-nowrap px-3 py-2.5 text-xs sm:text-sm text-gray-600 hover:text-[#C9A96E] transition-colors"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section
        id="intro"
        className="bg-gradient-to-b from-[#FBF6EE] to-white scroll-mt-32"
      >
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
          {doctorsSummary && (
            <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {doctorsSummary}
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
      {showHours && (
        <section
          id="hours"
          className="max-w-5xl mx-auto px-4 py-12 scroll-mt-32"
        >
          <SectionHeader badge="HOURS" title="진료시간" />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hours.weekday && <HourRow label="평일" value={hours.weekday} />}
            {hours.saturday && <HourRow label="토요일" value={hours.saturday} />}
            {hours.lunch && <HourRow label="점심시간" value={hours.lunch} />}
            {closedLabels.length > 0 && (
              <HourRow label="휴진" value={closedLabels.join(", ")} />
            )}
          </div>
          {(hoursNotes.length > 0 || substituteHolidayPolicy) && (
            <ul className="mt-5 space-y-1.5 text-sm text-gray-600">
              {hoursNotes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#C9A96E]">•</span>
                  <span>{n.text}</span>
                </li>
              ))}
              {substituteHolidayPolicy && (
                <li className="flex gap-2">
                  <span className="text-[#C9A96E]">•</span>
                  <span>{substituteHolidayPolicy}</span>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {/* Departments / Services */}
      {showCare && (
        <section id="care" className="bg-gray-50 scroll-mt-32">
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

      {/* Doctors (의료진 소개) — 어드민에서 등록한 의료진 이미지들 */}
      {doctorImages.length > 0 && (
        <section
          id="doctors"
          className="max-w-5xl mx-auto px-4 py-12 scroll-mt-32"
        >
          <SectionHeader badge="DOCTORS" title="의료진 소개" />
          <div
            className={`mt-8 grid gap-5 ${
              doctorImages.length === 1
                ? "grid-cols-1 max-w-xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {doctorImages.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block hover:opacity-90 transition-opacity"
              >
                <img
                  src={url}
                  alt={`${clinic.name} 의료진 ${i + 1}`}
                  className="w-full rounded-2xl border border-gray-100 shadow-sm"
                />
              </a>
            ))}
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
      {showVisit && (
        <section id="visit" className="bg-gray-50 scroll-mt-32">
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
              {(parking || reservationNote) && (
                <Card title="이용 안내">
                  {parking && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        주차
                      </div>
                      <div className="text-gray-700">{parking}</div>
                    </div>
                  )}
                  {reservationNote && (
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        예약 안내
                      </div>
                      <div className="text-gray-700">{reservationNote}</div>
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
