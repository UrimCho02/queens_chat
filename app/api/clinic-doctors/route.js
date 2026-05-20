// 의료진 소개 이미지 저장. /admin/doctors 페이지에서 호출.
// 의료진 소개는 "제목+일러스트+이름+이력"이 한 장에 박힌 이미지(네이버 플레이스 스타일).
// 의사 1명당 이미지 1장 → clinic_settings.settings.doctor_images (URL 문자열 배열)로 관리.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

const ASSET_BUCKET = "clinic-assets";

// public URL → bucket 내부 path. {clinic_id}/ 로 시작할 때만 반환 (격리 방어).
function extractOwnedPath(url, clinicId) {
  if (!url || typeof url !== "string") return null;
  const marker = `/${ASSET_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  return path.startsWith(`${clinicId}/`) ? path : null;
}

export async function PUT(request) {
  try {
    const { user, clinic } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!clinic) {
      return Response.json({ error: "병원 매핑이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const newImages = Array.isArray(body.doctor_images)
      ? body.doctor_images
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter(Boolean)
      : [];

    const service = createServiceClient();

    const { data: before } = await service
      .from("clinic_settings")
      .select("slogan, booking_url, settings")
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    const oldSettings = before?.settings || {};
    const oldImages = Array.isArray(oldSettings.doctor_images)
      ? oldSettings.doctor_images
      : [];

    if (JSON.stringify(oldImages) === JSON.stringify(newImages)) {
      return Response.json({ ok: true, changed: 0 });
    }

    const newSettings = { ...oldSettings };
    if (newImages.length) newSettings.doctor_images = newImages;
    else delete newSettings.doctor_images;

    const { error: upsertErr } = await service
      .from("clinic_settings")
      .upsert({
        clinic_id: clinic.id,
        slogan: before?.slogan ?? null,
        booking_url: before?.booking_url ?? null,
        settings: newSettings,
      });

    if (upsertErr) throw upsertErr;

    // 사라진 이미지 파일 정리 (best-effort, 본인 clinic 폴더만).
    const newSet = new Set(newImages);
    const removePaths = oldImages
      .filter((u) => !newSet.has(u))
      .map((u) => extractOwnedPath(u, clinic.id))
      .filter(Boolean);
    if (removePaths.length > 0) {
      const { error: rmErr } = await service.storage
        .from(ASSET_BUCKET)
        .remove(removePaths);
      if (rmErr) console.error("의료진 옛 이미지 삭제 실패:", rmErr);
    }

    const settingsAfter = {
      slogan: before?.slogan ?? null,
      booking_url: before?.booking_url ?? null,
      settings: newSettings,
    };
    const { error: logErr } = await service.from("clinic_change_logs").insert({
      clinic_id: clinic.id,
      changed_by: user.id,
      changed_by_email: user.email,
      table_name: "clinic_settings",
      record_id: clinic.id,
      action: before ? "update" : "create",
      before: before || null,
      after: settingsAfter,
    });
    if (logErr) console.error("change_logs insert error:", logErr);

    return Response.json({ ok: true, changed: 1, doctor_images: newImages });
  } catch (e) {
    console.error("clinic-doctors PUT error:", e);
    return Response.json({ error: e.message || "저장 실패" }, { status: 500 });
  }
}
