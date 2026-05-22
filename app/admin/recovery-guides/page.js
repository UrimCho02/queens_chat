import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";
import GuidesManager from "./GuidesManager";

export default async function RecoveryGuidesPage() {
  const { user, clinic, role } = await getCurrentClinic();
  if (!user) redirect("/login");
  if (role === "superadmin" && !clinic) redirect("/admin/clinics");

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
  const { data: guides } = await service
    .from("clinic_recovery_guides")
    .select("*")
    .eq("clinic_id", clinic.id)
    .order("sort_order");

  return (
    <GuidesManager
      initialGuides={guides || []}
      clinicName={clinic.name}
      logoUrl={clinic.logo_url}
      isSuperadmin={role === "superadmin"}
    />
  );
}
