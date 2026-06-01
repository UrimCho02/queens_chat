// 도메인 화이트리스트 순수 로직 단위 테스트.
// 실행: node scripts/test-origin-allowlist.mjs

import { getRequestHost, isOriginAllowed } from "../lib/security/domainAllowlist.js";

// request.headers.get(name) 흉내
const req = (headers) => ({
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? "✅" : "❌"} ${label}  (got=${actual}, want=${expected})`);
  ok ? pass++ : fail++;
}

// --- getRequestHost ---
check("origin 우선 추출", getRequestHost(req({ origin: "https://evil.com", referer: "https://ok.com" })), "evil.com");
check("origin 없으면 referer", getRequestHost(req({ referer: "https://ok.com/page?x=1" })), "ok.com");
check("둘 다 없으면 null", getRequestHost(req({})), null);
check("잘못된 URL → null", getRequestHost(req({ origin: "not a url" })), null);
check("대문자 → 소문자", getRequestHost(req({ origin: "https://Example.COM" })), "example.com");

// --- isOriginAllowed: 예외(개발/프리뷰) ---
check("host 없음 → 허용", isOriginAllowed(null, ["thequeens.co.kr"]), true);
check("localhost → 허용", isOriginAllowed("localhost", ["thequeens.co.kr"]), true);
check("127.0.0.1 → 허용", isOriginAllowed("127.0.0.1", ["thequeens.co.kr"]), true);
check("*.vercel.app → 허용", isOriginAllowed("queens-chat.vercel.app", ["thequeens.co.kr"]), true);

// --- isOriginAllowed: 미설정 → 제한 없음 ---
check("allowed 빈배열 → 허용", isOriginAllowed("evil.com", []), true);
check("allowed null → 허용", isOriginAllowed("evil.com", null), true);
check("allowed undefined → 허용", isOriginAllowed("evil.com", undefined), true);

// --- isOriginAllowed: 화이트리스트 활성 ---
const wl = ["thequeens.co.kr", "https://partner.com/", "www.clinic.kr"];
check("정확히 일치 → 허용", isOriginAllowed("thequeens.co.kr", wl), true);
check("서브도메인 → 허용", isOriginAllowed("www.thequeens.co.kr", wl), true);
check("스킴/슬래시 포함 항목 정규화 매칭", isOriginAllowed("partner.com", wl), true);
check("미허용 도메인 → 차단", isOriginAllowed("evil.com", wl), false);
check("부분 문자열 위장 → 차단", isOriginAllowed("thequeens.co.kr.evil.com", wl), false);
check("접미사 위장(evilthequeens) → 차단", isOriginAllowed("eviltheequeens.co.kr", wl), false);
check("상위가 아닌 유사도메인 → 차단", isOriginAllowed("clinic.kr", ["www.clinic.kr"]), false);

console.log(`\n===== ${pass} PASS / ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
