-- clinics.allowed_domains: 챗봇 위젯 임베드 허용 도메인 화이트리스트.
-- 위젯이 무단으로 타 사이트에 임베드되어 API 비용이 소모되는 것을 막기 위한 방어층.
--
-- 동작: 비어있으면(기본 '{}') 제한 없음 — 기존 병원(더퀸즈 등) 영향 없음.
--       값이 있으면 /api/chat 이 요청 Origin/Referer 호스트를 이 목록과 대조,
--       미허용 도메인은 403 차단. localhost/127.0.0.1/*.vercel.app 은 항상 예외 허용.
--
-- 한계(중요): iframe 임베드 시 API 요청의 Origin 은 부모 사이트가 아니라
--   iframe 출처(queens-chat.vercel.app)로 잡힘. 따라서 iframe 무단 임베드의
--   실효 차단은 frame-ancestors CSP 병행이 필요. (WORK_LOG 2026-06-01 참고.)
--   이 컬럼/API 검사는 직접 cross-origin API 호출 abuse 를 막는 방어층 + CSP 의 데이터 소스.
--
-- 예시: update clinics set allowed_domains = '{thequeens.co.kr, www.thequeens.co.kr}' where slug = 'thequeens';

alter table public.clinics
  add column if not exists allowed_domains text[] not null default '{}';

comment on column public.clinics.allowed_domains is
  '챗봇 위젯 임베드 허용 도메인 목록. 비어있으면 제한 없음. 호스트명만(스킴/경로 없이) 저장. 서브도메인은 상위 도메인 등록 시 자동 허용.';
