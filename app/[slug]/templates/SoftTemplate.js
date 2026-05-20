// Soft 템플릿 — 파스텔 민트 + 라운드. 친근하고 편안한 동네병원 톤.
// data 객체는 shared.js 의 buildHomeData() 결과.

export default function SoftTemplate({ data }) {
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
    <div className="min-h-screen bg-white text-stone-700">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-emerald-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={`${clinic.name} 로고`}
                className="h-9 sm:h-10 w-auto flex-shrink-0"
              />
            ) : (
              <span className="text-xl">🌿</span>
            )}
            <div className="font-bold text-stone-800 text-base sm:text-lg truncate">
              {clinic.name}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                📞 {clinic.phone}
              </a>
            )}
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-4 py-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>

        {navItems.length > 1 && (
          <nav className="border-t border-emerald-50">
            <div className="max-w-5xl mx-auto px-2 flex gap-0.5 overflow-x-auto">
              {navItems.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className="whitespace-nowrap px-3 py-2.5 text-xs sm:text-sm text-stone-500 hover:text-emerald-600 transition-colors"
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
        className="bg-gradient-to-b from-emerald-50 to-white scroll-mt-32"
      >
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          {clinic.logo_url ? (
            <img
              src={clinic.logo_url}
              alt={`${clinic.name} 로고`}
              className="mx-auto mb-6 h-24 sm:h-28 w-auto"
            />
          ) : (
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
              🌿
            </div>
          )}
          <div className="text-xl sm:text-2xl font-bold text-stone-800 mb-3">
            {clinic.name}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-stone-800 leading-snug">
            {slogan || "가깝고 편안한 우리 동네 병원"}
          </h1>
          {doctorsSummary && (
            <p className="mt-5 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
              {doctorsSummary}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-clinictalk-open
              className="inline-flex items-center gap-2 bg-emerald-500 text-white px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
            >
              💬 AI 챗봇으로 물어보기
            </button>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white border-2 border-emerald-200 text-emerald-700 px-7 py-3.5 rounded-full text-sm font-semibold hover:border-emerald-400 transition-colors"
              >
                진료 예약
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Notice */}
      {notices.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-14">
          <SectionHeader badge="공지사항" title="새로운 소식" />
          <div
            className={`mt-8 grid gap-5 ${
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
                className="block bg-emerald-50 rounded-3xl p-3 hover:shadow-md transition-shadow"
              >
                <img
                  src={n.image_url}
                  alt={`공지 ${i + 1}`}
                  className="w-full rounded-2xl"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Hours */}
      {showHours && (
        <section id="hours" className="max-w-5xl mx-auto px-4 py-14 scroll-mt-32">
          <SectionHeader badge="진료시간" title="언제 오시면 되나요?" />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hourRows.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-emerald-50 rounded-3xl px-6 py-5"
              >
                <span className="text-sm font-semibold text-emerald-700">
                  {r.label}
                </span>
                <span className="text-stone-800 font-bold">{r.value}</span>
              </div>
            ))}
          </div>
          {(hoursNotes.length > 0 || substituteHolidayPolicy) && (
            <ul className="mt-6 space-y-2 text-sm text-stone-500">
              {hoursNotes.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">🌱</span>
                  <span>{n.text}</span>
                </li>
              ))}
              {substituteHolidayPolicy && (
                <li className="flex gap-2">
                  <span className="text-emerald-500">🌱</span>
                  <span>{substituteHolidayPolicy}</span>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {/* Departments / Services */}
      {showCare && (
        <section id="care" className="bg-emerald-50/60 scroll-mt-32">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <SectionHeader badge="진료안내" title="이런 진료를 해요" />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.length > 0 && (
                <Card title="진료과목">
                  <ul className="space-y-2.5">
                    {departments.map((d, i) => (
                      <li key={i} className="flex gap-2.5 text-stone-700">
                        <span className="text-emerald-500">●</span>
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
                      <li key={i} className="flex gap-2.5 text-stone-700">
                        <span className="text-emerald-500">●</span>
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

      {/* Doctors */}
      {doctorImages.length > 0 && (
        <section
          id="doctors"
          className="max-w-5xl mx-auto px-4 py-14 scroll-mt-32"
        >
          <SectionHeader badge="의료진" title="의료진을 소개합니다" />
          <div
            className={`mt-8 grid gap-6 ${
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
                className="block bg-emerald-50 rounded-3xl p-3 hover:opacity-95 transition-opacity"
              >
                <img
                  src={url}
                  alt={`${clinic.name} 의료진 ${i + 1}`}
                  className="w-full rounded-2xl"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {featureGroups.length > 0 && (
        <section className="bg-emerald-50/60">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <SectionHeader
              badge="우리 병원"
              title={`${clinic.name}의 좋은 점`}
            />
            <div className="mt-8 flex flex-col gap-9">
              {featureGroups.map((g, gi) => (
                <div key={gi}>
                  {g.title && (
                    <h3 className="text-lg font-bold text-stone-800 mb-4 text-center">
                      {g.title}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {g.items.map((item, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-3xl p-6 flex items-start gap-3 shadow-sm"
                      >
                        <span className="text-emerald-500 text-lg">🌿</span>
                        <span className="text-stone-700 text-sm leading-relaxed">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location */}
      {showVisit && (
        <section id="visit" className="max-w-5xl mx-auto px-4 py-14 scroll-mt-32">
          <SectionHeader badge="오시는 길" title="찾아오시는 길" />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {clinic.address && (
              <Card title="주소">
                <p className="text-stone-700 leading-relaxed whitespace-pre-line">
                  {clinic.address}
                </p>
                {clinic.phone && (
                  <a
                    href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}
                    className="inline-block mt-3 text-sm font-medium text-emerald-600 hover:underline"
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
                    <div className="text-xs text-stone-400 font-semibold mb-1">
                      주차
                    </div>
                    <div className="text-stone-700">{parking}</div>
                  </div>
                )}
                {reservationNote && (
                  <div>
                    <div className="text-xs text-stone-400 font-semibold mb-1">
                      예약 안내
                    </div>
                    <div className="text-stone-700">{reservationNote}</div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-emerald-50">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-stone-500 space-y-2">
          <p>
            © {new Date().getFullYear()} {clinic.name}. All rights reserved.
          </p>
          <p className="text-stone-400">
            powered by{" "}
            <span className="text-emerald-600 font-semibold">ClinicTalk</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ badge, title }) {
  return (
    <div className="text-center">
      <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-3 py-1">
        {badge}
      </span>
      <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-stone-800">
        {title}
      </h2>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-stone-800 mb-3">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}
