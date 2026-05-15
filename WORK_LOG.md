# 작업 일지 (WORK_LOG)

> 새 작업 끝낼 때마다 이 파일 최상단에 항목 추가. 시간순으로 위가 최신.
> 양식: `## YYYY-MM-DD` (날짜 헤더) → `### 작업명` → 목적/결과/이슈/해결.

---

## 다음에 해야 할 일

멀티테넌트 9단계 + 원장님 1차 요구사항 + master 배포까지 전부 완료. 다음 세션 재개 지점 없는 깨끗한 상태. 남은 건 우선순위 낮은 기술 부채뿐:

1. (기술 부채) 이벤트 이미지 교체/제거 시 Storage 옛 파일 cleanup (현재는 누적). 자주 안 바뀌니 우선순위 낮음.
2. (기술 부채) `DAILY_LIMIT` fallback 불일치 정리 (`inquiries` 50 / `chat` 20 → 한쪽으로 통일).

---

## 2026-05-15

### 이벤트 이미지 UX 마무리 — 크기 미세 조정 + 클릭 원본 보기

**계기**: production 배포 후 사용자가 직접 보면서 발견한 디테일.

**한 것 (4번에 걸친 미세 조정)**
- 처음 `max-w-full` (버블 78%까지 차서 데스크탑에서 거대)
- → `max-w-[260px] max-h-48` (너무 작아 글씨 안 보임)
- → `max-w-xs max-h-64` (320×256, 여전히 작음)
- → `max-w-[640px] max-h-[512px]` + 클릭 시 새 탭 원본 보기 (`<a target="_blank">` 감싸기, `hover:opacity-90 cursor-pointer` 힌트) — 두 배로 키우고 클릭 기능 추가
- → 최종 `max-w-[560px] max-h-[448px]` (모바일에서 살짝 오버되는 문제로 10% 축소)

**결과**: 데스크탑 적정 크기, 모바일에서 부모 버블 78%에 의해 자연 축소, 클릭 시 원본 새 탭. 글씨 가독성 OK.

---

### master 머지 + Vercel 배포

**한 것**: multitenant → master fast-forward (`e80fdf1 → 81dc88c`, 7 커밋 / 2159줄 변경) → `git push origin master` → Vercel 자동 빌드 → `queens-chat.vercel.app` 새 코드 반영.

**검증 완료**: 챗봇/어드민 핵심 흐름 (인사+메뉴/이벤트/FAQ/회복 가이드/변경이력) production에서 동작. RLS는 이미 production DB에 5E 적용 시점부터 반영된 상태였고, 코드가 그것과 호환됨을 확인.

이후 production 보정 commit들도 같은 패턴(multitenant 작업 → master fast-forward → push)으로 처리.

---

### production 첫 검증 후 보정 — 이미지 크기 + 회복 가이드 시드 제거

**계기**: master 머지 → Vercel 배포 후 production에서 두 가지 피드백.

1. **이벤트 이미지가 데스크탑에서 너무 큼** — 버블 max-w(78%)까지 차서 거대. 모바일에선 OK지만 데스크탑은 부담스러움.
2. **자궁근종 시드 가이드(4일차 세수 등)가 의학적으로 부정확** — 사용자가 placeholder인 줄 모르고 의학 정보로 인지. 챗봇은 "원장님께서 안내드린 회복 가이드에 따르면…"으로 답변하는데, 검토 안 된 시드가 환자에게 "원장님 안내"로 전달될 위험.

**결정**: 회복 가이드는 **100% 원장님이 직접 입력**. 시드 제거. 안전 사이드 default (가이드 없으면 모든 수술 후 질문 STAFF_REQUIRED).

**한 것**
- `app/page.js` 이벤트 이미지 1차 축소 — `max-w-full` → `max-w-[260px] max-h-48 object-contain` (이후 더 키우는 fine-tune은 위 "이벤트 이미지 UX 마무리" 참조)
- `supabase/migrations/20260515000300_remove_seed_recovery_guides.sql` — 자궁근종 시드 DELETE. 시드 마이그레이션 자체는 히스토리 보존 위해 그대로 둠.
- `GuidesManager.js` 강화:
  - 페이지 상단 안내에 ⚠ 경고 추가 — "등록된 가이드는 '원장님 안내'로 그대로 전달됩니다. 의학적 정확성 책임은 등록자에게."
  - 빈 상태 박스 — 회색 → 앰버 보더, 메시지 명시 — "가이드가 비어있는 동안 챗봇은 수술 N일차 질문을 모두 직원 확인으로 전환".

