-- clinics.specialty — 진료과 식별자.
--
-- 사유: 챗봇 가드레일(lib/prompts/safety/*)이 진료과별로 다른 룰을 적용.
-- 산부인과 외 진료과(내과·소아과)도 챗봇을 정상 작동시키기 위해 도입.
-- buildPrompt 가 이 컬럼을 읽어 specialty 별 safety 모듈을 합성.
--
-- 값: obgyn | internal | pediatric (확장 가능, 새 진료과 추가 시 CHECK 갱신).
-- 기본값 obgyn — 기존 단일테넌트(더퀸즈) 호환.

alter table public.clinics
  add column specialty text not null default 'obgyn'
  check (specialty in ('obgyn', 'internal', 'pediatric'));

-- 데모 비산부인과 병원 2곳 — specialty 지정 + 챗봇 활성화.
-- (지금까지 chatbot_enabled=false 였던 건 가드레일 한계 때문.
--  멀티 진료과화로 그 한계가 풀려서 true 로 전환.)
update public.clinics
  set specialty = 'internal', chatbot_enabled = true
  where slug = 'demo-internal';

update public.clinics
  set specialty = 'pediatric', chatbot_enabled = true
  where slug = 'demo-pediatric';

comment on column public.clinics.specialty is
  '진료과. safety/{specialty}.js 모듈을 buildPrompt가 합성. obgyn|internal|pediatric.';
