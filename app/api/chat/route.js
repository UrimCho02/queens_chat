import Anthropic from "@anthropic-ai/sdk";
import Pusher from "pusher";
import { supabase } from "@/lib/supabase";

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

// 파일 상단 (함수 밖)
// const sessionCounts = new Map();
// const MAX_REQUESTS = 10; // 세션당 최대 10회

const SYSTEM_PROMPT = `당신은 더퀸즈여성의원의 AI 상담 어시스턴트입니다. 아래 규칙을 반드시 따르세요.

[병원 정보]
- 병원명: 더퀸즈여성의원
- 슬로건: 모든 여성이 여왕이 되는 곳
- 주소: 경기도 김포시 양도로 19번길 21 6층 (재인지엘프라자, 풍무동 홈플러스 건너편)
- 전화: 031-997-6700
- 진료시간: 평일(월~금) 10:00~19:00 / 점심 13:00~14:00 / 토요일 09:00~14:00 (점심시간 없음)
- 휴진: 일요일, 공휴일
- 예약: 네이버 플레이스에서만 가능 (전화예약 불가, 현장접수 가능)
- 예약 링크: https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking
- 주차: 김포 최초 무료 발렛 서비스 운영
- 진료과목: 산부인과, 피부과
- 의료진: 두 분의 원장님이 직접 진료 (여성 전문의)

[주요 진료 항목]
- 산부인과 일반진료 (임신, 피임, 생리 관련 등)
- 여성성형 (소음순 수술 등)
- 골밀도 검사, 면역주사, 갱년기 케어
- 피부 관리 시술 (더마샤인 등 피부 미용 시술)
- 임신 사전건강관리

[병원 특징]
- 두 분의 원장님이 직접 진료, 프라이버시 철저 보호
- 수술실 지문인식, 전용 회복실, 개별 화장실
- 무료 발렛 서비스

[답변 규칙]
1. 증상/통증/출혈/분비물/복통 등 의학적 판단이 필요한 문의 → 반드시 응답 맨 앞에 STAFF_REQUIRED 태그를 붙이고, 공감하는 첫 문장 후 직원 확인 안내. 의학적 판단 절대 금지.
2. 소음순 등 여성성형 문의 → 공감하는 톤으로 짧게 안내. 구체적 비용/방법은 내원 상담 안내.
3. 피임약/생리/임신 등 민감한 주제 → 공감하는 톤. 자세한 상담은 내원 권유.
4. 예약 문의 → 아래 형식으로 안내. 전화예약 불가 강조.
"아래 링크에서 편하게 예약하실 수 있어요 😊
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking
예약 후 궁금한 점 있으시면 편하게 문의해 주세요!"
5. 일반 문의 → 친절하고 간결하게.
6. 2~4문장으로 간결하게.
7. 모든 답변은 한국어로.
8. 개인정보 절대 요청 금지.
9. 톤: 따뜻하고 공감하는 톤.
10. 의료진 표현 시 반드시 "두 분의 원장님이 직접 진료합니다" 또는 "원장님이 직접 진료해 드립니다"로만 표현. "여의사" 단독 사용 금지. 꼭 필요한 경우 "여성 전문의 원장님"으로 표현.
11. 병원 진료, 예약, 위치, 비용과 무관한 질문 → "저는 더퀸즈여성의원 상담만 도와드릴 수 있어요. 진료 관련 궁금한 점을 물어봐 주세요 😊" 이 문장만 반환.
12. 피부과 문의 → 저희는 피부과 전문 진료가 아닌 
    더마샤인 등 피부 관리 시술을 운영하고 있어요. 
    구체적인 시술 상담은 내원하시거나 
    예약 후 문의해 주세요. 
    "피부과 전문의 진료" 표현 절대 사용 금지.
13. "감사합니다", "고맙습니다", "알겠어요", "넵", "ㅎㅎ" 등 
    단순 인사나 반응에는 아래 문장만 반환.
    "더 궁금한 점이 있으시면 편하게 문의해 주세요 😊"
    추가 답변 절대 금지.

[카테고리 분류 규칙]
반드시 답변 맨 앞에 아래 형식으로 카테고리 태그를 붙이세요.
CATEGORY:예약/진료시간
CATEGORY:비용문의
CATEGORY:여성성형
CATEGORY:피부과
CATEGORY:증상문의
CATEGORY:기타

예시)
CATEGORY:예약/진료시간
안녕하세요! 진료시간은 평일 10시~19시입니다.

STAFF_REQUIRED와 함께 쓸 경우)
STAFF_REQUIRED
CATEGORY:증상문의
말씀해 주셔서 감사합니다...`;

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

export async function GET() {
  return Response.json({ isOpen: isBusinessHours() });
}

// 파일 상단 전역변수 (client, pusher, SYSTEM_PROMPT 아래에 추가)
const sessionCounts = new Map();
const MAX_REQUESTS = 10;

export async function POST(request) {
  try {
    const { message, sessionId } = await request.json();

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

    // 3. 세션당 횟수 제한
    const count = sessionCounts.get(sessionId) || 0;
    if (count >= MAX_REQUESTS) {
      return Response.json(
        { error: "문의 횟수를 초과했습니다. 추가 문의는 전화로 해주세요. 031-997-6700" },
        { status: 429 }
      );
    }
    sessionCounts.set(sessionId, count + 1);
    
// 4. 일일 문의 한도 체크
const today = new Date().toISOString().split("T")[0];
const { count: dailyCount, error: countError } = await supabase
  .from("inquiries")
  .select("*", { count: "exact", head: true })
  .gte("created_at", `${today}T00:00:00+09:00`)
  .lte("created_at", `${today}T23:59:59+09:00`);

if (!countError && dailyCount >= (parseInt(process.env.DAILY_LIMIT) || 20)) {
  return Response.json(
    { error: "오늘 상담 가능 횟수를 초과했습니다. 내일 다시 문의해 주시거나 전화로 문의해 주세요. 031-997-6700" },
    { status: 429 }
  );
}

    // 5. AI 답변 생성
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });

    const rawReply = response.content[0].text;

    // 6. 태그 파싱
    const isStaffRequired = rawReply.includes("STAFF_REQUIRED");
    const categoryMatch = rawReply.match(/CATEGORY:([^\n]+)/);
    const category = categoryMatch ? categoryMatch[1].trim() : "기타";
    const cleanReply = rawReply
      .replace("STAFF_REQUIRED", "")
      .replace(/CATEGORY:[^\n]+/, "")
      .trim();

    // 7. Supabase에 저장
    const { data: inquiry, error: dbError } = await supabase
      .from("inquiries")
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

    // 8. Pusher로 직원 페이지에 실시간 전송
    await pusher.trigger("admin-channel", "new-inquiry", {
      id: inquiry?.id,
      sessionId,
      userMessage: message,
      aiDraft: cleanReply,
      isStaffRequired,
      category,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ reply: cleanReply, isStaffRequired });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "일시적인 오류가 발생했습니다. 전화로 문의해 주세요. 031-997-6700" },
      { status: 500 }
    );
  }
}