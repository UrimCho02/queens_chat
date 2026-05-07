-- Multi-tenant schema: clinics, clinic_settings, clinic_faqs, clinic_change_logs
-- RLS is intentionally NOT enabled here. Policies will be added in a later
-- migration together with Supabase Auth setup (step 5).

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- clinics: 병원 테넌트 핵심 정보
-- slug 기반 URL 식별 (/[clinic]/...). 안정적이고 자주 조회되는 컬럼만 정규화.
-- ============================================================================
create table public.clinics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  phone       text,
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

create index clinics_active_slug_idx
  on public.clinics (slug)
  where is_active = true;

comment on table public.clinics is '병원 테넌트. slug는 URL 식별자 (/[clinic]/...).';
comment on column public.clinics.slug is 'URL용 식별자. 예: thequeens';


-- ============================================================================
-- clinic_settings: 병원별 어드민 편집 설정 (clinics와 1:1)
-- 진료시간/원장 정보처럼 병원마다 구조가 다를 수 있는 값은 settings JSONB에.
-- ============================================================================
create table public.clinic_settings (
  clinic_id    uuid primary key references public.clinics(id) on delete cascade,
  booking_url  text,
  slogan       text,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger clinic_settings_set_updated_at
  before update on public.clinic_settings
  for each row execute function public.set_updated_at();

comment on table public.clinic_settings is '병원별 어드민 편집 설정. 진료시간/원장 정보 등 구조 가변값은 settings JSONB.';
comment on column public.clinic_settings.settings is
  '예: { "hours": { "weekday":"10:00-19:00","lunch":"13:00-14:00","saturday":"09:00-14:00","closed":["sun","holiday"] }, "doctors":[...], "features":[...], "departments":[...] }';


-- ============================================================================
-- clinic_faqs: 병원별 FAQ (어드민에서 추가/수정 가능)
-- ============================================================================
create table public.clinic_faqs (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  question    text not null,
  answer      text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger clinic_faqs_set_updated_at
  before update on public.clinic_faqs
  for each row execute function public.set_updated_at();

create index clinic_faqs_clinic_active_idx
  on public.clinic_faqs (clinic_id, sort_order)
  where is_active = true;

comment on table public.clinic_faqs is '병원별 FAQ. 챗봇 시스템 프롬프트에 동적 주입 가능.';


-- ============================================================================
-- clinic_change_logs: 어드민 변경 이력 (/admin/logs)
-- before/after JSONB로 diff 추적.
-- changed_by FK는 step 5(Supabase Auth)에서 추가.
-- ============================================================================
create table public.clinic_change_logs (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  changed_by        uuid,
  changed_by_email  text,
  table_name        text not null,
  record_id         uuid,
  action            text not null check (action in ('create','update','delete')),
  before            jsonb,
  after             jsonb,
  created_at        timestamptz not null default now()
);

create index clinic_change_logs_clinic_recent_idx
  on public.clinic_change_logs (clinic_id, created_at desc);

comment on table public.clinic_change_logs is
  '어드민 변경 이력. table_name은 ''clinics''|''clinic_settings''|''clinic_faqs''. changed_by_email은 auth 계정 삭제 후에도 식별자 보존용.';
