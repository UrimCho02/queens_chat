import Pusher from "pusher";
import { supabase } from "@/lib/supabase";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  try {
    const { sessionId, reply, inquiryId } = await request.json();

    // DB status 업데이트
    if (inquiryId) {
      const { error } = await supabase
        .from("inquiries")
        .update({ status: "replied", final_reply: reply })
        .eq("id", inquiryId);

      if (error) console.error("DB 업데이트 오류:", error);
    }

    // 고객에게 실시간 전송
    await pusher.trigger(`client-${sessionId}`, "staff-reply", {
      reply,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Reply Error:", error);
    return Response.json({ error: "발송 실패" }, { status: 500 });
  }
}