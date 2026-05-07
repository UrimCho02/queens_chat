-- substep 5A: Auth 관련 스키마와 헬퍼 함수
--
-- - superadmins: SaaS 운영자 (본인 계정 등록용). clinic_users와 분리해 명확화.
-- - clinic_users: 사용자-병원 매핑 (한 사용자가 여러 병원 admin 가능)
-- - clinic_change_logs.changed_by FK → auth.users(id)
-- - 헬퍼 함수: is_superadmin(), user_can_access_clinic()
--
-- RLS 정책은 이 단계에서 켜지 않음. 로그인/서비스롤 클라이언트가 준비된 뒤
-- 마지막 단계(5E)에서 일괄 활성화한다.

begin;

-- ============================================================================
-- superadmins
-- ============================================================================
create table public.superadmins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.superadmins is
  'SaaS 운영자. 여기 등록된 사용자는 모든 병원 관리 가능. Studio에서 직접 INSERT.';

-- ============================================================================
-- clinic_users
-- ============================================================================
create table public.clinic_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  unique (user_id, clinic_id)
);

create index clinic_users_user_idx   on public.clinic_users (user_id);
create index clinic_users_clinic_idx on public.clinic_users (clinic_id);

comment on table public.clinic_users is
  '사용자-병원 매핑. 한 사용자가 여러 병원 admin 가능 (다중 병원 컨설턴트 등).';

-- ============================================================================
-- clinic_change_logs.changed_by → auth.users FK
-- 계정 삭제 시 SET NULL: 변경 이력은 보존, 식별자만 비움 (changed_by_email은 남음)
-- ============================================================================
alter table public.clinic_change_logs
  add constraint clinic_change_logs_changed_by_fkey
  foreign key (changed_by) references auth.users(id) on delete set null;

-- ============================================================================
-- 헬퍼 함수
-- SECURITY DEFINER로 정의해 RLS 우회 (정책에서 self-recursion 방지)
-- ============================================================================
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.superadmins where user_id = auth.uid()
  );
$$;

create or replace function public.user_can_access_clinic(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin() or exists (
    select 1 from public.clinic_users
    where user_id = auth.uid() and clinic_id = p_clinic_id
  );
$$;

comment on function public.is_superadmin() is
  '현재 인증된 사용자가 superadmin인지 확인. anon이면 false.';
comment on function public.user_can_access_clinic(uuid) is
  '현재 사용자가 해당 병원에 접근 가능한지 (superadmin이거나 clinic_users 매핑 존재).';

commit;
