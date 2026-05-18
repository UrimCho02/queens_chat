// /admin/settings 페이지에서 호출하는 저장 API.
// clinics(name/phone/address) + clinic_settings(slogan/booking_url/settings) 업데이트하고
// 변경된 테이블별로 clinic_change_logs INSERT.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

const ASSET_BUCKET = "clinic-assets";

// public URL → bucket 내부 path. 다른 도메인/버킷이면 null.
function extractAssetPath(url) {
  if (!url || typeof url !== "string") return null;
  const marker = `/${ASSET_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function POST(request) {
  try {
    const { user, clinic } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!clinic) {
      return Response.json({ error: "병원 매핑이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, address, slogan, booking_url, settings } = body;

    const service = createServiceClient();

    // before snapshot
    const { data: clinicBefore } = await service
      .from("clinics")
      .select("name, phone, address")
      .eq("id", clinic.id)
      .single();

    const { data: settingsBefore } = await service
      .from("clinic_settings")
      .select("slogan, booking_url, settings")
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    // update clinics
    const { error: clinicUpdateErr } = await service
      .from("clinics")
      .update({ name, phone, address })
      .eq("id", clinic.id);

    if (clinicUpdateErr) throw clinicUpdateErr;

    // upsert clinic_settings (settings row가 없는 신규 병원 대비)
    const { error: settingsUpsertErr } = await service
      .from("clinic_settings")
      .upsert({
        clinic_id: clinic.id,
        slogan,
        booking_url,
        settings,
      });

    if (settingsUpsertErr) throw settingsUpsertErr;

    // 옛 이벤트 이미지 cleanup — URL 이 바뀌거나 비워졌으면 Storage 파일 삭제.
    // 본인 clinic 폴더(`{clinic.id}/`) 내부 경로만 지움 (격리 방어).
    const oldImageUrl = settingsBefore?.settings?.event_image_url || "";
    const newImageUrl = settings?.event_image_url || "";
    if (oldImageUrl && oldImageUrl !== newImageUrl) {
      const path = extractAssetPath(oldImageUrl);
      if (path && path.startsWith(`${clinic.id}/`)) {
        const { error: removeErr } = await service.storage
          .from(ASSET_BUCKET)
          .remove([path]);
        if (removeErr) console.error("asset cleanup error:", removeErr);
      }
    }

    // change log
    const clinicAfter = { name, phone, address };
    const settingsAfter = { slogan, booking_url, settings };

    const logs = [];
    if (
      clinicBefore &&
      JSON.stringify(clinicBefore) !== JSON.stringify(clinicAfter)
    ) {
      logs.push({
        clinic_id: clinic.id,
        changed_by: user.id,
        changed_by_email: user.email,
        table_name: "clinics",
        record_id: clinic.id,
        action: "update",
        before: clinicBefore,
        after: clinicAfter,
      });
    }
    if (
      JSON.stringify(settingsBefore || {}) !== JSON.stringify(settingsAfter)
    ) {
      logs.push({
        clinic_id: clinic.id,
        changed_by: user.id,
        changed_by_email: user.email,
        table_name: "clinic_settings",
        record_id: clinic.id,
        action: settingsBefore ? "update" : "create",
        before: settingsBefore || null,
        after: settingsAfter,
      });
    }

    if (logs.length > 0) {
      const { error: logErr } = await service
        .from("clinic_change_logs")
        .insert(logs);
      if (logErr) console.error("change_logs insert error:", logErr);
    }

    return Response.json({ ok: true, changed: logs.length });
  } catch (error) {
    console.error("clinic-settings POST error:", error);
    return Response.json(
      { error: error.message || "저장 실패" },
      { status: 500 }
    );
  }
}
