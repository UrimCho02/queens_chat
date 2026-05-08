// 서비스 키 Supabase 클라이언트 (service_role 키, RLS 우회).
// 사용처: 비로그인 사용자가 호출하는 챗봇 API에서 inquiries INSERT 등.
// ⚠️ 절대 브라우저로 보내지 말 것. NEXT_PUBLIC_ 접두어 금지.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. .env.local 과 Vercel 환경변수 확인 필요."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
