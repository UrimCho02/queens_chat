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