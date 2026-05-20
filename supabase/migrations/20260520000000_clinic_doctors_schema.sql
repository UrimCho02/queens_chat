-- 의료진 소개. 병원별로 의료진 카드(이름/직책/이력/사진)를 등록하고
-- 홈페이지 의료진 섹션에 노출. 챗봇 프롬프트와는 무관 (홈페이지 전용).
--
-- 데이터 구조:
--   - 의료진 1명 = row 1개
--   - photo_url 은 Storage clinic-assets 버킷의 public URL (kind=doctor)
--   - sort_order 오름차순으로 홈페이지에 노출, is_active=false 는 숨김

begin;

create table public.clinic_doctors (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  name        text not null,                     -- 의료진 이름
  title       text,                              -- 직책 (예: 대표원장, 산부인과 전문의)
  bio         text,                              -- 이력/소개
  photo_url   text,                              -- 프로필 사진 URL (선택)
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger clinic_doctors_set_updated_at
  before update on public.clinic_doctors
  for each row execute function public.set_updated_at();

create index clinic_doctors_clinic_active_idx
  on public.clinic_doctors (clinic_id, sort_order)
  where is_active = true;

comment on table public.clinic_doctors is
  '병원 의료진 소개. 홈페이지 의료진 섹션에 카드로 노출. sort_order 오름차순.';

-- ============================================================================
-- RLS — 5E 패턴
-- service_role bypass, anon 차단, authenticated 는 user_can_access_clinic.
-- 홈페이지(/[slug])는 service_role 로 조회하므로 anon SELECT 불필요.
-- ============================================================================
alter table public.clinic_doctors enable row level security;

create policy clinic_doctors_select_for_members
  on public.clinic_doctors for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

create policy clinic_doctors_insert_for_members
  on public.clinic_doctors for insert to authenticated
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_doctors_update_for_members
  on public.clinic_doctors for update to authenticated
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_doctors_delete_for_members
  on public.clinic_doctors for delete to authenticated
  using (public.user_can_access_clinic(clinic_id));

commit;
