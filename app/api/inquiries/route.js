import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return Response.json({ inquiries: data });
  } catch (error) {
    console.error("DB 조회 오류:", error);
    return Response.json({ inquiries: [] });
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