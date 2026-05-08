// 브라우저용 Supabase 클라이언트 (anon 키).
// 사용처: 클라이언트 컴포넌트에서 로그인/로그아웃, 인증 상태 구독 등.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
