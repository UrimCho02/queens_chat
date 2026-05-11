// 현재 로그인한 사용자의 user/clinic/role 결정.
// - superadmin: 첫 번째 clinic 반환 (TODO: 다중 병원 시 picker UI)
// - admin: clinic_users 매핑된 clinic 반환
//
// 미로그인이면 user, clinic 모두 null.
//
// 서버 컴포넌트와 라우트 핸들러 양쪽에서 호출. cookies() 의존이라 서버 전용.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    const { data: clinic } = await service
      .from("clinics")
      .select("*")
      .order("created_at")
      .limit(1)
      .single();
    return { user, clinic, role: "superadmin" };
  }

  const { data: mapping } = await service
    .from("clinic_users")
    .select("clinic:clinics(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, clinic: mapping?.clinic || null, role: "admin" };
}
