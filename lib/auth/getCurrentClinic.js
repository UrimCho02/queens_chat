// 현재 로그인한 사용자의 user/clinic/role 결정.
// - superadmin: 선택한 병원(ct_clinic 쿠키)을 반환. 쿠키 없으면 clinic=null
//   → 호출하는 페이지가 /admin/clinics 콘솔로 보냄.
// - admin: clinic_users 매핑된 clinic 반환.
//
// 미로그인이면 user, clinic 모두 null.
//
// 서버 컴포넌트와 라우트 핸들러 양쪽에서 호출. cookies() 의존이라 서버 전용.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// superadmin 이 현재 관리 중인 병원 id 를 담는 쿠키.
// superadmin 검증을 통과한 경우에만 읽으므로 일반 admin 의 권한 상승에는 쓰일 수 없음.
export const SELECTED_CLINIC_COOKIE = "ct_clinic";

export async function getCurrentClinic() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, clinic: null, role: null };

  const service = createServiceClient();

  const { data: superadmin } = await service
    .from("superadmins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (superadmin) {
    // superadmin 은 특정 병원에 매이지 않는 SaaS 운영자.
    // 선택한 병원을 쿠키로 추적 — 없으면 clinic=null (콘솔로 유도).
    const cookieStore = await cookies();
    const selectedId = cookieStore.get(SELECTED_CLINIC_COOKIE)?.value;
    let clinic = null;
    if (selectedId) {
      const { data } = await service
        .from("clinics")
        .select("*")
        .eq("id", selectedId)
        .maybeSingle();
      clinic = data || null;
    }
    return { user, clinic, role: "superadmin" };
  }

  const { data: mapping } = await service
    .from("clinic_users")
    .select("clinic:clinics(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, clinic: mapping?.clinic || null, role: "admin" };
}
