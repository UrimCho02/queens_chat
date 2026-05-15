// 수술 후 회복 가이드 수정/삭제.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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

    const { data: before } = await service
      .from("clinic_recovery_guides")
      .select("*")
      .eq("id", id)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!before) {
      return Response.json(
        { error: "해당 가이드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: updated, error } = await service
      .from("clinic_recovery_guides")
      .update({
        name,
        description: description || null,
        items,
        sort_order: Number.isFinite(body.sort_order)
          ? body.sort_order
          : before.sort_order,
        is_active: body.is_active ?? before.is_active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (JSON.stringify(before) !== JSON.stringify(updated)) {
      await service.from("clinic_change_logs").insert({
        clinic_id: clinic.id,
        changed_by: user.id,
        changed_by_email: user.email,
        table_name: "clinic_recovery_guides",
        record_id: id,
        action: "update",
        before,
        after: updated,
      });
    }

    return Response.json(updated);
  } catch (e) {
    console.error("recovery-guides PUT error:", e);
    return Response.json(
      { error: e.message || "수정 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const { user, clinic } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!clinic) {
      return Response.json({ error: "병원 매핑이 없습니다." }, { status: 403 });
    }

    const service = createServiceClient();

    const { data: before } = await service
      .from("clinic_recovery_guides")
      .select("*")
      .eq("id", id)
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!before) {
      return Response.json(
        { error: "해당 가이드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { error } = await service
      .from("clinic_recovery_guides")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await service.from("clinic_change_logs").insert({
      clinic_id: clinic.id,
      changed_by: user.id,
      changed_by_email: user.email,
      table_name: "clinic_recovery_guides",
      record_id: id,
      action: "delete",
      before,
      after: null,
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("recovery-guides DELETE error:", e);
    return Response.json(
      { error: e.message || "삭제 실패" },
      { status: 500 }
    );
  }
}
