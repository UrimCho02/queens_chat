// 챗봇(/) 서버 컴포넌트.
//
// 역할:
//   1. generateMetadata — 동적 og:title 생성. KakaoTalk 등 링크 미리보기에
//      "더퀸즈여성의원 AI 상담"이 아니라 실제 접속한 병원 이름이 뜨도록.
//   2. 클라이언트 UI 는 ChatClient 컴포넌트에 위임.

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveSlugFromRequest } from "@/lib/clinicSlug";
import ChatClient from "./ChatClient";

// 슬러그가 비면 더퀸즈로 fallback — 기존 /api/chat 동작과 동일.
const DEFAULT_CLINIC_SLUG = "thequeens";

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const h = await headers();
  const host = h.get("host") || "";
  const slug = resolveSlugFromRequest(sp, host) || DEFAULT_CLINIC_SLUG;

  let clinicName = "";
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("clinics")
      .select("name")
      .eq("slug", slug)
      .maybeSingle();
    clinicName = data?.name || "";
  } catch {
    // 메타데이터는 best-effort. 실패 시 중립 타이틀.
  }

  const title = clinicName ? `${clinicName} AI 상담` : "AI 상담 채널";
  const description = clinicName
    ? `${clinicName} AI 상담 채널`
    : "병원 AI 상담 채널";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default function Page() {
  return <ChatClient />;
}
