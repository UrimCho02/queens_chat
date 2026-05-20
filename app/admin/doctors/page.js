import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";
import DoctorsManager from "./DoctorsManager";

export default async function DoctorsPage() {
  const { user, clinic } = await getCurrentClinic();
  if (!user) redirect("/login");

  if (!clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-gray-700 mb-2">병원 매핑이 없습니다.</div>
          <div className="text-sm text-gray-500">운영자에게 문의해 주세요.</div>
        </div>
      </div>
    );
  }

  const service = createServiceClient();
  const { data: row } = await service
    .from("clinic_settings")
    .select("settings")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  const raw = row?.settings?.doctor_images;
  const initialImages = Array.isArray(raw)
    ? raw.filter((u) => typeof u === "string" && u)
    : [];

  return (
    <DoctorsManager initialImages={initialImages} clinicName={clinic.name} />
  );
}
