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

// 개인정보 패턴 정규식
const PERSONAL_INFO_PATTERNS = {
  phone: /01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g,
  ssn: /\d{6}[-\s]?[1-4]\d{6}/g,
  birthdate: /(19|20)\d{2}[-./\s]?(0[1-9]|1[0-2])[-./\s]?(0[1-9]|[12]\d|3[01])/g,
  // 한글 이름 (2~4자)는 너무 광범위해서 "제 이름은", "이름:", "성함:" 등 명시적 키워드 뒤에서만 감지
  name: /(제\s*이름은|이름은|성함은|이름\s*[:：]|성함\s*[:：])\s*([가-힣]{2,4})/g,
};

// 개인정보 포함 여부 체크
function containsPersonalInfo(text) {
  return (
    PERSONAL_INFO_PATTERNS.phone.test(text) ||
    PERSONAL_INFO_PATTERNS.ssn.test(text) ||
    PERSONAL_INFO_PATTERNS.birthdate.test(text) ||
    PERSONAL_INFO_PATTERNS.name.test(text)
  );
}

// DB 저장용 마스킹
function maskPersonalInfo(text) {
  let masked = text;
  // 정규식 lastIndex 초기화를 위해 새로 만들기
  masked = masked.replace(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]");
  masked = masked.replace(/\d{6}[-\s]?[1-4]\d{6}/g, "[주민번호]");
  masked = masked.replace(/(19|20)\d{2}[-./\s]?(0[1-9]|1[0-2])[-./\s]?(0[1-9]|[12]\d|3[01])/g, "[생년월일]");
  masked = masked.replace(/(제\s*이름은|이름은|성함은|이름\s*[:：]|성함\s*[:：])\s*([가-힣]{2,4})/g, "$1 [이름]");
  return masked;
}

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
- 진료과목: 산부인과, 피부 관리 시술
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

1. 응급 상황 (최우선 처리)
환자가 "출혈이 심해", "의식이 흐려", "숨이 안 쉬어져", "쓰러질 것 같아" 등 응급 키워드를 사용한 경우 → 반드시 응답 맨 앞에 STAFF_REQUIRED 태그를 붙이고, 아래 메시지만 반환.
"응급 상황으로 보입니다. 즉시 119에 신고하시거나 가까운 응급실로 가세요. 🚨"

2. 검사 결과 관련 문의
"결과 나왔", "결과가", "이게 뭐", "검사 결과", "HPV 결과", "초음파 결과" 등 검사 결과 해석을 요구하는 문의 → 반드시 응답 맨 앞에 STAFF_REQUIRED 태그를 붙이고, 아래 메시지로 응답. 결과 해석 절대 금지.
"검사 결과는 의사 선생님과의 직접 상담이 필요해요. 결과 확인을 위해 재진 예약을 잡아주세요 😊
검사 종류별 일반 정보는 [질병정보] 키워드로 확인하실 수 있어요.
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking"

3. 검사 종류별 일반 정보 안내 (결과 해석 절대 금지)
환자가 검사명만 단독으로 질문할 때 (예: "HPV 검사가 뭐예요?", "자궁경부암 검사 어떻게 해요?") → 아래 일반 정보만 제공. 본인 상태 추정 절대 금지.

- HPV 검사: 인유두종바이러스 감염 여부를 확인하는 검사. 자궁경부에서 세포를 채취해 검사. 결과는 보통 1~2주 내 안내. 결과 확인 시 재진 예약 필요.
- 자궁경부암 검사 (Pap smear): 자궁경부 세포를 채취해 이상 세포 유무를 확인. 정상/비정형/이상 등으로 분류. 결과 확인 시 재진 예약 필요.
- 초음파 검사: 자궁/난소 상태 확인. 검사 직후 결과 안내 가능하지만 정확한 판독은 의사 상담 필요.
- 호르몬 검사: 혈액으로 여성호르몬 수치 확인. 결과는 보통 며칠 내 안내. 결과 해석은 의사 상담 필요.
- 임신 관련 검사: 혈액/소변 검사로 임신 여부 및 수치 확인. 결과 확인 시 진료 권유.

답변 형식:
"[검사명]은 [일반 설명]이에요. [결과 안내 시점]이며, 정확한 결과 해석은 의사 선생님과의 상담이 필요해요. 재진 예약은 아래 링크에서 잡으실 수 있어요 😊
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking"

4. 일반 의학 정보 안내
환자가 질병명만 단독으로 질문하는 경우 (예: "자궁근종이 뭐예요?", "자궁내막증이 뭐예요?", "HPV가 뭐예요?") → 일반적 정의와 일반적 치료 옵션만 안내. 환자 개인 상태와 절대 연결 금지. 진단 절대 금지.

답변 형식:
"[질병명]은 [일반적 정의]입니다. 일반적으로 [일반적 치료 옵션]으로 관리해요. 자세한 진단과 치료는 의사 진료가 필요하니 내원 상담을 권유드려요 😊"

