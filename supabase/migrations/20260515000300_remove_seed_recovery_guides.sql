-- 더퀸즈 자궁근종 시드 제거.
--
-- 결정 변경 (2026-05-15, 사용자 피드백): 회복 가이드는 100% 원장님이 직접 입력.
-- 이유: 시드 데이터가 placeholder인데도 챗봇은 "원장님께서 안내드린 회복 가이드에
-- 따르면…" 으로 답변. 검토 안 된 의학 정보가 "원장님 안내"로 환자에게 전달될 위험.
-- 데이터가 없으면 챗봇은 모든 수술 후 질문을 STAFF_REQUIRED 로 처리 → 안전 사이드.
--
-- 시드 마이그레이션 20260515000200_seed_thequeens_recovery_guides.sql 자체는
-- 히스토리 보존을 위해 그대로 둔다. 이 마이그레이션은 그 데이터만 제거.

begin;

delete from public.clinic_recovery_guides
where clinic_id = (select id from public.clinics where slug = 'thequeens')
  and name = '자궁근종 수술';

commit;
