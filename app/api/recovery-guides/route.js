// 수술 후 회복 가이드 생성. /admin/recovery-guides 페이지에서 새 가이드 추가 시 호출.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

export async function POST(request) {
  try {
    const { user, clinic } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!clinic) {
      return Response.json({ error: "병원 매핑이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    const description = (body.description || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!name) {
      return Response.json(
        { error: "수술명을 입력해 주세요." },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: created, error } = await service
      .from("clinic_recovery_guides")
      .insert({
        clinic_id: clinic.id,
        name,
        description: description || null,
        items,
        sort_order: Number.isFinite(body.sort_order) ? body.sort_order : 0,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    await service.from("clinic_change_logs").insert({
      clinic_id: clinic.id,
      changed_by: user.id,
      changed_by_email: user.email,
      table_name: "clinic_recovery_guides",
      record_id: created.id,
      action: "create",
      before: null,
      after: created,
    });

    return Response.json(created);
  } catch (e) {
    console.error("recovery-guides POST error:", e);
    return Response.json(
      { error: e.message || "생성 실패" },
      { status: 500 }
    );
  }
}
