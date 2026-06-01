-- 데모 가상 병원 3곳의 booking_url 채우기.
-- 계기: booking_url 이 null 이라 챗봇이 예약 안내 시 "[예약 링크]" 가짜 텍스트를
--       임의로 생성 (2026-06-01 데모 챗봇 테스트에서 발견).
-- 선택: 실제로 렌더링되는 각 데모 홈페이지 URL — 영업 시연 중 클릭해도 404 안 남.
--       (데모 홈페이지에 예약 섹션 존재. 추후 실제 예약 링크로 교체 가능.)

update public.clinic_settings cs
set booking_url = 'https://queens-chat.vercel.app/demo-obgyn'
from public.clinics c
where cs.clinic_id = c.id and c.slug = 'demo-obgyn';

update public.clinic_settings cs
set booking_url = 'https://queens-chat.vercel.app/demo-internal'
from public.clinics c
where cs.clinic_id = c.id and c.slug = 'demo-internal';

update public.clinic_settings cs
set booking_url = 'https://queens-chat.vercel.app/demo-pediatric'
from public.clinics c
where cs.clinic_id = c.id and c.slug = 'demo-pediatric';