---

### 단계 9 완료 — `/admin/logs` 변경 이력 페이지

**목적**: 단계 5A부터 박아둔 `clinic_change_logs` 데이터를 어드민이 직접 볼 수 있게. 누가/언제/어디서/무엇을 바꿨는지 추적.

**한 것**
- `lib/utils/diffJsonb.js` — before/after JSONB 비교 헬퍼. create/delete/update 케이스 모두 처리. id/clinic_id/created_at/updated_at 등 메타 컬럼은 노이즈 제거 위해 항상 제외.
- `/admin/logs/page.js` — 서버 컴포넌트. 본인 clinic의 logs 최근 50건 조회 (시간 역순).
- `/admin/logs/LogsList.js` — 클라이언트 컴포넌트. 행 클릭 펼침/접기. table_name/action별 한국어 라벨 + 색상 매핑.
- 변경된 필드만 "필드명: 빨강(옛) → 초록(새)" 두 박스. JSONB 객체/배열은 `JSON.stringify(_, null, 2)` 로 pre 블록.
- 네 어드민 페이지(`admin`, `faqs`, `settings`, `recovery-guides`) 헤더에 [변경이력] 링크 추가.

**검증 완료**: 단계 7~8 + 회복 가이드 작업으로 쌓인 로그 시간순 표시 / 추가·수정·삭제 세 액션 다 정상 / JSONB diff 깨지지 않음 / 메타 컬럼 안 보임 / 헤더 네 곳 모두 진입 가능.

---

### 원장님 요구사항 (c) — 수술 후 회복 가이드 완료

**목적**: 원장님이 수술별 회복 일정을 미리 등록 → 챗봇이 "수술 N일차에 ~해도 되나요" 질문에 가이드 그대로 안내. 의료법 핵심: 챗봇은 의학적 판단 X, 원장님이 등록한 내용 단순 전달자. 가이드에 없는 일차/수술 + 증상 묘사 동반 질문은 STAFF_REQUIRED.

**한 것**
- **새 테이블** `clinic_recovery_guides` — id/clinic_id/name/description/items(jsonb)/sort_order/is_active. items 형태 `[{day_from, day_to?, title, content}]`. 5E 패턴 RLS 정책 4개 같이.
- **시드** 더퀸즈 자궁근종 수술 1건 (1일/2-3일/4-6일/7-13일/14-20일/21일+ 일정 6개). 원장님 1차 미팅 때 제시한 일정 그대로.
- **`buildPrompt.js`** Promise.all에 guides 쿼리 추가, `formatRecoveryGuides()` 헬퍼로 `[참고: 수술 후 회복 가이드]` 섹션 조립. safety 룰 뒤 + FAQ 앞에 위치.
- **`safety.js`** warm/formal 두 톤 모두 14번 규칙 신설 — 매칭 시 가이드 그대로 안내 + "이상 증상 시 내원", 비매칭/증상동반 → STAFF_REQUIRED. 새 카테고리 `CATEGORY:수술회복` 추가.
- **어드민 카테고리 필터** `admin/page.js`에 "수술회복" 추가 (teal 색).
- **API** `/api/recovery-guides` POST + `[id]` PUT/DELETE. clinic-faqs 패턴. 모든 변경 `clinic_change_logs` 기록.
- **어드민 페이지** `/admin/recovery-guides` (page + GuidesManager). FAQ 페이지 디자인 재활용. 각 가이드 카드 안에 일정 항목 동적 리스트 (day_from/day_to/title/content).
- **헤더 메뉴** 세 어드민 페이지(`admin`, `faqs`, `settings`) 헤더에 [회복가이드] 링크 추가.

