# ClinicTalk 아키텍처

> ClinicTalk(작업 디렉토리 `obgyn-demo`)의 시스템 구조 문서.
> 개발 환경·명령어·코드 컨벤션은 `CLAUDE.md`, 작업 이력은 `WORK_LOG.md` 참조.
> 이 문서는 "시스템이 어떻게 동작하는가"를 다룬다.

## 1. 한눈에 보기

ClinicTalk은 개인 병원용 AI 챗봇 SaaS다. **하나의 Next.js 앱**이 여러 병원(테넌트)을
slug 기반으로 구분해 서비스한다. 병원마다 코드를 복제하지 않는다 — `clinics` 테이블의
행 하나가 병원 하나이고, 모든 병원이 같은 코드·같은 DB·같은 배포를 공유한다.

한 병원에 대해 제공하는 것은 세 가지다:

- **챗봇** (`/`, 환자용) — 환자가 진료시간·예약·비용·일반 의학정보를 채팅으로 문의.
- **어드민** (`/admin/*`, 직원용) — AI 자동답변 검토·발송, 병원 정보·FAQ·회복가이드 편집.
- **홈페이지** (`/[slug]`, 공개) — 병원 1페이지 홈페이지. 챗봇 위젯 임베드.

핵심 설계 원칙: **의료법 가드레일은 코드에 고정**(`lib/prompts/safety.js`, 어드민 편집
불가)이고, **병원별 가변 데이터는 DB**(`clinic_settings`, `clinic_faqs` 등, 어드민 편집
가능)다. 챗봇 시스템 프롬프트는 이 둘을 런타임에 합쳐 만든다.

## 2. 시스템 구성 (배포 토폴로지)

```
                  ┌─────────────────────────────┐
   환자/직원  ───▶ │  Vercel: queens-chat        │  ← 앱 본체 (이 리포)
                  │  Next.js 16 (App Router)    │
                  │  queens-chat.vercel.app     │
                  └──────────┬──────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   ┌─────────┐        ┌──────────────┐     ┌─────────────┐
   │ Supabase│        │ Anthropic    │     │ Pusher      │
   │ Postgres│        │ Claude API   │     │ 실시간 푸시 │
   │ +Auth   │        │ (haiku-4-5)  │     │             │
   │ +Storage│        └──────────────┘     └─────────────┘
   └─────────┘

   ┌─────────────────────────────┐
   │  Vercel: clinictalk-landing │  ← 마케팅 랜딩 (별도 리포·프로젝트)
   │  clinictalk.kr              │     이 리포에 서브모듈로 마운트
   └─────────────────────────────┘
```

- **앱 프로젝트** (`queens-chat`) — 챗봇·어드민·병원 홈페이지 전부. 멀티테넌트 1개 프로젝트.
- **랜딩 프로젝트** (`clinictalk-landing`) — `clinictalk.kr` 마케팅 페이지. 별도 리포·배포.
  앱 리포에는 `clinictalk-landing/` 서브모듈로 들어와 있다.
- **외부 서비스**: Supabase(DB·인증·파일), Anthropic Claude(AI 응답), Pusher(어드민↔챗봇 실시간).
- 배포는 `master` push → Vercel 자동 빌드.

## 3. 멀티테넌트 모델

테넌트 = 병원(`clinics` 행). 식별은 **slug** 기반.

### 현재 라우팅

| 대상 | 경로 | 병원 결정 방식 |
|---|---|---|
| 병원 홈페이지 | `/[slug]` | 경로의 slug |
| 챗봇 | `/?clinic=<slug>` | 쿼리 파라미터. 없으면 `thequeens` fallback |
| 챗봇 API | `/api/chat` | GET은 `?clinic`, POST는 body `clinicSlug` |
| 어드민 | `/admin/*` | 로그인 사용자 → `getCurrentClinic()` (4장) |

홈페이지의 챗봇 위젯(`ChatWidget`)이 자기 slug를 iframe `?clinic=`으로 넘겨, 홈페이지와
챗봇이 같은 병원을 가리키게 한다.

### 데모 병원

`demo-` 접두 slug(`demo-obgyn`/`demo-internal`/`demo-pediatric`)는 영업 시연용 가상 병원.
챗봇 AI 응답은 정상 작동하되 `inquiries` 저장과 Pusher 알림을 건너뛴다 — 실 병원 어드민
오염 방지.

