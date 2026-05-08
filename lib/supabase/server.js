// 서버용 Supabase 클라이언트 (anon 키 + 쿠키 인증).
// 사용처: 로그인된 admin/superadmin이 호출하는 라우트 핸들러/서버 컴포넌트.
// RLS 정책이 auth.uid()를 보고 통과 여부 결정.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 서버 컴포넌트 컨텍스트에서는 set 불가. middleware가 세션 갱신 담당.
          }
        },
      },
    }
  );
}
