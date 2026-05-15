-- 수술 후 회복 가이드. 원장님이 수술별 일정을 미리 등록하고 챗봇이 그대로 안내.
--
-- 의료법 정신:
--   - 챗봇은 의학적 판단 X, 원장님이 등록한 가이드 그대로 전달 O.
--   - 가이드 매칭 안 되거나 증상 동반된 질문은 STAFF_REQUIRED.
--
-- 데이터 구조:
--   - 수술 1개 = row 1개 (예: "자궁근종 수술")
--   - 일정 항목들은 items JSONB 배열: [{ day_from, day_to?, title, content }]
--   - day_to 가 null 이면 단일일, 채우면 범위 (예: 2~3일차 보행)

begin;

create table public.clinic_recovery_guides (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  name         text not null,                     -- 수술명
  description  text,                              -- 간단 설명 (선택)
  items        jsonb not null default '[]'::jsonb,
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger clinic_recovery_guides_set_updated_at
  before update on public.clinic_recovery_guides
  for each row execute function public.set_updated_at();

create index clinic_recovery_guides_clinic_active_idx
  on public.clinic_recovery_guides (clinic_id, sort_order)
  where is_active = true;

comment on table public.clinic_recovery_guides is
  '수술별 회복 가이드. items JSONB: [{day_from, day_to?, title, content}]. 챗봇이 시스템 프롬프트로 주입받아 환자 질문에 그대로 안내.';

-- ============================================================================
-- RLS — 5E 패턴
-- service_role bypass, anon 차단, authenticated 는 user_can_access_clinic.
-- INSERT 는 service_role 만 (어드민 API 가 service_role).
-- ============================================================================
alter table public.clinic_recovery_guides enable row level security;

create policy clinic_recovery_guides_select_for_members
  on public.clinic_recovery_guides for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

create policy clinic_recovery_guides_insert_for_members
  on public.clinic_recovery_guides for insert to authenticated
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_recovery_guides_update_for_members
  on public.clinic_recovery_guides for update to authenticated
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_recovery_guides_delete_for_members
  on public.clinic_recovery_guides for delete to authenticated
  using (public.user_can_access_clinic(clinic_id));

commit;
