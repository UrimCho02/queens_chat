-- clinic_doctors 테이블 제거 — 같은 날 작성한 20260520000000_clinic_doctors_schema.sql 을 되돌림.
--
-- 사유: 의료진 소개를 이름/직책/이력/사진 구조화 카드로 기획했으나,
-- 실제 더퀸즈 자산이 "제목 배너 + 일러스트 + 이름 + 이력"이 전부 박힌
-- 단일 이미지(네이버 플레이스 스타일)라 구조화 모델이 맞지 않음.
-- 의료진 소개는 clinic_settings.settings.doctors_image_url 단일 이미지로 전환.
--
-- drop table 이 트리거 / RLS 정책 / 인덱스를 함께 제거함.

begin;
drop table if exists public.clinic_doctors;
commit;
