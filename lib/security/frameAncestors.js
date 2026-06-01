// frame-ancestors CSP 빌더 — 챗봇 페이지(/)가 어느 부모 사이트에서 iframe 으로
// 임베드될 수 있는지 제한한다. 미허용 사이트가 챗봇을 iframe 으로 박으면 브라우저가
// 렌더링 자체를 거부 → 위젯이 안 뜨고 API 호출이 0건 → 무단 임베드 비용 abuse 차단.
//
// proxy.js(미들웨어)가 챗봇 페이지 응답 헤더에 이 값을 실어 보낸다.
// (frame-ancestors 는 프레임되는 "문서" 응답에 있어야 효력. API 응답이 아님.)

import { normalizeDomain } from "./domainAllowlist";

// 기본 허용 부모 — allowed_domains 와 무관하게 항상 포함.
// - 'self'           : 홈페이지(app/[slug])가 챗봇을 같은 출처 iframe 으로 임베드.
// - clinictalk.kr    : 랜딩페이지가 데모 챗봇을 iframe 으로 임베드.
// - *.clinictalk.kr  : 데모/병원 서브도메인.
// - *.vercel.app     : 프리뷰·프로덕션 배포 도메인.
const BASE_ANCESTORS = [
  "'self'",
  "https://clinictalk.kr",
  "https://*.clinictalk.kr",
  "https://*.vercel.app",
];

// allowedDomains(text[]) → "frame-ancestors ..." CSP 디렉티브 문자열.
// 각 등록 도메인은 정확 호스트 + 서브도메인 와일드카드 둘 다 부모로 허용.
export function buildFrameAncestors(allowedDomains) {
  const extra = [];
  if (Array.isArray(allowedDomains)) {
    for (const entry of allowedDomains) {
      const norm = normalizeDomain(entry);
      if (!norm) continue;
      extra.push(`https://${norm}`, `https://*.${norm}`);
    }
  }
  return `frame-ancestors ${[...BASE_ANCESTORS, ...extra].join(" ")}`;
}
