// 병원 홈페이지 (공개 페이지, 비인증).
// 데이터 조회 → clinic.template 으로 템플릿 컴포넌트 분기 → 렌더.
// ?template=<key> 쿼리로 미리보기 override (영업 시 같은 데이터를 템플릿별로 보여주기 위함).

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import ChatWidget from "./ChatWidget";
import { buildHomeData } from "./templates/shared";
import ClassicTemplate from "./templates/ClassicTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import SoftTemplate from "./templates/SoftTemplate";

const TEMPLATES = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  soft: SoftTemplate,
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!clinic) return { title: "병원을 찾을 수 없습니다" };
  return {
    title: clinic.name,
    description: `${clinic.name} 공식 홈페이지`,
  };
}

export default async function ClinicHomepage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const supabase = createServiceClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, phone, address, logo_url, template, chatbot_enabled")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!clinic) notFound();

  const { data: row } = await supabase
    .from("clinic_settings")
    .select("slogan, booking_url, settings")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  const data = buildHomeData(clinic, row, slug);

  // 템플릿 선택: ?template= override > clinic.template > classic fallback.
  const override = typeof sp.template === "string" ? sp.template : "";
  const templateKey = TEMPLATES[override]
    ? override
    : TEMPLATES[clinic.template]
    ? clinic.template
    : "classic";
  const Template = TEMPLATES[templateKey];

  return (
    <>
      <Template data={data} />
      <ChatWidget slug={slug} chatbotEnabled={clinic.chatbot_enabled} />
    </>
  );
}
