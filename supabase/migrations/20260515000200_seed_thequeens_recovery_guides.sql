-- 더퀸즈 자궁근종 수술 회복 가이드 샘플 시드.
-- 원장님이 검토/수정할 1차 초안. 어드민 페이지에서 자유롭게 편집/추가 가능.
--
-- 일정 출처: 원장님 1차 미팅 (2026-05-12) 시 예시로 제시한 일정
--   "1일차 안정, 2-3일차 가벼운 보행, 4일차 세수 가능,
--    7일차 가벼운 외출, 14일차 가벼운 운동 가능, 21일차 정상 활동"
-- 챗봇은 이 내용을 그대로 전달만 함 (의학적 판단 X).

begin;

insert into public.clinic_recovery_guides
  (clinic_id, name, description, items, sort_order, is_active)
select
  c.id,
  '자궁근종 수술',
  '복강경 자궁근종 절제술 기준 회복 일정. 환자 컨디션에 따라 차이가 있을 수 있으니 통증·이상 증상 발생 시 내원 안내.',
  jsonb_build_array(
    jsonb_build_object('day_from', 1, 'day_to', 1,  'title', '안정',            'content', '절대 안정. 이동은 화장실 정도로 최소화. 수술 부위 압박 피하기.'),
    jsonb_build_object('day_from', 2, 'day_to', 3,  'title', '가벼운 보행',     'content', '실내 보행 가능. 무리한 활동 금지.'),
    jsonb_build_object('day_from', 4, 'day_to', 6,  'title', '세수 가능',       'content', '얼굴 세수 가능. 단, 수술 부위 거즈·드레싱은 물 닿지 않게.'),
    jsonb_build_object('day_from', 7, 'day_to', 13, 'title', '가벼운 외출',     'content', '가벼운 외출 가능. 무거운 물건 들기·격한 활동은 여전히 금지.'),
    jsonb_build_object('day_from', 14,'day_to', 20, 'title', '가벼운 운동',     'content', '가벼운 산책·스트레칭 가능. 무리한 운동은 21일차 이후.'),
    jsonb_build_object('day_from', 21,'day_to', null,'title', '정상 활동',      'content', '일상 복귀. 단 컨디션·통증 여부에 따라 조정. 이상 증상 있으면 내원.')
  ),
  10,
  true
from public.clinics c
where c.slug = 'thequeens';

commit;