**이슈와 해결**
- dev server 재시작 시 Next.js stale lock으로 "PID 이미 띄워져 있음" 에러 (실제 PID는 죽음). `.next/dev` 캐시 삭제로 정리. 일상적 cleanup.

**검증 완료**: 시드 가이드 표시 / 챗봇이 등록 일차에 가이드 그대로 답변 / 등록 안 된 일차·수술 → STAFF_REQUIRED / 증상 동반 질문 → STAFF_REQUIRED / 어드민 편집 → 챗봇 반영. 보너스: 가이드에 없는 질문 시 AI 초안에 "가이드 등록 안 됨" 표시 — 직원이 어떤 종류 질문인지 빠르게 인지.

---

### 원장님 요구사항 (b) — 하이브리드 메뉴 UX 완료

**목적**: 닥터챗봇 스타일의 메뉴 카드(메시지 영역 안)와 자유 입력창을 같이 둬 — 클릭으로 빠르게 해결하려는 환자 + 자유롭게 묻는 환자 둘 다 만족.

**한 것**
- **데이터 모델**: `clinic_settings.settings.chat_menu = { header, items: [{ icon, label, text, enabled }] }`. 마이그레이션 없이 JSONB 확장.
- **`/api/chat` GET**: settings에서 chat_menu 꺼내 활성 항목만 필터링해서 응답에 포함. 비어있으면 null.
- **챗봇 페이지 `app/page.js`**:
  - 옛 `QUICK_BUTTONS` 상수 + 하단 가로 칩 UI 삭제 (메뉴 카드로 통합).
  - 첫 로드 시 인사 → (이벤트) → **메뉴 카드 버블** 순서로 푸시. `msg.isMenu` 플래그로 식별.
  - 카드 렌더링: 골드 헤더 + 세로 항목 리스트 (이모지 + 라벨). 클릭 시 `sendMessage(item.text)` 호출.
  - 카드는 메시지 영역에 남아있어 스크롤로 다시 클릭 가능.
- **어드민 `SettingsForm`**: 새 섹션 "챗봇 빠른 메뉴" — 카드 헤더 입력 + 항목 동적 리스트 (이모지/라벨/자동입력 텍스트/사용 토글/✕). hours_notes 패턴 재활용.
- **시드 마이그레이션 `20260515000000_seed_thequeens_chat_menu.sql`**: 옛 하드코딩 5개 (진료시간/예약/여성성형/주차/피부과) + 이모지를 더퀸즈 settings에 박음. `settings || jsonb_build_object(...)` 패턴으로 다른 키들 보존.

**이슈와 해결**
- 첫 테스트 시 메뉴 카드 안 뜨고 어드민에도 5개 항목 없었음.
- 원인: 사용자가 시드 SQL Step 1을 건너뛰고 챗봇/어드민 먼저 확인.
- 진단 쿼리(`SELECT settings ? 'chat_menu'`)로 데이터 부재 확인 → 시드 실행 → 정상 동작.

**검증 완료**: 메뉴 표시 / 클릭 → 답변 / 어드민 편집 → 챗봇 반영 / 비활성 토글 / 모든 항목 비활성 시 카드 숨김.

### 원장님 요구사항 (a) — 이벤트창 이미지 업로드 완료

**목적**: 어드민에서 "이번달 이벤트"에 텍스트뿐 아니라 이미지도 업로드. 챗봇 인사 직후 이벤트 버블에 이미지 함께 표시.

**한 것**
- Supabase Storage 버킷 `clinic-assets` 신규 생성 (public, 2MB 제한). 폴더 구조 `{clinic_id}/event/{uuid}.{ext}` — 멀티테넌트 격리.
- 업로드 API `app/api/clinic-assets/upload/route.js` — getCurrentClinic 인증 → 파일 검증 (image/jpeg|png|webp, ≤2MB) → service_role로 Storage upload → public URL 반환.
- `SettingsForm.js` 4군데 수정: state(`eventImageUrl`, `uploadingImage`), `handleImageSelect` 핸들러, newSettings에 `event_image_url`, UI 블록(미리보기 + 제거 ✕ 버튼 + 파일 input).
- `/api/chat` GET 응답에 `eventImageUrl` 추가.
- `app/page.js` 이벤트 메시지 객체에 `image` 필드 + 버블 렌더링에 `<img>` 표시. `currentEvent || eventImageUrl` 중 하나라도 있으면 이벤트 버블 노출.