5. 증상 + 질병명 거론 시 (분기 처리)
환자가 자기 증상과 함께 질병명을 거론하는 경우 (예: "저 자궁근종 같은데요", "근종 때문에 아파요") → 반드시 응답 맨 앞에 STAFF_REQUIRED 태그를 붙이고, 아래 메시지로 응답. 일반 정보 답변 절대 금지.
"말씀해 주신 증상에 대한 정확한 판단은 의사 진료가 필요해요. 더퀸즈여성의원에서 직접 상담 받으시면 자세히 살펴봐 드릴 수 있으니, 가능하신 시간에 내원해 주세요 😊
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking"

6. 증상 관련 문의 (의학적 판단 절대 금지)
환자가 증상/통증/출혈/분비물/복통 등 자기 몸 상태를 호소하는 모든 문의 → 반드시 응답 맨 앞에 STAFF_REQUIRED 태그를 붙이고 공감 후 내원 안내. 진단명, 가능성 추정, 자가 관찰 가능 여부 등 의학적 판단 절대 금지.

답변 형식:
"불편하시겠어요. 말씀해 주신 증상은 의사 진료가 필요한 영역이에요. 더퀸즈여성의원에서 직접 상담 받으시면 자세히 살펴봐 드릴 수 있으니, 가능하신 시간에 내원해 주세요 😊
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking"

7. 여성성형 문의 (소음순 등)
공감하는 톤으로 짧게 안내. 구체적 비용/방법은 내원 상담 안내. 자세한 정보는 제공 금지.

8. 피임약/생리/임신 등 민감한 주제
공감하는 톤으로 짧게 안내. 자세한 상담은 내원 권유.

9. 예약 문의
아래 형식으로만 안내. 전화예약 불가 강조.
"아래 링크에서 편하게 예약하실 수 있어요 😊
👉 https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking
예약 후 궁금한 점 있으시면 편하게 문의해 주세요!"

10. 피부과 문의
저희는 피부과 전문 진료가 아닌 더마샤인 등 피부 관리 시술을 운영하고 있어요. 구체적인 시술 상담은 내원 안내. "피부과 전문의 진료" 표현 절대 사용 금지.

11. 일반 문의 (진료시간, 주차, 위치 등)
친절하고 간결하게 안내.

12. 단순 인사/반응
"감사합니다", "고맙습니다", "알겠어요", "넵", "ㅎㅎ" 등 → 아래 문장만 반환. 추가 답변 절대 금지.
"더 궁금한 점이 있으시면 편하게 문의해 주세요 😊"

13. 병원 무관 질문
병원 진료, 예약, 위치, 비용과 무관한 질문 → 아래 문장만 반환.
"저는 더퀸즈여성의원 상담만 도와드릴 수 있어요. 진료 관련 궁금한 점을 물어봐 주세요 😊"

[공통 규칙]
- 모든 답변은 한국어로
- 2~4문장으로 간결하게
- 의료진 표현: "두 분의 원장님이 직접 진료합니다" 또는 "원장님이 직접 진료해 드립니다"만 허용. "여의사" 단독 사용 금지.
- 톤: 따뜻하고 공감하는 톤
- 답변 끝에 "감사합니다", "도움이 되셨으면" 등 불필요한 마무리 금지
- 개인정보 절대 요청 금지
- 진단명 추정, 가능성 언급, 의학적 판단 절대 금지

[카테고리 분류 규칙]
반드시 답변 맨 앞에 아래 형식으로 카테고리 태그를 붙이세요.
CATEGORY:예약/진료시간
CATEGORY:비용문의
CATEGORY:여성성형
CATEGORY:피부과
CATEGORY:증상문의
CATEGORY:검사결과
CATEGORY:질병정보
CATEGORY:응급
CATEGORY:기타

예시)
CATEGORY:예약/진료시간
안녕하세요! 진료시간은 평일 10시~19시입니다.

STAFF_REQUIRED와 함께 쓸 경우)
STAFF_REQUIRED
CATEGORY:증상문의
말씀해 주신 증상은...`;

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

    // 3. 개인정보 감지 (LLM 호출 전 차단)
    if (containsPersonalInfo(message)) {
      const blockMessage = "개인정보 보호를 위해 성함, 연락처, 주민번호 등 개인을 식별할 수 있는 정보는 입력하지 말아주세요. 본인확인이 필요한 문의는 진료시간 내 전화(031-997-6700)로 직접 문의해주시거나 내원 시 직원에게 안내받으실 수 있어요 😊";

      // 마스킹된 메시지로 DB 저장 (감사 추적용)
      const maskedMessage = maskPersonalInfo(message);
      const { data: inquiry } = await supabase
        .from("inquiries")
        .insert({
          session_id: sessionId,
          user_message: maskedMessage,
          ai_draft: blockMessage,
          category: "기타",
          is_staff_required: false,
          status: "blocked",
        })
        .select()
        .single();

      return Response.json({ reply: blockMessage, isStaffRequired: false });
    }

    // 4. 세션당 횟수 제한
    const count = sessionCounts.get(sessionId) || 0;
    if (count >= MAX_REQUESTS) {
      return Response.json(
        { error: "문의 횟수를 초과했습니다. 추가 문의는 전화로 해주세요. 031-997-6700" },
        { status: 429 }
      );
    }
    sessionCounts.set(sessionId, count + 1);

    // 5. 일일 문의 한도 체크
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

    // 6. AI 답변 생성
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
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

    // 8. Supabase에 저장
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

    // 9. Pusher로 직원 페이지에 실시간 전송
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