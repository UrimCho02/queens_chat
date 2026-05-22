import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";
import OnboardingForm from "./OnboardingForm";

// 신규 병원 등록 페이지. superadmin 전용 — 일반 admin 은 /admin 으로 돌려보냄.
export default async function OnboardingPage() {
  const { user, role } = await getCurrentClinic();
  if (!user) redirect("/login");
  if (role !== "superadmin") redirect("/admin");

  return <OnboardingForm />;
}
