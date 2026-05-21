-- clinics.chatbot_enabled — AI 챗봇 상담 사용 여부.
--
-- 사유: 챗봇 가드레일(lib/prompts/safety.js)이 산부인과 전용으로 하드코딩돼 있어
-- 비산부인과 병원에서 챗봇을 켜면 부적절한 답변(자궁경부암 검사 안내 등)이 나옴.
-- 홈페이지 템플릿은 진료과 무관하게 쓸 수 있으므로 챗봇만 분리해 끌 수 있게 함.
-- 향후 멀티 진료과 가드레일 도입 시 일반 병원도 true 로 전환.
--
-- false 인 경우: 홈페이지 챗봇 위젯 버튼은 그대로 노출되지만,
-- 열면 채팅 대신 안내문이 표시됨 (ChatWidget). API(/api/chat)도 안내문만 반환.

alter table public.clinics
  add column chatbot_enabled boolean not null default true;

-- 데모 비산부인과 병원 2곳은 챗봇 비활성.
update public.clinics
  set chatbot_enabled = false
  where slug in ('demo-internal', 'demo-pediatric');

comment on column public.clinics.chatbot_enabled is
  'AI 챗봇 사용 여부. false면 홈페이지 위젯은 보이되 챗봇은 안내문만 표시. 산부인과 전용 가드레일 한계로 비산부인과는 false.';
