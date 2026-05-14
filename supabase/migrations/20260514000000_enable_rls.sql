-- substep 5E: RLS 일괄 활성화.
--
-- 설계 원칙
--   - service_role 은 RLS bypass (자동). 별도 정책 없음.
--   - anon 은 public 스키마 어떤 테이블에도 직접 access 못함 — 정책을 authenticated 에만 부여.
--   - authenticated 는 본인 매핑 clinic 또는 superadmin 이면 통과.
--
-- 영향받는 코드 경로 (감사 결과)
--   - /api/inquiries GET/DELETE  — server client (cookie auth) — authenticated 정책 통과 필요
--   - /api/reply       UPDATE     — server client                — authenticated 정책 통과 필요
--   - 그 외 admin/chat 모든 경로는 service_role 사용 — 영향 없음.
--
-- 헬퍼 함수 (5A에서 SECURITY DEFINER 로 정의됨)
--   - public.is_superadmin()
--   - public.user_can_access_clinic(p_clinic_id uuid)

begin;

-- ============================================================================
-- clinics
-- ============================================================================
alter table public.clinics enable row level security;

create policy clinics_select_for_members
  on public.clinics for select to authenticated
  using (public.user_can_access_clinic(id));

create policy clinics_update_for_members
  on public.clinics for update to authenticated
  using (public.user_can_access_clinic(id))
  with check (public.user_can_access_clinic(id));

-- INSERT/DELETE 는 service_role 만 (SaaS 운영자가 새 병원 온보딩 시).

-- ============================================================================
-- clinic_settings
-- ============================================================================
alter table public.clinic_settings enable row level security;

create policy clinic_settings_select_for_members
  on public.clinic_settings for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

create policy clinic_settings_insert_for_members
  on public.clinic_settings for insert to authenticated
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_settings_update_for_members
  on public.clinic_settings for update to authenticated
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

-- ============================================================================
-- clinic_faqs
-- ============================================================================
alter table public.clinic_faqs enable row level security;

create policy clinic_faqs_select_for_members
  on public.clinic_faqs for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

create policy clinic_faqs_insert_for_members
  on public.clinic_faqs for insert to authenticated
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_faqs_update_for_members
  on public.clinic_faqs for update to authenticated
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

create policy clinic_faqs_delete_for_members
  on public.clinic_faqs for delete to authenticated
  using (public.user_can_access_clinic(clinic_id));

-- ============================================================================
-- inquiries
--   INSERT 는 service_role(챗봇)만. authenticated 에는 INSERT 정책 부여 안 함.
-- ============================================================================
alter table public.inquiries enable row level security;

create policy inquiries_select_for_members
  on public.inquiries for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

create policy inquiries_update_for_members
  on public.inquiries for update to authenticated
  using (public.user_can_access_clinic(clinic_id))
  with check (public.user_can_access_clinic(clinic_id));

create policy inquiries_delete_for_members
  on public.inquiries for delete to authenticated
  using (public.user_can_access_clinic(clinic_id));

-- ============================================================================
-- clinic_change_logs
--   INSERT 는 어드민 API 가 service_role 로 직접 박는다. authenticated SELECT 만.
-- ============================================================================
alter table public.clinic_change_logs enable row level security;

create policy clinic_change_logs_select_for_members
  on public.clinic_change_logs for select to authenticated
  using (public.user_can_access_clinic(clinic_id));

-- ============================================================================
-- superadmins
--   정책 없음 → service_role 만 access. is_superadmin() 은 SECURITY DEFINER 라 우회.
-- ============================================================================
alter table public.superadmins enable row level security;

-- ============================================================================
-- clinic_users
--   정책 없음 → service_role 만 access. user_can_access_clinic() 도 SECURITY DEFINER.
-- ============================================================================
alter table public.clinic_users enable row level security;

commit;
