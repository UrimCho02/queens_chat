// Modern 템플릿 — 화이트 + 블루, 카드 중심. 깔끔하고 신뢰감 있는 병원 톤.
// data 객체는 shared.js 의 buildHomeData() 결과.

export default function ModernTemplate({ data }) {
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

  const hourRows = [
    hours.weekday && { label: "평일", value: hours.weekday },
    hours.saturday && { label: "토요일", value: hours.saturday },
    hours.lunch && { label: "점심시간", value: hours.lunch },
    closedLabels.length > 0 && {
      label: "휴진",
      value: closedLabels.join(", "),
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={`${clinic.name} 로고`}
                className="h-9 sm:h-10 w-auto flex-shrink-0"
              />
            ) : (
              <span className="text-xl text-blue-600">✚</span>
            )}
            <div className="font-bold text-slate-900 text-base sm:text-lg truncate">
              {clinic.name}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                className="hidden sm:inline text-sm font-medium text-slate-600 px-3 py-1.5 hover:text-blue-600 transition-colors"
              >
                {clinic.phone}
              </a>
            )}
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>

        {navItems.length > 1 && (
          <nav className="border-t border-slate-100">
            <div className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto">
              {navItems.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className="whitespace-nowrap px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="intro" className="bg-slate-50 scroll-mt-32">
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
          {clinic.logo_url && (
            <img
              src={clinic.logo_url}
              alt={`${clinic.name} 로고`}
              className="mx-auto mb-6 h-20 sm:h-24 w-auto"
            />
          )}
          <div className="inline-block h-1 w-12 bg-blue-600 rounded-full mb-6" />
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            {slogan || `${clinic.name}`}
          </h1>
          <div className="mt-3 text-base sm:text-lg font-semibold text-blue-600">
            {clinic.name}
          </div>
          {doctorsSummary && (
            <p className="mt-5 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
              {doctorsSummary}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-clinictalk-open
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              💬 AI 챗봇 문의
            </button>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg text-sm font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Notice */}
      {notices.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <SectionHeader badge="NOTICE" title="공지사항" />
          <div
            className={`mt-8 grid gap-4 ${
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
                className="block border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <img
                  src={n.image_url}
                  alt={`공지 ${i + 1}`}
                  className="w-full rounded-lg"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Hours */}
      {showHours && (
        <section id="hours" className="bg-slate-50 scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <SectionHeader badge="HOURS" title="진료시간" />
            <div className="mt-8 max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden">
              {hourRows.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-500">
                    {r.label}
                  </span>
                  <span className="text-slate-900 font-semibold">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
            {(hoursNotes.length > 0 || substituteHolidayPolicy) && (
              <ul className="mt-5 max-w-2xl mx-auto space-y-1.5 text-sm text-slate-500">
                {hoursNotes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{n.text}</span>
                  </li>
                ))}
                {substituteHolidayPolicy && (
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{substituteHolidayPolicy}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Departments / Services */}
      {showCare && (
        <section id="care" className="max-w-6xl mx-auto px-4 py-16 scroll-mt-32">
          <SectionHeader badge="CARE" title="진료 안내" />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.length > 0 && (
              <Card title="진료과목">
                <ul className="space-y-2.5">
                  {departments.map((d, i) => (
                    <li key={i} className="flex gap-2.5 text-slate-700">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {services.length > 0 && (
              <Card title="주요 진료 항목">
                <ul className="space-y-2.5">
                  {services.map((sv, i) => (
                    <li key={i} className="flex gap-2.5 text-slate-700">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span>{sv}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Doctors */}
      {doctorImages.length > 0 && (
        <section id="doctors" className="bg-slate-50 scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 py-16">
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
                    className="w-full rounded-xl border border-slate-200"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {featureGroups.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <SectionHeader badge="WHY US" title={`${clinic.name}의 강점`} />
          <div className="mt-8 flex flex-col gap-10">
            {featureGroups.map((g, gi) => (
              <div key={gi}>
                {g.title && (
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    {g.title}
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map((item, i) => (
                    <div
                      key={i}
                      className="border border-slate-200 rounded-xl p-5 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-sm font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 text-sm leading-relaxed">
                        {item}
                      </span>
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
        <section id="visit" className="bg-slate-50 scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <SectionHeader badge="VISIT" title="찾아오시는 길" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {clinic.address && (
                <Card title="주소">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {clinic.address}
                  </p>
                  {clinic.phone && (
                    <a
                      href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                      className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline"
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
                      <div className="text-xs text-slate-400 font-semibold mb-1">
                        주차
                      </div>
                      <div className="text-slate-700">{parking}</div>
                    </div>
                  )}
                  {reservationNote && (
                    <div>
                      <div className="text-xs text-slate-400 font-semibold mb-1">
                        예약 안내
                      </div>
                      <div className="text-slate-700">{reservationNote}</div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-slate-400 space-y-2">
          <p>
            © {new Date().getFullYear()} {clinic.name}. All rights reserved.
          </p>
          <p>
            powered by{" "}
            <span className="text-blue-400 font-semibold">ClinicTalk</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ badge, title }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold text-blue-600 tracking-widest uppercase">
        {badge}
      </div>
      <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}
