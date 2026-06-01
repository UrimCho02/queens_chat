// /admin/*, /api/inquiries, /api/reply 진입 시 Supabase 세션 검사.
// 미인증이면 /login 리다이렉트. /login에 이미 로그인된 사용자 오면 /admin으로.
//
// /api/chat 은 환자(비로그인)가 호출하는 공개 API라 보호하지 않음.
// service_role 키로 RLS 우회하므로 그대로 동작.
//
// 챗봇 페이지(/) 는 frame-ancestors CSP 로 무단 iframe 임베드 차단 (chatbotFrameGuard).
//
// Next.js 16에서 middleware.js → proxy.js로 이름이 바뀜. API는 동일.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveSlugFromRequest } from "@/lib/clinicSlug";
import { buildFrameAncestors } from "@/lib/security/frameAncestors";

const DEFAULT_CLINIC_SLUG = "thequeens";

// 챗봇 페이지(/) 응답에 frame-ancestors CSP 를 실어 무단 iframe 임베드를 차단.
// 병원별 allowed_domains 를 조회해 부모 허용 목록에 더한다. 조회 실패 시에도
// 기본 출처(자기 자신 + ClinicTalk 자산)는 적용 — 외부 사이트 임베드는 기본 차단.
async function chatbotFrameGuard(request) {
  const response = NextResponse.next({ request });
  let allowedDomains = [];
  try {
    const host = request.headers.get("host");
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const slug = resolveSlugFromRequest(searchParams, host) || DEFAULT_CLINIC_SLUG;
    const supabase = createServiceClient();
    const { data: clinic } = await supabase
      .from("clinics")
      .select("allowed_domains")
      .eq("slug", slug)
      .single();
    if (Array.isArray(clinic?.allowed_domains)) allowedDomains = clinic.allowed_domains;
  } catch (e) {
    console.error("frame-ancestors lookup 실패 (기본 출처만 적용):", e?.message);
  }
  response.headers.set("Content-Security-Policy", buildFrameAncestors(allowedDomains));
  return response;
}

export async function proxy(request) {
  // 챗봇 페이지는 인증과 무관 — frame-ancestors 만 처리하고 바로 반환.
  if (request.nextUrl.pathname === "/") {
    return chatbotFrameGuard(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/api/inquiries") ||
    path.startsWith("/api/reply") ||
    path.startsWith("/api/clinic-settings") ||
    path.startsWith("/api/clinic-faqs");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/", // 챗봇 페이지 — frame-ancestors CSP
    "/admin/:path*",
    "/api/inquiries/:path*",
    "/api/reply/:path*",
    "/api/clinic-settings/:path*",
    "/api/clinic-faqs/:path*",
    "/login",
  ],
};
