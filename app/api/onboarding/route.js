// 신규 병원 온보딩 API. superadmin 전용.
// 한 번의 POST로 clinics + clinic_settings 생성 → 직원 Auth 계정 생성 → clinic_users 매핑.
// 중간 단계 실패 시 앞 단계를 되돌려(rollback) 반쪽짜리 병원이 남지 않게 한다.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

// slug: 영문 소문자/숫자/하이픈. 시작·끝은 영숫자.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
// 정적 라우트와 충돌하는 slug. demo- 접두는 챗봇이 데모로 취급(inquiries 미저장)하므로 실병원 금지.
const RESERVED_SLUGS = new Set(["admin", "api", "login", "demo"]);

// 신규 병원 기본 settings 골격. 어드민이 /admin/settings 에서 채워넣음.
function defaultSettings() {
  return {
    tone: "warm",
    hours: { weekday: "", saturday: "", lunch: "", closed: ["sun", "holiday"] },
    doctors_summary: "",
    departments: [],
    services: [],
    features: [],
    hours_notes: [],
    notices: [],
    substitute_holiday_policy: "",
    parking: "",
    reservation_note: "",
    current_event: "",
    disclaimer: "",
    chat_menu: { header: "무엇을 도와드릴까요?", items: [] },
  };
}

export async function POST(request) {
  try {
    const { user, role } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (role !== "superadmin") {
      return Response.json(
        { error: "운영자(superadmin)만 병원을 등록할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    const slug = (body.slug || "").trim().toLowerCase();
    const phone = (body.phone || "").trim() || null;
    const address = (body.address || "").trim() || null;
    const slogan = (body.slogan || "").trim() || null;
    const bookingUrl = (body.booking_url || "").trim() || null;
    const template = ["classic", "modern", "soft"].includes(body.template)
      ? body.template
      : "classic";
    const chatbotEnabled = body.chatbot_enabled !== false;
    const staffEmail = (body.staff_email || "").trim().toLowerCase();
    const staffPassword = body.staff_password || "";

    // 입력 검증
    if (!name) {
      return Response.json({ error: "병원명을 입력해 주세요." }, { status: 400 });
    }
    if (!SLUG_RE.test(slug)) {
      return Response.json(
        { error: "URL 식별자(slug)는 영문 소문자·숫자·하이픈만 사용할 수 있습니다." },
        { status: 400 }
      );
    }
    if (RESERVED_SLUGS.has(slug) || slug.startsWith("demo-")) {
      return Response.json(
        { error: `'${slug}'는 사용할 수 없는 식별자입니다. 다른 값을 입력해 주세요.` },
        { status: 400 }
      );
    }
    if (!staffEmail.includes("@")) {
      return Response.json(
        { error: "직원 로그인 이메일을 올바르게 입력해 주세요." },
        { status: 400 }
      );
    }
    if (staffPassword.length < 8) {
      return Response.json(
        { error: "직원 임시 비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // slug 중복 체크
    const { data: dupSlug } = await service
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (dupSlug) {
      return Response.json(
        { error: `이미 사용 중인 식별자입니다: ${slug}` },
        { status: 409 }
      );
    }

    // ── 1. 직원 Auth 계정 생성 (가장 실패 확률 높은 단계 — 먼저 처리해 rollback 최소화)
    const { data: createdAuth, error: authErr } =
      await service.auth.admin.createUser({
        email: staffEmail,
        password: staffPassword,
        email_confirm: true,
      });
    if (authErr || !createdAuth?.user) {
      const dup = /registered|already/i.test(authErr?.message || "");
      return Response.json(
        {
          error: dup
            ? "이미 등록된 이메일입니다. 다른 이메일을 사용해 주세요."
            : `직원 계정 생성 실패: ${authErr?.message || "알 수 없는 오류"}`,
        },
        { status: dup ? 409 : 500 }
      );
    }
    const staffUserId = createdAuth.user.id;

    // ── 2. clinics INSERT
    const { data: clinic, error: clinicErr } = await service
      .from("clinics")
      .insert({
        name,
        slug,
        phone,
        address,
        template,
        chatbot_enabled: chatbotEnabled,
        is_active: true,
      })
      .select()
      .single();
    if (clinicErr || !clinic) {
      await service.auth.admin.deleteUser(staffUserId);
      throw clinicErr || new Error("병원 생성 실패");
    }

    // ── 3. clinic_settings INSERT
    const { error: settingsErr } = await service
      .from("clinic_settings")
      .insert({
        clinic_id: clinic.id,
        slogan,
        booking_url: bookingUrl,
        settings: defaultSettings(),
      });
    if (settingsErr) {
      await service.from("clinics").delete().eq("id", clinic.id); // settings는 cascade
      await service.auth.admin.deleteUser(staffUserId);
      throw settingsErr;
    }

    // ── 4. clinic_users 매핑
    const { error: mapErr } = await service.from("clinic_users").insert({
      user_id: staffUserId,
      clinic_id: clinic.id,
      role: "admin",
    });
    if (mapErr) {
      await service.from("clinics").delete().eq("id", clinic.id);
      await service.auth.admin.deleteUser(staffUserId);
      throw mapErr;
    }

    // ── 5. 변경 이력 (best-effort)
    const { error: logErr } = await service.from("clinic_change_logs").insert({
      clinic_id: clinic.id,
      changed_by: user.id,
      changed_by_email: user.email,
      table_name: "clinics",
      record_id: clinic.id,
      action: "create",
      before: null,
      after: { name, slug, phone, address, template, chatbot_enabled: chatbotEnabled },
    });
    if (logErr) console.error("onboarding change_log error:", logErr);

    return Response.json({
      ok: true,
      clinic: { id: clinic.id, slug: clinic.slug, name: clinic.name },
      staffEmail,
    });
  } catch (error) {
    console.error("onboarding POST error:", error);
    return Response.json(
      { error: error.message || "병원 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
