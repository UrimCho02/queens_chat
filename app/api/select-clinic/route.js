// superadmin 이 관리할 병원을 선택. ct_clinic 쿠키를 설정한다.
// 이후 getCurrentClinic() 이 이 쿠키로 superadmin 의 clinic 컨텍스트를 결정.

import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getCurrentClinic,
  SELECTED_CLINIC_COOKIE,
} from "@/lib/auth/getCurrentClinic";

export async function POST(request) {
  try {
    const { user, role } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (role !== "superadmin") {
      return Response.json(
        { error: "운영자만 사용할 수 있습니다." },
        { status: 403 }
      );
    }

    const { clinicId } = await request.json();
    const cookieStore = await cookies();

    // clinicId 없으면 선택 해제 (콘솔로 복귀).
    if (!clinicId) {
      cookieStore.delete(SELECTED_CLINIC_COOKIE);
      return Response.json({ ok: true });
    }

    const service = createServiceClient();
    const { data: clinic } = await service
      .from("clinics")
      .select("id, slug, name")
      .eq("id", clinicId)
      .maybeSingle();

    if (!clinic) {
      return Response.json(
        { error: "병원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    cookieStore.set(SELECTED_CLINIC_COOKIE, clinic.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30일
    });

    return Response.json({ ok: true, clinic });
  } catch (error) {
    console.error("select-clinic POST error:", error);
    return Response.json(
      { error: error.message || "병원 선택에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 병원 선택 해제 — 로그인 화면에서 호출해 이전 선택을 초기화한다.
// 쿠키만 삭제하므로 인증 불필요(무해). httpOnly 쿠키라 서버에서 지워야 함.
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_CLINIC_COOKIE);
  return Response.json({ ok: true });
}
