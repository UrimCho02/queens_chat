import Anthropic from "@anthropic-ai/sdk";
import Pusher from "pusher";
import { createServiceClient } from "@/lib/supabase/service";
import { buildPrompt } from "@/lib/prompts/buildPrompt";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// 챗봇이 어느 병원을 대상으로 하는지 결정.
// 홈페이지(/[slug])에 임베드된 위젯이 ?clinic=<slug> 로 전달.
// 값이 없으면 더퀸즈 — 기존 `/` 단독 접속(쿼리 없는 챗봇 URL) 호환.
const DEFAULT_CLINIC_SLUG = "thequeens";
function resolveClinicSlug(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_CLINIC_SLUG;
}

const PERSONAL_INFO_PATTERNS = {
  phone: /01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g,
  ssn: /\d{6}[-\s]?[1-4]\d{6}/g,
  birthdate: /(19|20)\d{2}[-./\s]?(0[1-9]|1[0-2])[-./\s]?(0[1-9]|[12]\d|3[01])/g,
  // 한글 이름 (2~4자)는 너무 광범위해서 "제 이름은", "이름:", "성함:" 등 명시적 키워드 뒤에서만 감지
  name: /(제\s*이름은|이름은|성함은|이름\s*[:：]|성함\s*[:：])\s*([가-힣]{2,4})/g,
};

function containsPersonalInfo(text) {
  return (
    PERSONAL_INFO_PATTERNS.phone.test(text) ||
    PERSONAL_INFO_PATTERNS.ssn.test(text) ||
    PERSONAL_INFO_PATTERNS.birthdate.test(text) ||
    PERSONAL_INFO_PATTERNS.name.test(text)
  );
}

function maskPersonalInfo(text) {
  let masked = text;
  masked = masked.replace(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]");
  masked = masked.replace(/\d{6}[-\s]?[1-4]\d{6}/g, "[주민번호]");
  masked = masked.replace(/(19|20)\d{2}[-./\s]?(0[1-9]|1[0-2])[-./\s]?(0[1-9]|[12]\d|3[01])/g, "[생년월일]");
  masked = masked.replace(/(제\s*이름은|이름은|성함은|이름\s*[:：]|성함\s*[:：])\s*([가-힣]{2,4})/g, "$1 [이름]");
  return masked;
}

function isBusinessHours() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  const hour = kst.getHours();
  const minute = kst.getMinutes();
  const time = hour * 60 + minute;
  const isWeekday = day >= 1 && day <= 5;
  const isSaturday = day === 6;
  if (isWeekday) {
    const isLunch = time >= 13 * 60 && time < 14 * 60;
    return !isLunch && time >= 10 * 60 && time < 19 * 60;
  }
  if (isSaturday) return time >= 9 * 60 && time < 14 * 60;
  return false;
}

export async function GET(request) {
  const supabase = createServiceClient();
  const slug = resolveClinicSlug(
    new URL(request.url).searchParams.get("clinic")
  );
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, phone")
    .eq("slug", slug)
    .single();

  let currentEvent = "";
  let eventImageUrl = "";
  let disclaimer = "";
  let chatMenu = null;
  if (clinic?.id) {
    const { data: row } = await supabase
      .from("clinic_settings")
      .select("settings")
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    const s = row?.settings || {};
    currentEvent = s.current_event || "";
    eventImageUrl = s.event_image_url || "";
    disclaimer = s.disclaimer || "";

    const menu = s.chat_menu;
    const activeItems = Array.isArray(menu?.items)
      ? menu.items.filter((it) => it?.enabled && it?.label && it?.text)
      : [];
    if (activeItems.length > 0) {
      chatMenu = {
        header: menu.header || "궁금한 항목을 선택하세요",
        items: activeItems.map((it) => ({
          icon: it.icon || "",
          label: it.label,
          text: it.text,
        })),
      };
    }
  }

  return Response.json({
    isOpen: isBusinessHours(),
    clinicName: clinic?.name || "",
    clinicPhone: clinic?.phone || "",
    currentEvent,
    eventImageUrl,
    disclaimer,
    chatMenu,
  });
}

const sessionCounts = new Map();
const MAX_REQUESTS = 10;

