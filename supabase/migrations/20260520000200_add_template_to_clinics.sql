-- clinics.template — 홈페이지 템플릿 선택.
-- 병원마다 홈페이지가 시각적으로 다를 수 있도록 템플릿 키를 둠.
-- 데이터 모델(clinic_settings)·어드민은 템플릿과 무관하게 공유 — 보이는 레이아웃만 달라짐.
-- 값: classic | modern | soft. 알 수 없는 값이면 코드가 classic 으로 fallback.

alter table public.clinics
  add column template text not null default 'classic';

comment on column public.clinics.template is
  '홈페이지 템플릿 키 (classic|modern|soft). /[slug] 페이지가 이 값으로 템플릿 컴포넌트를 분기.';
