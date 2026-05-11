// /admin/*, /api/inquiries, /api/reply 진입 시 Supabase 세션 검사.
// 미인증이면 /login 리다이렉트. /login에 이미 로그인된 사용자 오면 /admin으로.
//
// /api/chat 은 환자(비로그인)가 호출하는 공개 API라 보호하지 않음.
// service_role 키로 RLS 우회하므로 그대로 동작.
//
// Next.js 16에서 middleware.js → proxy.js로 이름이 바뀜. API는 동일.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request) {
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
    "/admin/:path*",
    "/api/inquiries/:path*",
    "/api/reply/:path*",
    "/api/clinic-settings/:path*",
    "/api/clinic-faqs/:path*",
    "/login",
  ],
};