export async function POST(request) {
  try {
    const supabase = createServiceClient();
    const { message, sessionId, clinicSlug } = await request.json();
    const slug = resolveClinicSlug(clinicSlug);

    // 1. 빈 메시지 체크
    if (!message?.trim()) {
      return Response.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    }

    // 2. 글자수 제한
    if (message.length > 200) {
      return Response.json(
        { error: "문의 내용이 너무 깁니다. 200자 이내로 입력해 주세요." },
        { status: 400 }
      );
    }

    // 병원 lookup (id, phone 필요)
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, phone, chatbot_enabled")
      .eq("slug", slug)
      .single();

    if (clinicError || !clinic) {
      console.error("Clinic lookup error:", clinicError);
      return Response.json(
        { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    // 데모 가상 병원(slug 'demo-' 접두)은 영업 시연용 — 실 직원이 없으므로
    // 문의를 inquiries 에 저장하지 않고 Pusher 알림도 보내지 않음.
    // (실제 병원 어드민 페이지/실시간 알림 오염 방지. 챗봇 AI 응답은 정상 작동.)
    const isDemo = slug.startsWith("demo-");

    // 챗봇 비활성 병원(비산부인과 데모 등) — 채팅 대신 안내문만 반환.
    // 가드레일(safety.js)이 산부인과 전용이라 비산부인과는 챗봇을 끔.
    if (clinic.chatbot_enabled === false) {
      return Response.json({
        reply:
          "이 페이지는 홈페이지 디자인 미리보기입니다. AI 챗봇 상담은 실제 도입 시 병원에 맞춰 제공됩니다.",
        isStaffRequired: false,
      });
    }

    // 3. 개인정보 감지 (LLM 호출 전 차단)
    if (containsPersonalInfo(message)) {
      const blockMessage = `개인정보 보호를 위해 성함, 연락처, 주민번호 등 개인을 식별할 수 있는 정보는 입력하지 말아주세요. 본인확인이 필요한 문의는 진료시간 내 전화(${clinic.phone})로 직접 문의해주시거나 내원 시 직원에게 안내받으실 수 있어요 😊`;

      if (!isDemo) {
        const maskedMessage = maskPersonalInfo(message);
        await supabase
          .from("inquiries")
          .insert({
            clinic_id: clinic.id,
            session_id: sessionId,
            user_message: maskedMessage,
            ai_draft: blockMessage,
            category: "기타",
            is_staff_required: false,
            status: "blocked",
          });
      }

      return Response.json({ reply: blockMessage, isStaffRequired: false });
    }

    // 4. 세션당 횟수 제한
    const count = sessionCounts.get(sessionId) || 0;
    if (count >= MAX_REQUESTS) {
      return Response.json(
        { error: `문의 횟수를 초과했습니다. 추가 문의는 전화로 해주세요. ${clinic.phone}` },
        { status: 429 }
      );
    }
    sessionCounts.set(sessionId, count + 1);

    // 5. 일일 문의 한도 체크 (병원별 카운트)
    const today = new Date().toISOString().split("T")[0];
    const { count: dailyCount, error: countError } = await supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinic.id)
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lte("created_at", `${today}T23:59:59+09:00`);

    if (!countError && dailyCount >= (parseInt(process.env.DAILY_LIMIT) || 20)) {
      return Response.json(
        { error: `오늘 상담 가능 횟수를 초과했습니다. 내일 다시 문의해 주시거나 전화로 문의해 주세요. ${clinic.phone}` },
        { status: 429 }
      );
    }

    // 6. AI 답변 생성 (병원별 시스템 프롬프트)
    const systemPrompt = await buildPrompt(clinic.id);
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const rawReply = response.content[0].text;

    // 7. 태그 파싱
    const isStaffRequired = rawReply.includes("STAFF_REQUIRED");
    const categoryMatch = rawReply.match(/CATEGORY:([^\n]+)/);
    const category = categoryMatch ? categoryMatch[1].trim() : "기타";
    const cleanReply = rawReply
      .replace("STAFF_REQUIRED", "")
      .replace(/CATEGORY:[^\n]+/, "")
      .trim();

    // 8~9. Supabase 저장 + Pusher 실시간 전송 — 데모 병원은 건너뜀.
    if (!isDemo) {
      const { data: inquiry, error: dbError } = await supabase
        .from("inquiries")
        .insert({
          clinic_id: clinic.id,
          session_id: sessionId,
          user_message: message,
          ai_draft: cleanReply,
          category,
          is_staff_required: isStaffRequired,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) console.error("DB 저장 오류:", dbError);

      await pusher.trigger("admin-channel", "new-inquiry", {
        id: inquiry?.id,
        sessionId,
        userMessage: message,
        aiDraft: cleanReply,
        isStaffRequired,
        category,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json({ reply: cleanReply, isStaffRequired });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
