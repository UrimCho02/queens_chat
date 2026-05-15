-- 더퀸즈 chat_menu 시드.
-- 옛 코드에 하드코딩되어 있던 QUICK_BUTTONS 5개를 settings JSONB 로 옮긴다.
-- `settings || jsonb_build_object(...)` 패턴으로 기존 settings 의 다른 키들은 보존하고 chat_menu 키만 추가.
-- (만약 어드민이 이미 chat_menu 를 편집했다면 이 시드가 덮어쓰므로, 신규 기능 시작 시점에만 1회 실행.)

begin;

update public.clinic_settings
set settings = settings || jsonb_build_object(
  'chat_menu', jsonb_build_object(
    'header', '궁금한 항목을 선택하세요',
    'items', jsonb_build_array(
      jsonb_build_object('icon', '📅', 'label', '진료시간',      'text', '진료시간이 어떻게 되나요?',     'enabled', true),
      jsonb_build_object('icon', '📞', 'label', '예약 방법',     'text', '예약은 어떻게 하나요?',         'enabled', true),
      jsonb_build_object('icon', '💎', 'label', '여성성형 상담', 'text', '여성성형 상담을 받고 싶어요.', 'enabled', true),
      jsonb_build_object('icon', '🅿', 'label', '주차 안내',     'text', '주차 가능한가요?',             'enabled', true),
      jsonb_build_object('icon', '🌿', 'label', '피부과 진료',   'text', '피부과 진료도 가능한가요?',     'enabled', true)
    )
  )
)
where clinic_id = (select id from public.clinics where slug = 'thequeens');

commit;
