// 챗봇(/) 의 clinic 식별 — 클라이언트/서버 공용 로직.
//
// 우선순위:
//   1. ?clinic=<slug>  (홈페이지 위젯 임베드 등에서 전달)
//   2. 호스트 매핑      (데모 서브도메인 등 — HOST_SLUG_MAP)
//   3. 빈 문자열         (호출부에서 fallback 처리, 보통 더퀸즈)
//
// 클라(app/ChatClient.js)는 window.location 에서 직접 읽고,
// 서버(app/page.js generateMetadata, /api/chat 등)는 requestParams/host
// 헤더를 받아 resolveSlugFromRequest 로 같은 결정 트리를 적용.

export const HOST_SLUG_MAP = {
  "demo.clinictalk.kr": "demo-obgyn",
};

// 서버용 — Next.js searchParams 객체(또는 plain object) + host 문자열.
export function resolveSlugFromRequest(searchParams, host) {
  const fromQuery = searchParams?.clinic;
  if (fromQuery) return String(fromQuery);
  if (host && HOST_SLUG_MAP[host]) return HOST_SLUG_MAP[host];
  return "";
}
