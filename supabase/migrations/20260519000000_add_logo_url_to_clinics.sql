-- clinics에 logo_url 추가. 홈페이지 헤더/hero에 노출.
-- Storage(clinic-assets) public URL 저장.
alter table public.clinics
  add column if not exists logo_url text;

comment on column public.clinics.logo_url is '병원 로고 이미지 public URL (clinic-assets 버킷).';
