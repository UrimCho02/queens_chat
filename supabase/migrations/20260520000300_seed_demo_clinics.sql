-- 데모용 가상 병원 2곳 시드. 영업 시 템플릿을 보여주기 위한 샘플.
--   - 실제 병원(더퀸즈) 데이터 노출 방지용. 모든 내용은 가공의 데이터.
--   - 어드민 페이지 없이 SQL 로만 관리 (clinic_users 매핑 없음).
--   - slug 중복 시 건너뜀 — 재실행 안전.
--
-- demo-obgyn   : OO여성의원  (template: classic)
-- demo-internal: OO내과의원  (template: modern)
-- 세 번째 템플릿(soft)은 /demo-obgyn?template=soft 처럼 미리보기 쿼리로 확인.

begin;

-- ============================================================================
-- 1. OO여성의원 (demo-obgyn) — 가상 산부인과
-- ============================================================================
insert into public.clinics (name, slug, phone, address, is_active, template)
select 'OO여성의원', 'demo-obgyn', '02-1234-5678',
       '서울특별시 OO구 OO로 123, 4층', true, 'classic'
where not exists (select 1 from public.clinics where slug = 'demo-obgyn');

insert into public.clinic_settings (clinic_id, slogan, booking_url, settings)
select c.id,
       '여성의 건강한 삶, 가까이에서 함께합니다',
       null,
       '{
         "tone": "warm",
         "hours": {
           "weekday": "09:30 - 18:00",
           "saturday": "09:30 - 13:00",
           "lunch": "13:00 - 14:00",
           "closed": ["sun", "holiday"]
         },
         "doctors_summary": "산부인과 전문의가 직접 진료합니다. 편안한 분위기에서 정확하게 진료받으세요.",
         "departments": ["산부인과", "여성 건강검진"],
         "services": [
           "산전 진찰 및 임신 관리",
           "부인과 질환 진료",
           "자궁경부암 검진",
           "예방접종 (자궁경부암 백신 등)",
           "갱년기 클리닉"
         ],
         "features": [
           {
             "title": "OO여성의원이 특별한 이유",
             "items": [
               "여성 의료진의 세심한 진료",
               "예약제 운영으로 대기시간 최소화",
               "최신 초음파 장비 도입"
             ]
           }
         ],
         "hours_notes": [
           { "text": "매주 목요일은 21시까지 야간진료를 운영합니다.", "enabled": true }
         ],
         "substitute_holiday_policy": "대체공휴일은 휴진입니다.",
         "parking": "건물 지하 주차장 2시간 무료",
         "reservation_note": "네이버 예약 또는 전화로 예약하실 수 있습니다."
       }'::jsonb
from public.clinics c
where c.slug = 'demo-obgyn'
  and not exists (
    select 1 from public.clinic_settings cs where cs.clinic_id = c.id
  );

-- ============================================================================
-- 2. OO내과의원 (demo-internal) — 가상 내과
-- ============================================================================
insert into public.clinics (name, slug, phone, address, is_active, template)
select 'OO내과의원', 'demo-internal', '02-9876-5432',
       '서울특별시 OO구 OO대로 456, 2층', true, 'modern'
where not exists (select 1 from public.clinics where slug = 'demo-internal');

insert into public.clinic_settings (clinic_id, slogan, booking_url, settings)
select c.id,
       '동네에서 믿고 찾는 건강 주치의',
       null,
       '{
         "tone": "warm",
         "hours": {
           "weekday": "09:00 - 18:30",
           "saturday": "09:00 - 13:00",
           "lunch": "13:00 - 14:00",
           "closed": ["sun", "holiday"]
         },
         "doctors_summary": "내과 전문의가 만성질환부터 가벼운 감기까지 꼼꼼하게 진료합니다.",
         "departments": ["내과", "가정의학과"],
         "services": [
           "감기·몸살 등 일반 진료",
           "고혈압·당뇨 등 만성질환 관리",
           "건강검진 및 결과 상담",
           "독감 등 예방접종",
           "수액·영양 치료"
         ],
         "features": [
           {
             "title": "OO내과의원을 찾는 이유",
             "items": [
               "만성질환 환자 맞춤 관리",
               "검진 결과를 알기 쉽게 설명",
               "당일 진료 가능"
             ]
           }
         ],
         "hours_notes": [
           { "text": "점심시간에도 접수는 가능합니다.", "enabled": true }
         ],
         "substitute_holiday_policy": "대체공휴일은 정상 진료합니다.",
         "parking": "병원 앞 공영주차장 이용 (1시간 무료)",
         "reservation_note": "예약 없이 방문 진료도 가능합니다."
       }'::jsonb
from public.clinics c
where c.slug = 'demo-internal'
  and not exists (
    select 1 from public.clinic_settings cs where cs.clinic_id = c.id
  );

commit;
