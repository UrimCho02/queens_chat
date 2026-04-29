import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  try {
    const { sessionId, reply } = await request.json();

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