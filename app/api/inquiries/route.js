import { createClient } from "@/lib/supabase/server";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

export async function GET() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { role, clinic } = await getCurrentClinic();

    // 병원 컨텍스트 없음 (superadmin 이 병원 미선택) → 빈 목록.
    // /admin 페이지가 이 응답을 보고 /admin/clinics 콘솔로 보냄.
    if (!clinic) {
      return Response.json({
        inquiries: [],
        todayCount: 0,
        dailyLimit: parseInt(process.env.DAILY_LIMIT) || 20,
        role: role || null,
        clinicName: null,
        logoUrl: null,
      });
    }

    // clinic_id 명시 필터 — superadmin 은 RLS 를 우회하므로 선택 병원으로 직접 좁힌다.
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false });

    const { count: todayCount } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinic.id)
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lte("created_at", `${today}T23:59:59+09:00`);

    if (error) throw error;

    return Response.json({
      inquiries: data,
      todayCount: todayCount || 0,
      dailyLimit: parseInt(process.env.DAILY_LIMIT) || 20,
      role: role || null,
      clinicName: clinic?.name || null,
      logoUrl: clinic?.logo_url || null,
    });
  } catch (error) {
    console.error("DB 조회 오류:", error);
    return Response.json({ inquiries: [], todayCount: 0, dailyLimit: 20, role: null });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { id } = await request.json();

    const { error } = await supabase
      .from("inquiries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("삭제 오류:", error);
    return Response.json({ error: "삭제 실패" }, { status: 500 });
  }
}