### 향후: 도메인 기반 라우팅 (미구현)

기본 서브도메인 `<slug>.clinictalk.kr` + 선택적 커스텀 도메인. `clinics.custom_domain`
컬럼 + `proxy.js` 호스트명→병원 해석 추가 예정. 상세는 메모리 `domain_strategy` 참조.

## 4. 인증·권한

### 역할 모델

- **admin** — 병원 직원. `clinic_users` 테이블로 (사용자 ↔ 병원) 매핑. 자기 병원 하나만.
- **superadmin** — SaaS 운영자(우림님). 별도 `superadmins` 테이블. 모든 병원 접근 가능.

인증은 Supabase Auth(이메일+비밀번호). 매직링크/OAuth는 미도입.

### `getCurrentClinic()` — 컨텍스트 결정의 단일 진입점

`lib/auth/getCurrentClinic.js`. 모든 어드민 페이지·API가 호출해 `{ user, clinic, role }`을
얻는다.

- 미로그인 → 전부 `null`.
- **admin** → `clinic_users` 매핑된 병원.
- **superadmin** → `ct_clinic` 쿠키가 가리키는 병원. 쿠키 없으면 `clinic = null`
  → 호출 페이지가 `/admin/clinics` 운영 콘솔로 보냄.

superadmin은 콘솔(`/admin/clinics`)에서 병원을 골라 "관리"하면 `/api/select-clinic`이
`ct_clinic` 쿠키를 설정한다. 로그인 시 이 쿠키를 초기화(`/api/select-clinic` DELETE)해
항상 병원 목록부터 시작한다.

### `proxy.js` (Next.js 16 미들웨어)

`/admin/*`, `/api/inquiries`, `/api/reply`, `/api/clinic-settings`, `/api/clinic-faqs`,
`/login` 진입 시 Supabase 세션 검사 + 갱신. 미인증이 보호 경로 접근 시 `/login`,
로그인된 사용자가 `/login` 접근 시 `/admin`으로 리다이렉트. `/api/chat`은 환자(비로그인)용
공개 API라 보호하지 않는다.

### Supabase 클라이언트 3종 — 신뢰 경계

코드 경로마다 권한이 다른 클라이언트를 쓴다. 어떤 경로가 무엇을 쓰는지가 곧 보안 경계다.

| 클라이언트 | 키 | 용도 |
|---|---|---|
| `lib/supabase/client.js` | anon | 브라우저. 로그인/로그아웃 등 Auth 한정 |
| `lib/supabase/server.js` | anon + 쿠키 | 로그인 admin의 SSR/라우트. RLS가 `auth.uid()`로 작동 |
| `lib/supabase/service.js` | service_role | RLS 우회. 챗봇 API·어드민 mutation·`getCurrentClinic` |

`service_role` 키는 **절대 브라우저로 노출 금지** (`NEXT_PUBLIC_` 접두어 금지).

### RLS (Row Level Security)

7개 테이블에 RLS 활성화, 13개 정책. `anon` 차단, `authenticated`는
`user_can_access_clinic(clinic_id)` 통과 시 SELECT/UPDATE/DELETE. INSERT는 부여 안 함
(어드민 mutation이 service_role을 쓰므로). `is_superadmin()` / `user_can_access_clinic()`은
`SECURITY DEFINER` 함수라 정책 안에서 self-recursion 없이 안전하게 호출된다.

> superadmin은 `is_superadmin()`이 true라 RLS상 모든 병원 행에 접근 가능하다. 따라서
> service_role 또는 RLS만으로는 "선택한 병원만" 좁혀지지 않으므로, `/api/inquiries`처럼
> 병원을 좁혀야 하는 쿼리는 `clinic_id`를 **명시 필터**한다.

## 5. 데이터 모델

```
auth.users ──┬──< superadmins (user_id)
             └──< clinic_users (user_id, clinic_id) >──┐
                                                       │
clinics ──┬── clinic_settings   (1:1, clinic_id PK)    │
 (테넌트) ├──< clinic_faqs                              │
          ├──< clinic_recovery_guides                  │
          ├──< clinic_change_logs                      │
          └──< inquiries                          clinics 참조
```

