import Anthropic from "@anthropic-ai/sdk";
import Pusher from "pusher";
import { createServiceClient } from "@/lib/supabase/service";
import { buildPrompt } from "@/lib/prompts/buildPrompt";
import { clinicScoped } from "@/lib/db/clinicScoped";
import { getRequestHost, isOriginAllowed } from "@/lib/security/domainAllowlist";

// 미허용 도메인 차단 응답 (fail-fast).
const forbiddenResponse = () =>
  Response.json({ error: "허용되지 않은 접근입니다." }, { status: 403 });

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

// 개인정보 정규식 — containsPersonalInfo / maskPersonalInfo 공유.
// g 플래그를 의도적으로 빼둠. RegExp 객체에 g 플래그가 있으면 .test() 가 stateful
// 이라(호출 간 lastIndex 유지) 같은 텍스트를 연속 검사할 때 두 번째에 false 가
// 반환되는 함정이 있음. 마스킹할 때만 new RegExp(p, "g") 로 g 를 동적으로 붙여
// .replace() 가 모든 매치를 치환하게 함.
// 순서 주의: SSN 을 phone 보다 먼저. 무구분자 13자리(예: 9001011234567)에서
// phone 패턴이 안쪽 10자리를 먼저 가로채는 것을 막기 위함.
const PERSONAL_INFO_PATTERNS = {
  // 주민번호(뒷자리 1-4) + 외국인등록번호(뒷자리 5-8). 구분자 -, ., \s
  ssn: /\d{6}[-.\s]?[1-8]\d{6}/,
  // 휴대폰(01x) + 유선 02 + 유선 0[3-6]x. 구분자 -, ., \s
  phone: /0(2|[3-6][0-9]|1[0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}/,
  // 4자리 연도(19xx/20xx) 또는 2자리 연도. 구분자 -, ., /, \s, 또는 한글 년/월/일
  birthdate: /(?:(?:19|20)\d{2}|\d{2})[-./\s년]\s?(?:1[0-2]|0?[1-9])[-./\s월]\s?(?:3[01]|[12]\d|0?[1-9])일?/,
  // 한글 이름 (2~4자)는 너무 광범위해서 명시적 키워드 뒤에서만 감지.
  // 더 구체적인 키워드("환자 이름은" 등)를 더 일반적인 것("이름은") 앞에 둠 — 알터네이션 좌->우 우선.
  name: /(제\s*이름은|환자\s*이름은|예약자\s*이름은|이름은|성함은|예약자는|환자는|이름\s*[:：]|성함\s*[:：]|예약자\s*[:：]|환자\s*[:：])\s*([가-힣]{2,4})/,
};

// 마스킹 라벨. name 만 키워드 캡처를 보존하기 위해 $1 백레퍼런스 사용.
const MASK_LABELS = {
  phone: "[전화번호]",
  ssn: "[주민번호]",
  birthdate: "[생년월일]",
  name: "$1 [이름]",
};

function containsPersonalInfo(text) {
  return Object.values(PERSONAL_INFO_PATTERNS).some((p) => p.test(text));
}

function maskPersonalInfo(text) {
  let masked = text;
  for (const [key, pattern] of Object.entries(PERSONAL_INFO_PATTERNS)) {
    masked = masked.replace(new RegExp(pattern, "g"), MASK_LABELS[key]);
  }
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
    .select("id, name, phone, chatbot_enabled, template, logo_url, allowed_domains")
    .eq("slug", slug)
    .single();

  // 도메인 화이트리스트 검사 — 위젯 무단 임베드 차단 (allowed_domains 설정 시에만).
  if (!isOriginAllowed(getRequestHost(request), clinic?.allowed_domains)) {
    return forbiddenResponse();
  }

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
    chatbotEnabled: clinic?.chatbot_enabled !== false,
    template: clinic?.template || "classic",
    logoUrl: clinic?.logo_url || "",
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
      .select("id, phone, chatbot_enabled, allowed_domains")
      .eq("slug", slug)
      .single();

    if (clinicError || !clinic) {
      console.error("Clinic lookup error:", clinicError);
      return Response.json(
        { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    // 도메인 화이트리스트 검사 — 위젯 무단 임베드 차단 (allowed_domains 설정 시에만).
    if (!isOriginAllowed(getRequestHost(request), clinic.allowed_domains)) {
      return forbiddenResponse();
    }

    // 이후 inquiries 조회/저장은 모두 이 헬퍼로 — clinic_id 누락/오기입 구조적 차단.
    const inquiries = clinicScoped(supabase, "inquiries", clinic.id);

    // 데모 가상 병원(slug 'demo-' 접두)은 영업 시연용 — 실 직원이 없으므로
    // 문의를 inquiries 에 저장하지 않고 Pusher 알림도 보내지 않음.
    // (실제 병원 어드민 페이지/실시간 알림 오염 방지. 챗봇 AI 응답은 정상 작동.)
    const isDemo = slug.startsWith("demo-");

    // 챗봇 비활성 병원 — 채팅 대신 안내문만 반환.
    // (safety/ 가 진료과별로 분리돼 있어 새 진료과는 모듈 추가 시까지 비활성.)
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
        await inquiries.insert({
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
    const { count: dailyCount, error: countError } = await inquiries
      .select("*", { count: "exact", head: true })
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
      const { data: inquiry, error: dbError } = await inquiries
        .insert({
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
