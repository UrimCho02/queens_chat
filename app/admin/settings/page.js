import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
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
  const { data: settings } = await service
    .from("clinic_settings")
    .select("slogan, booking_url, settings")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  return (
    <SettingsForm
      initial={{
        name: clinic.name || "",
        phone: clinic.phone || "",
        address: clinic.address || "",
        slogan: settings?.slogan || "",
        booking_url: settings?.booking_url || "",
        settings: settings?.settings || {},
      }}
    />
  );
}