| 테이블 | 역할 | 핵심 컬럼 |
|---|---|---|
| `clinics` | 병원 테넌트 | `slug`(고유), `name`, `phone`, `address`, `is_active`, `logo_url`, `template`, `chatbot_enabled` |
| `clinic_settings` | 병원별 어드민 설정 (1:1) | `booking_url`, `slogan`, `settings`(JSONB) |
| `clinic_faqs` | 병원별 FAQ | `question`, `answer`, `sort_order`, `is_active` |
| `clinic_recovery_guides` | 수술 후 회복 가이드 | `name`, `description`, `items`(JSONB), `is_active` |
| `clinic_change_logs` | 어드민 변경 이력 | `table_name`, `action`, `before`/`after`(JSONB), `changed_by` |
| `inquiries` | 챗봇 문의 기록 | `clinic_id`, `session_id`, `user_message`, `ai_draft`, `category`, `is_staff_required`, `status` |
| `superadmins` | SaaS 운영자 | `user_id` |
| `clinic_users` | 사용자↔병원 매핑 | `user_id`, `clinic_id`, `role` |

### `clinic_settings.settings` (JSONB)

병원마다 구조가 가변인 값은 정규화 컬럼 대신 JSONB에 둔다. 주요 키:
`hours{weekday,saturday,lunch,closed[]}`, `doctors_summary`, `departments[]`, `services[]`,
`features[]`, `hours_notes[]`, `notices[]`, `substitute_holiday_policy`, `parking`,
`reservation_note`, `current_event`, `event_image_url`, `disclaimer`, `tone`(warm|formal),
`chat_menu{header,items[]}`, `doctor_images[]`.

### Storage

Supabase Storage 버킷 `clinic-assets` (public, 2MB 제한). 폴더 구조
`{clinic_id}/{kind}/` (kind: `logo`/`event`/`notice`/`doctor`) — 병원별 격리.

### 마이그레이션

`supabase/migrations/*.sql`. **Supabase Studio SQL Editor에 수동 적용** (CLI 미사용).
새 마이그레이션 작성 시 실제 DB 적용 여부를 반드시 확인할 것.

## 6. 요청 흐름

### 6.1 환자 챗봇 (`/api/chat`)

```
환자 → app/page.js
  GET /api/chat?clinic=<slug>     → 병원명·진료상태·이벤트·면책·메뉴·테마·로고 로드
  POST /api/chat {message,...}    → 아래 파이프라인
        ① slug 해석 → clinics 조회
        ② 데모 병원? (inquiries/Pusher 건너뛸지 표시)
        ③ chatbot_enabled=false? → 안내문만 반환 (비산부인과)
        ④ 개인정보 감지 → LLM 호출 전 차단·마스킹 저장
        ⑤ 세션당 횟수 / 병원별 일일 한도 체크
        ⑥ buildPrompt(clinic.id) → Claude haiku 호출
        ⑦ 응답의 STAFF_REQUIRED / CATEGORY 태그 파싱
        ⑧ inquiries INSERT  (데모면 skip)
        ⑨ Pusher "admin-channel"로 어드민에 푸시  (데모면 skip)
```

`/api/chat`은 `service.js`(service_role)를 쓴다 — 비로그인 환자 트래픽에 anon INSERT
권한을 여는 보안 위험을 피하기 위함.

### 6.2 직원 어드민

```
직원 로그인 → /admin
  GET /api/inquiries  (server 클라이언트, RLS + clinic_id 명시 필터)
  Pusher "admin-channel" 구독 → 새 문의 실시간 수신
  AI 초안 검토·수정 → POST /api/reply
        → inquiries UPDATE + Pusher "client-<sessionId>"로 환자에게 답변 푸시
```

환자 페이지는 자기 세션 채널(`client-<sessionId>`)을 구독하다가 직원 답변을 받는다.

### 6.3 superadmin 콘솔

```
superadmin 로그인 → /admin → (ct_clinic 쿠키 없음) → /admin/clinics 콘솔
  병원 [관리] → POST /api/select-clinic → ct_clinic 쿠키 설정 → /admin
  이후 모든 어드민 페이지가 선택 병원 컨텍스트로 동작
  헤더 [병원 전환] → /admin/clinics 로 복귀
  [+ 병원 등록] → /admin/onboarding (clinics+settings+직원계정+매핑 일괄 생성)
```