**검증 완료**: 어드민에서 업로드 → 미리보기 → 저장 → 챗봇 새로고침 → 이벤트 버블에 이미지 표시. 제거 흐름도 정상.

### 챗봇 "운영 종료" 문구 변경

**계기**: 운영시간 외에도 챗봇은 답을 하는데 "운영 종료"라고 표시되면 환자가 채널 닫혔다고 오해 → 떠남.

**한 것** (`app/page.js`)
- 상단 배지: `● 운영 종료` (회색) → `● AI 상담 가능` (앰버색)
- 큰 안내 배너: "현재 운영시간 외입니다. 문의 남겨주시면 운영시간 내 답변드립니다." → "현재 담당 직원은 부재중입니다. AI가 답변 가능한 부분은 바로 답변드립니다. 증상 관련 문의는 운영시간 내 직원이 답변드립니다."

**검증**: 점심시간(운영시간 외) 마침 걸려서 실제 UI에서 확인 완료.

---

## 2026-05-14

### 단계 5E 완료 — RLS 활성화

**계기**: Supabase에서 보안 경고 메일 수신 — `rls_disabled_in_public`, `sensitive_columns_exposed`. anon key가 브라우저에 노출되어 있는데 RLS 미설정 → 누구나 PostgREST로 모든 테이블 read/write 가능한 상태였음. 사용자 결정: 원장님 요구사항보다 보안 먼저.

**한 것**
- 코드 감사 — supabase client 사용 패턴 매트릭스화. 결과: RLS 켰을 때 영향받는 코드 경로는 단 2개 (`/api/inquiries` GET/DELETE, `/api/reply` UPDATE — 둘 다 server client + cookie auth). 나머지는 service_role.
- 5A 헬퍼 함수 재확인 (`is_superadmin()`, `user_can_access_clinic(uuid)`) — SECURITY DEFINER로 정의되어 정책에서 self-recursion 없이 안전 사용 가능.
- 마이그레이션 작성: `supabase/migrations/20260514000000_enable_rls.sql` — 7개 테이블 RLS enable + 13개 정책. service_role은 bypass, anon 차단, authenticated는 `user_can_access_clinic(clinic_id)` 통과 시 SELECT/UPDATE/DELETE. INSERT는 어드민 mutation이 service_role 쓰니까 authenticated에 부여 안 함.

**이슈와 해결**
- Studio 적용 전 사전 체크 SQL 실행 → `inquiries.clinic_id IS NULL` 10개 발견.
- 원인: 단계 4(2026-05-07 백필) 이후, 단계 6(2026-05-11 chat 코드에 clinic_id 박기) 이전에 들어온 inquiries들이 clinic_id 없이 INSERT됨.
- 그대로 RLS 켜면 `user_can_access_clinic(NULL)`이 false라 어드민이 그 10개 문의를 영영 못 봄.
- **해결**: `20260513000000_backfill_orphan_inquiries.sql` 작성 — NULL 행을 더퀸즈로 백필 (현재 단일 병원이라 안전). 적용 순서가 보장되도록 파일명 날짜를 RLS 마이그레이션보다 앞으로.

**적용 + 검증**
- 순서: 백필 마이그레이션 → NULL 0개 확인 → RLS 마이그레이션 → 동작 검증 → Advisor 확인.
- 검증 완료: 챗봇(로그아웃 상태)/어드민(로그인) 동작 정상, `rls_on_tables=7` / `total_policies=13`, Security Advisor 에러 4개 모두 클리어.

**결과**: 멀티테넌트 전환 9단계 + 5하위단계 전부 종료. anon key 노출 위험 제거.

### CLAUDE.md / WORK_LOG.md 신규 작성

- 사용자 요청으로 `CLAUDE.md` (프로젝트 개요·기술스택·디렉토리·결정사항·주의사항) + `WORK_LOG.md` (이 파일) 작성.
- 자동 메모리에 "작업 단위 완료 시 WORK_LOG 갱신" 룰 추가 (`feedback_work_log.md`).

