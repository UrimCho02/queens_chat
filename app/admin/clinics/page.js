import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";
import ClinicsConsole from "./ClinicsConsole";

// superadmin 운영 콘솔 — 전체 병원 목록. superadmin 전용.
export default async function ClinicsPage() {
  const { user, role } = await getCurrentClinic();
  if (!user) redirect("/login");
  if (role !== "superadmin") redirect("/admin");

  const service = createServiceClient();
  const { data: clinics } = await service
    .from("clinics")
    .select("id, slug, name, phone, template, chatbot_enabled, is_active, created_at")
    .order("created_at");

  return <ClinicsConsole clinics={clinics || []} />;
}