### 6.4 병원 홈페이지 (`/[slug]`)

서버 컴포넌트가 `clinics` + `clinic_settings` 조회 → `clinic.template`(classic|modern|soft)
로 템플릿 컴포넌트 분기 → 렌더. `?template=` 쿼리로 미리보기 override. 우하단에
`ChatWidget`(챗봇 iframe 토글) 임베드. 데이터·어드민은 템플릿과 무관 — 보이는 레이아웃만 다름.

## 7. 챗봇 시스템 프롬프트 조립

챗봇의 핵심은 `app/api/chat/route.js`가 호출하는 `buildPrompt(clinicId)`다.

```
buildPrompt(clinicId)
  ├─ clinics + clinic_settings + clinic_faqs + clinic_recovery_guides 4쿼리 (병렬)
  ├─ [병원 정보] / [주요 진료 항목] / [병원 특징] 섹션 조립  ← DB 데이터
  ├─ safetyRules({clinicName, bookingUrl, tone})            ← 코드 고정 가드레일
  ├─ [참고: 수술 후 회복 가이드]                             ← DB 데이터
  └─ [참고: 자주 묻는 질문]                                  ← DB 데이터
```

**섹션 순서가 중요하다.** 안전 규칙(`safetyRules`)이 FAQ·회복가이드보다 **먼저** 와야
한다. 참고 데이터(FAQ)의 친절한 답변 패턴이 안전 규칙(증상→`STAFF_REQUIRED`)을 덮어쓰는
현상을 막기 위함. FAQ 섹션에도 "위 [답변 규칙]을 반드시 우선 적용"이라고 명시한다.

`safety.js`는 의료법 가드레일(증상 진단 회피, 위험 영역 직원 전환 등)을 담으며 **어드민이
편집할 수 없다**. `clinicName`/`bookingUrl`/`tone`만 인자로 받는다. 모델은 응답에
`STAFF_REQUIRED`(직원 확인 필요) / `CATEGORY:<분류>` 태그를 붙이고, route가 이를 파싱한다.

모델은 `claude-haiku-4-5-20251001`. 소형 모델 특성상 "~하지 마라" 부정 지시보다 "이
형식으로 답하라" 템플릿이 안정적이다 (safety.js 규칙 설계에 반영됨).

## 8. 핵심 아키텍처 결정

| 결정 | 이유 |
|---|---|
| 단일 멀티테넌트 앱 (병원별 프로젝트 X) | 코드·배포 1벌. 새 병원 = DB 행 추가. SaaS의 핵심 |
| 의료법 가드레일을 코드에 고정 | 어드민이 안전 룰을 망가뜨릴 수 없게. 법적 리스크 차단 |
| 시스템 프롬프트 = 코드(safety) + DB(병원 데이터) 분리 | 멀티테넌트화의 전제. 병원별 커스터마이즈와 안전 룰 분리 |
| 챗봇 API → service_role | 비로그인 환자에게 anon INSERT 권한을 열지 않기 위함 |
| RLS는 모든 코드 준비 후 일괄 활성화 | 중간에 켜면 라이브 앱이 깨짐 |
| `clinic_settings.settings` JSONB | 병원마다 구조가 다른 가변 데이터를 스키마 변경 없이 수용 |
| FAQ 섹션을 [답변 규칙] 뒤에 배치 | 참고 데이터가 안전 룰을 덮어쓰는 현상 방지 |
| superadmin 병원 컨텍스트 = 쿠키 | superadmin은 특정 병원에 매이지 않음. 콘솔에서 선택·전환 |

## 9. 확장 예정

- **도메인 라우팅** — `<slug>.clinictalk.kr` 서브도메인 + 커스텀 도메인. `proxy.js`에
  호스트명→병원 해석, `clinics.custom_domain` 컬럼 추가. (메모리 `domain_strategy`)
- **`safety.js` 멀티 진료과화** — 현재 챗봇 가드레일은 산부인과 전용. 일반 병원에 챗봇을
  팔려면 진료과별 안전 룰 분리가 선행돼야 함. (그래서 비산부인과 데모는 `chatbot_enabled=false`)
- **시스템 프롬프트 캐싱** — `buildPrompt`가 chat 호출마다 DB 4쿼리. 트래픽 증가 시 검토.
