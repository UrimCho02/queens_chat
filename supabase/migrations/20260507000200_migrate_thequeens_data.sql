-- 더퀸즈여성의원 단일 테넌트 데이터를 멀티테넌트 테이블로 이전
--
-- 1) clinics: 병원 1행
-- 2) clinic_settings: 현재 시스템 프롬프트의 하드코딩 정보를 정규화/JSONB로 저장
-- 3) clinic_faqs: 자주 묻는 질문 시드 (어드민에서 편집 예정)
-- 4) inquiries: 기존 행을 더퀸즈 clinic_id로 백필
--
-- NOT NULL 잠금은 이번에 추가하지 않음. 챗봇 API가 아직 clinic_id 없이 INSERT
-- 하므로 지금 잠그면 새 문의가 실패함. API 코드 수정 후 별도 단계에서 잠근다.

begin;

-- ============================================================================
-- 1) clinics
-- ============================================================================
insert into public.clinics (slug, name, phone, address, is_active)
values (
  'thequeens',
  '더퀸즈여성의원',
  '031-997-6700',
  '경기도 김포시 양도로 19번길 21 6층 (재인지엘프라자, 풍무동 홈플러스 건너편)',
  true
);

-- ============================================================================
-- 2) clinic_settings
-- 진료시간/원장/특징 등 구조 가변값은 settings JSONB에 저장
-- ============================================================================
insert into public.clinic_settings (clinic_id, booking_url, slogan, settings)
select
  c.id,
  'https://map.naver.com/p/entry/place/1405372476?placePath=%2Fbooking',
  '모든 여성이 여왕이 되는 곳',
  jsonb_build_object(
    'hours', jsonb_build_object(
      'weekday',  '10:00-19:00',
      'lunch',    '13:00-14:00',
      'saturday', '09:00-14:00',
      'closed',   jsonb_build_array('sun', 'holiday')
    ),
    'parking',          '김포 최초 무료 발렛 서비스 운영',
    'departments',      jsonb_build_array('산부인과', '피부 관리 시술'),
    'doctors_summary',  '두 분의 원장님이 직접 진료 (여성 전문의)',
    'reservation_note', '네이버 플레이스에서만 가능 (전화예약 불가, 현장접수 가능)',
    'services', jsonb_build_array(
      '산부인과 일반진료 (임신, 피임, 생리 관련 등)',
      '여성성형 (소음순 수술 등)',
      '골밀도 검사, 면역주사, 갱년기 케어',
      '피부 관리 시술 (더마샤인 등 피부 미용 시술)',
      '임신 사전건강관리'
    ),
    'features', jsonb_build_array(
      '두 분의 원장님이 직접 진료, 프라이버시 철저 보호',
      '수술실 지문인식, 전용 회복실, 개별 화장실',
      '무료 발렛 서비스'
    )
  )
from public.clinics c
where c.slug = 'thequeens';

-- ============================================================================
-- 3) clinic_faqs (어드민에서 편집/추가 예정인 시드 데이터)
-- ============================================================================
insert into public.clinic_faqs (clinic_id, question, answer, sort_order)
select c.id, q.question, q.answer, q.sort_order
from public.clinics c
cross join (values
  (1, '진료시간이 어떻게 되나요?',
      '평일(월~금) 10:00~19:00 (점심시간 13:00~14:00), 토요일 09:00~14:00 (점심시간 없음)입니다. 일요일과 공휴일은 휴진입니다.'),
  (2, '예약은 어떻게 하나요?',
      '네이버 플레이스에서 편하게 예약하실 수 있어요 😊 전화예약은 불가하지만 현장접수는 가능합니다.'),
  (3, '주차는 가능한가요?',
      '김포 최초 무료 발렛 서비스를 운영하고 있어요.'),
  (4, '병원 위치가 어디인가요?',
      '경기도 김포시 양도로 19번길 21 6층 (재인지엘프라자, 풍무동 홈플러스 건너편)에 위치해 있어요.'),
  (5, '어떤 진료를 받을 수 있나요?',
      '산부인과 일반진료, 여성성형, 골밀도 검사, 면역주사, 갱년기 케어, 피부 관리 시술 등을 진행하고 있어요.'),
  (6, '의료진은 어떻게 되나요?',
      '두 분의 원장님(여성 전문의)이 직접 진료해 드립니다.')
) as q(sort_order, question, answer);

-- ============================================================================
-- 4) inquiries 백필
-- ============================================================================
update public.inquiries
set clinic_id = (select id from public.clinics where slug = 'thequeens')
where clinic_id is null;

commit;
