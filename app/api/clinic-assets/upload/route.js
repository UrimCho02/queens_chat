// 병원 에셋(이벤트 이미지 등) 업로드. service_role 로 Storage 에 저장하고 public URL 반환.
// 폴더 구조 {clinic_id}/event/{uuid}.{ext} — 멀티테넌트 격리.

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentClinic } from "@/lib/auth/getCurrentClinic";

const BUCKET = "clinic-assets";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request) {
  try {
    const { user, clinic } = await getCurrentClinic();
    if (!user) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!clinic) {
      return Response.json({ error: "병원 매핑이 없습니다." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return Response.json(
        { error: "jpg, png, webp 이미지만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "이미지 크기는 2MB 이하만 가능합니다." },
        { status: 400 }
      );
    }

    const path = `${clinic.id}/event/${crypto.randomUUID()}.${ext}`;

    const service = createServiceClient();
    const { error: uploadErr } = await service.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadErr) throw uploadErr;

    const {
      data: { publicUrl },
    } = service.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({ url: publicUrl, path });
  } catch (e) {
    console.error("clinic-assets upload error:", e);
    return Response.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