---

### 보안 정리 — GitHub PAT 노출

**계기**: 어제(05-13) 푸시 작업 중 `clinictalk-landing/.git/config`의 `remote.origin.url`에 GitHub Personal Access Token이 평문으로 박혀 있는 걸 발견. 출력에 그대로 노출됨.

**한 것**
1. `.gitmodules` 파일이 부모 리포에 트래킹되지 않은 것 확인 → 토큰이 GitHub에 푸시된 적은 없음 (다행).
2. 사용자가 GitHub Settings → Developer settings → PAT에서 해당 토큰 revoke.
3. 양쪽 리포 URL을 토큰 없는 깨끗한 형태로 교체:
   - `git -C clinictalk-landing remote set-url origin https://github.com/UrimCho02/clinictalk-landing.git`
   - `git remote set-url origin https://github.com/UrimCho02/queens_chat.git`
4. 사용자가 Windows 자격증명 관리자에서 옛 git 자격증명 제거.
5. 다음 push 시 Git Credential Manager(시스템 기본)가 브라우저 OAuth로 자동 처리할 예정.

**결과**: 토큰 노출 완전 차단. 부모/서브모듈 모두 깨끗한 URL.

**예방책 메모**: 새 토큰 만들 때 URL에 박지 말고 GCM 또는 ssh key 사용. PowerShell 출력에 토큰 한 번이라도 찍히면 텔레메트리·터미널 스크롤백·복붙 등에 잔존할 수 있음 → 즉시 revoke가 가장 안전.

---

## 2026-05-13

### 단계 8 동작 테스트 완료 — `/admin/faqs`

**목적**: 단계 8에서 코드만 작성된 FAQ 관리 페이지의 실제 동작 검증.

**테스트한 것 (7항목 전부 통과)**
1. 기존 FAQ 6개 목록 조회 (sort_order 정렬)
2. 새 FAQ 추가 (CREATE) — UI 토스트 + `clinic_faqs` INSERT + `clinic_change_logs` action='create' 확인
3. 기존 FAQ 수정 (UPDATE) — before/after diff가 `clinic_change_logs`에 기록됨
4. 사용 토글 (is_active=false) — DB 반영 확인
5. FAQ 삭제 (DELETE) — `clinic_change_logs` action='delete', before 보존
6. **챗봇 반영 확인** — 새 FAQ 추가 후 챗봇이 답변에 사용. 비활성으로 토글하면 같은 질문에 답 안 함 → `buildPrompt`의 `is_active=true` 필터 정상 동작 확인.
7. 에지 케이스: 빈 입력 차단 + 로그아웃 후 `/admin/faqs` 접근 시 `/login` 리다이렉트.

**결과**: 단계 8 ✅ 완료. 메모리 트래커 갱신.

---

### 원장님 1차 미팅 후 요구사항 3개 접수

원장님이 어제(2026-05-12) 미팅에서 다음 요구사항 전달:

1. **이벤트창 이미지 업로드**: 현재 `/admin/settings`의 "이번달 이벤트"가 텍스트만. 이미지도 업로드 가능해야 함.
2. **하이브리드 메뉴 UX**: 닥터챗봇처럼 첫 화면에 클릭 가능한 메뉴 카드 + 그 아래 자유 입력창. 클릭으로 빠른 해결 / 자유 질문 둘 다 만족.
3. **수술 후 회복 가이드**: "수술 4일차에 세수해도 되나요" 같은 표준 회복 가이드 답변. 의료법 가드레일 — 챗봇은 의학적 판단 X, 원장님이 미리 등록한 가이드 그대로 전달 O. 가이드에 없는 증상 질문은 기존대로 STAFF_REQUIRED.

작업 계획 수립 — 우선순위는 (1) → (2) → (3). 우선순위 결정 후 5E 작업이 끼어들어 (1) 시작 직전에 멈춤.

---

### 랜딩 페이지 리디자인 푸시

- `clinictalk-landing` 서브모듈에서 `index.html` 전면 개편 (폰트/컬러/레이아웃, +1084/-651).
- 서브모듈 master에 commit + push.
- 부모 리포 multitenant 브랜치에서 서브모듈 포인터 최신화 commit + push.

