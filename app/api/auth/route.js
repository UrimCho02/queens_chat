import { NextResponse } from "next/server";

export async function POST(request) {
  const { password } = await request.json();
  
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_auth", password, {
      httpOnly: true,
      maxAge: 60 * 60 * 8, // 8시간
      path: "/",
    });
    return response;
  }
  
  return NextResponse.json({ ok: false }, { status: 401 });
}