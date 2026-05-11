// FAQ 생성. /admin/faqs 페이지에서 새 FAQ 추가 시 호출.

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
    const question = (body.question || "").trim();
    const answer = (body.answer || "").trim();
    if (!question || !answer) {
      return Response.json(
        { error: "질문과 답변을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: created, error } = await service
      .from("clinic_faqs")
      .insert({
        clinic_id: clinic.id,
        question,
        answer,
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
      table_name: "clinic_faqs",
      record_id: created.id,
      action: "create",
      before: null,
      after: created,
    });

    return Response.json(created);
  } catch (e) {
    console.error("clinic-faqs POST error:", e);
    return Response.json(
      { error: e.message || "생성 실패" },
      { status: 500 }
    );
  }
}