---

## 2026-05-12

### 챗봇/어드민 잔손질 (2 commits)

- `e80fdf1` 챗봇 마무리 멘트 자기모순 방지 룰 보강 (`lib/prompts/safety.js`)
- `d98ed84` 어드민 AI 초안 textarea 키를 inquiry.id로 변경 — React 리렌더 시 textarea 상태 꼬임 방지

---

## 2026-05-11

### 단계 6 — 시스템 프롬프트 분리

**목적**: 챗봇 시스템 프롬프트가 코드 안에 하드코딩되어 있어 멀티테넌트 전환 막힘 → 의료법 가드(코드 단)와 병원별 데이터(DB)로 분리.

**한 것**
- `lib/prompts/safety.js` 신규 — 의료법 룰. `clinicName`/`bookingUrl` 인자.
- `lib/prompts/buildPrompt.js` 신규 — `clinics` + `clinic_settings` + `clinic_faqs` 3쿼리 → 프롬프트 조립.
- `app/api/chat/route.js` 개편 — `SYSTEM_PROMPT` 상수 제거, `buildPrompt(clinic.id)` 호출. `clinic.phone` 동적, `inquiries.clinic_id` INSERT, 일일 한도도 clinic 필터.

**이슈와 해결**
- 처음엔 FAQ 섹션을 `[답변 규칙]` 앞에 뒀더니 모델이 FAQ의 친절-답변 패턴을 따라 안전 규칙(증상 → STAFF_REQUIRED)을 무시함.
- **해결**: FAQ를 `[답변 규칙]` 뒤로 옮기고, 라벨링을 "[참고: 자주 묻는 질문] — [답변 규칙] 우선 적용, 일반 문의(규칙 11)에 해당하는 경우만 참고"로 명시.

**부수 작업**: 챗봇 응답 완료 후 입력창 포커스 복원 버그 픽스 (`app/page.js`).

---

### 단계 7 — `/admin/settings` 병원 정보 수정 페이지

**목적**: 어드민이 자기 병원의 `clinics`(name/phone/address) + `clinic_settings`(slogan/booking_url/settings JSONB)를 폼으로 수정.

**한 것**
- `/admin/settings/page.js` + `SettingsForm.js` 신규.
- 폼 섹션별 입력: 기본정보 / 진료시간 / 의료진 / 진료과목 / 주요항목 / 특징 / 챗봇 설정.
- `/api/clinic-settings` POST — UPDATE + `clinic_change_logs` INSERT.
- `lib/auth/getCurrentClinic.js` 헬퍼.
- `/api/chat` GET이 clinicName/currentEvent/disclaimer 같이 반환.

### 단계 7 보강 — 의료진 1차 피드백 반영

같은 날 오후 의료진 1차 피드백 반영 추가:
- 톤 선택 (친근체/격식체, `safety.js` 분기)
- 진료시간 부가 안내 동적 리스트 (사용 토글)
- 대체공휴일 정책
- 이번달 이벤트 (인사 직후 별도 버블)
- 면책 문구 (상단 배너)
- 안전 규칙 추가: "예약 링크 오용 방지" — 진료시간 외엔 예약 링크 그대로 노출 금지.

### 단계 8 코드 작성 — `/admin/faqs` (테스트 전)

- `FaqsManager.js` — 카드 단위 CRUD, 카드별 개별 저장. 새 항목은 노란 테두리.
- `/api/clinic-faqs` POST + `/api/clinic-faqs/[id]` PUT/DELETE.
- 모든 작업이 `clinic_change_logs` 기록.
- `buildPrompt.js`에 `is_active=true` 필터 추가.
- 헤더 [FAQ] 네비게이션 추가.
- 동작 테스트는 2일 후(2026-05-13) 진행.

---

## 2026-05-08

### 단계 5 — Supabase Auth 도입 (5A~5D)

**목적**: 비밀번호 쿠키 방식의 옛 어드민 로그인을 Supabase Auth로 교체. 멀티테넌트 사용자/병원 매핑 기반 마련.

