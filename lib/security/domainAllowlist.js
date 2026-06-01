// 챗봇 위젯 도메인 화이트리스트 검사 — 무단 임베드 API abuse 방지.
//
// /api/chat 의 GET/POST 가 요청 Origin/Referer 호스트를 clinic.allowed_domains 와
// 대조해 미허용 도메인을 fail-fast(403) 차단한다.
//
// 설계:
// - allowed_domains 비어있음(미설정) → 제한 없음 (기존 병원 영향 없음).
// - localhost / 127.0.0.1 / *.vercel.app(프리뷰·iframe 출처) → 항상 허용.
// - Origin/Referer 없음(비브라우저·일부 same-origin) → 허용 (정상 트래픽 깨지지 않게).
// - 한계: iframe 임베드는 Origin 이 iframe 출처(vercel.app)로 잡혀 부모 사이트를
//   식별 못 함. iframe 무단 임베드의 실효 차단은 frame-ancestors CSP 병행 필요.
//   (이 함수는 직접 cross-origin API 호출 abuse 방어 + CSP 의 데이터 소스 역할.)

// 요청 헤더에서 호스트명만 추출. origin 우선, 없으면 referer. 파싱 실패 시 null.
export function getRequestHost(request) {
  const raw = request.headers.get("origin") || request.headers.get("referer");
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// 개발/프리뷰 호스트 — 화이트리스트와 무관하게 항상 허용.
export function isDevOrPreviewHost(host) {
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  );
}

// 화이트리스트 항목 정규화 — 스킴·경로·포트 제거, 소문자 호스트명만.
export function normalizeDomain(entry) {
  return String(entry)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/:].*$/, "");
}

// host 가 allowedDomains 에 의해 허용되는가.
// allowedDomains 가 비어있거나 배열이 아니면 제한 없음(true).
// 등록 도메인과 정확히 일치하거나 그 서브도메인이면 허용.
export function isOriginAllowed(host, allowedDomains) {
  if (isDevOrPreviewHost(host)) return true;
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) return true;
  return allowedDomains.some((entry) => {
    const norm = normalizeDomain(entry);
    if (!norm) return false;
    return host === norm || host.endsWith(`.${norm}`);
  });
}
