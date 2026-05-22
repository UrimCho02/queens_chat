import { createClient } from "@/lib/supabase/server";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

const PAGE_SIZE = 50;

export async function GET(request) {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];
    const { role, clinic } = await getCurrentClinic();
    const dailyLimit = parseInt(process.env.DAILY_LIMIT) || 20;

    // 병원 컨텍스트 없음 (superadmin 이 병원 미선택) → 빈 응답.
    // /admin 페이지가 이 응답을 보고 /admin/clinics 콘솔로 보냄.
    if (!clinic) {
      return Response.json({
        pending: [],
        recent: [],
        recentHasMore: false,
        totalCount: 0,
        todayCount: 0,
        dailyLimit,
        role: role || null,
        clinicName: null,
        logoUrl: null,
      });
    }

    const offset = Math.max(
      0,
      parseInt(new URL(request.url).searchParams.get("offset")) || 0
    );
    const firstPage = offset === 0;

    // 전체 문의 — 최신순 페이지 (clinic_id 명시 필터: superadmin RLS 우회 대비).
    const { data: recent, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const recentHasMore = (recent?.length || 0) === PAGE_SIZE;

    // 처리할 문의(미처리 직원확인)와 카운트는 첫 페이지에서만 — 더보기 시엔 불필요.
    // 처리할 문의는 페이지와 무관하게 "전량" 반환 (오래된 미처리 건도 누락 없이).
    let pending = [];
    let totalCount = 0;
    let todayCount = 0;
    if (firstPage) {
      const { data: pendingData } = await supabase
        .from("inquiries")
        .select("*")
        .eq("clinic_id", clinic.id)
        .eq("is_staff_required", true)
        .neq("status", "replied")
        .order("created_at", { ascending: false });
      pending = pendingData || [];

      const { count: tc } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinic.id);
      totalCount = tc || 0;

      const { count: dc } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinic.id)
        .gte("created_at", `${today}T00:00:00+09:00`)
        .lte("created_at", `${today}T23:59:59+09:00`);
      todayCount = dc || 0;
    }

    return Response.json({
      pending,
      recent: recent || [],
      recentHasMore,
      totalCount,
      todayCount,
      dailyLimit,
      role: role || null,
      clinicName: clinic.name,
      logoUrl: clinic.logo_url || null,
    });
  } catch (error) {
    console.error("DB 조회 오류:", error);
    return Response.json({
      pending: [],
      recent: [],
      recentHasMore: false,
      totalCount: 0,
      todayCount: 0,
      dailyLimit: 20,
      role: null,
    });
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