**한 것 — 5A (스키마)**
- `superadmins` 테이블 (SaaS 운영자)
- `clinic_users` 테이블 (사용자-병원 매핑, 한 사용자 다중 병원 가능)
- `clinic_change_logs.changed_by` → `auth.users` FK (계정 삭제 시 SET NULL)
- 헬퍼 함수 `is_superadmin()`, `user_can_access_clinic(uuid)` — SECURITY DEFINER.

**5B (클라이언트 분리)**
- `@supabase/ssr ^0.10.3` 설치.
- `lib/supabase/{server,client,service}.js` 분리. 옛 `lib/supabase.js` 삭제.
- chat → service_role. inquiries/reply → server. login → client.
- `.env.local` + Vercel에 `SUPABASE_SERVICE_ROLE_KEY` 추가.

**5C (인증 흐름)**
- `/login` 을 Supabase Auth (signInWithPassword)로 교체.
- `proxy.js` (Next.js 16에서 `middleware.js` → `proxy.js`) — `/admin/*`, `/api/inquiries`, `/api/reply` 보호 + 세션 갱신.
- 옛 비밀번호 쿠키 방식 `/api/auth` 제거.
- 어드민 헤더에 로그아웃 버튼.

**5D (계정 생성)**
- Studio Auth Users에서 본인(superadmin) + 더퀸즈 직원(admin) 두 계정 생성 (Auto Confirm).
- `superadmins`에 본인 user_id, `clinic_users`에 직원 user_id + thequeens 매핑 INSERT.

**5E (RLS 활성화)**: 코드 준비 완료 후로 미룸 (라이브 앱 깨질 위험). 2026-05-14에 진행.

### 부수 — 어드민 목록 표시 개선
- 새 문의가 최상단에 오도록 정렬 + 날짜 표시.

---

## 2026-05-07

### 단계 1~4 — 멀티테넌트 DB 스키마

**목적**: `obgyn-demo`를 더퀸즈여성의원 단일에서 멀티테넌트 SaaS로 전환하는 첫 단계.

**한 것 (마이그레이션 4개)**
1. `20260507000000_multitenant_schema.sql` — `clinics`, `clinic_settings`, `clinic_faqs`, `clinic_change_logs` 테이블 + `set_updated_at()` 트리거.
2. `20260507000100_add_clinic_id_to_inquiries.sql` — `inquiries.clinic_id` nullable 추가.
3. `20260507000200_migrate_thequeens_data.sql` — 더퀸즈 1행 + settings + FAQ 6개 + 기존 inquiries 백필.
4. `20260507000300_auth_schema.sql` — 5A 내용 (위 참조).

**합의된 설계**
- URL 식별: slug 기반 path (`/[clinic]/...`). 서브도메인은 추후.
- `clinic_settings.settings` JSONB: hours/doctors_summary/services/features/departments/parking/reservation_note 등 가변 데이터.
- 역할: `admin` (clinic_users) + `superadmin` (별도 테이블).

**브랜치**: `multitenant` (master 기준 분기, 이때부터 생성).

---

## 2026-05-06

### 개인정보 마스킹 추가

**목적**: 환자가 챗봇에 전화번호/주민번호/성함 같은 개인정보 입력 시 LLM 호출 전 차단 + DB에는 마스킹된 형태로 저장.

**한 것**
- `containsPersonalInfo()` / `maskPersonalInfo()` 헬퍼.
- 차단 메시지 표시 + `status='blocked'`으로 inquiries 저장.

---

## 2026-04-29

### 1차 MVP 완성

하루에 몰아서 작업:
- 챗봇 UI + Claude API 연동 + Pusher 실시간.
- 어드민 페이지 (문의 목록, 답변 발송).
- Supabase `inquiries` 테이블 DB 저장.
- 예약 링크 (반복 디버깅: 활성화 1, 2, 3, 4).
- 모바일 반응형.
- 토큰 절약 (시스템 프롬프트 다이어트).
- 최신 문의 상단 정렬.

이후 일주일은 미팅/검토 기간, 2026-05-06 부터 다시 작업 재개.

---

## 2026-04-27

### 프로젝트 초기화

`create-next-app`로 Next.js 16 + TailwindCSS 4 보일러플레이트 생성.
