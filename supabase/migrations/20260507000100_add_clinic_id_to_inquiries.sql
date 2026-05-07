-- Add clinic_id to inquiries (multi-tenant scoping)
--
-- 지금은 NULL 허용으로 추가합니다. 기존 더퀸즈 데이터가 모두 NULL이 되는데,
-- step 4(데이터 마이그레이션)에서 더퀸즈 clinic_id로 채운 뒤 NOT NULL로 잠급니다.
-- ON DELETE CASCADE: 병원 레코드가 하드 삭제되면 해당 병원 문의도 함께 삭제.
-- (보존이 필요하면 clinics.is_active=false로 소프트 삭제 사용)

alter table public.inquiries
  add column clinic_id uuid references public.clinics(id) on delete cascade;

create index inquiries_clinic_recent_idx
  on public.inquiries (clinic_id, created_at desc);

comment on column public.inquiries.clinic_id is
  '문의가 접수된 병원. step 4에서 기존 행 백필 후 NOT NULL로 변경 예정.';
