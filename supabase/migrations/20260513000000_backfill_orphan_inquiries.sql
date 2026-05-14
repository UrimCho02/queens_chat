-- 단계 4 백필(20260507000200) 이후 ~ 단계 6(chat 코드에 clinic_id INSERT 추가, 2026-05-11)
-- 이전에 들어온 inquiries 중 clinic_id 가 NULL 인 행을 더퀸즈로 백필.
--
-- 왜 필요한가: 5E RLS 정책이 inquiries.clinic_id 기준으로 접근을 제어한다.
-- clinic_id 가 NULL 이면 user_can_access_clinic(NULL) 이 false 가 되어
-- 어드민이 해당 문의를 영영 못 보게 된다. RLS 켜기 전에 반드시 정리.
--
-- 현재 단일 병원(더퀸즈) 운영이므로 NULL 행은 모두 더퀸즈 문의로 간주 가능.
-- (적용 전 사전 점검에서 10개 행이 단계 4~6 사이 정상 환자 문의임을 확인함.)

begin;

update public.inquiries
set clinic_id = (select id from public.clinics where slug = 'thequeens')
where clinic_id is null;

commit;
