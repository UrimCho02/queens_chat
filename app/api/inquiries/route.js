import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    const { count: todayCount } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lte("created_at", `${today}T23:59:59+09:00`);

    if (error) throw error;

    return Response.json({
      inquiries: data,
      todayCount: todayCount || 0,
      dailyLimit: parseInt(process.env.DAILY_LIMIT) || 50,
    });
  } catch (error) {
    console.error("DB 조회 오류:", error);
    return Response.json({ inquiries: [], todayCount: 0, dailyLimit: 50 });
  }
}

export async function DELETE(request) {
  try {
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