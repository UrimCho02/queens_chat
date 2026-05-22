# ClinicTalk 아키텍처

> ClinicTalk(작업 디렉토리 `obgyn-demo`)의 시스템 구조 문서.
>
> - **A부 — 운영자를 위한 프로젝트 지도**: 비개발자(창업자·운영자)가 서비스 구조를
>   이해하기 위한 안내. 기술 용어 최소화.
> - **B부 — 기술 레퍼런스**: 개발자용 상세.
>
> 개발 환경·명령어·코드 컨벤션은 `CLAUDE.md`, 작업 이력은 `WORK_LOG.md` 참조.

---

# A부 — 운영자를 위한 프로젝트 지도

ClinicTalk은 개인 병원용 AI 챗봇 SaaS입니다. **하나의 프로그램**이 여러 병원을
동시에 서비스합니다(병원마다 따로 만들지 않음). 병원 하나 = 데이터베이스의 줄 하나.

## A1. 전체 폴더 구조 — "건물 구조"로 보기

프로젝트를 건물에 비유하면:

| 폴더 | 비유 | 무슨 역할인가 |
|---|---|---|
| `app/` | 손님·직원이 드나드는 모든 층 | 화면과 기능 전부 |
| `app/page.js` | 1층 챗봇 상담 창구 | 환자가 보는 챗봇 화면 |
| `app/[slug]/` | 병원별 홈페이지 | 병원마다 자동 생성되는 1페이지 홈페이지 |
| `app/admin/` | 직원·운영자 사무실 | 관리 페이지 (문의 처리, 정보 수정) |
| `app/api/` | 보이지 않는 주방 | 화면 뒤에서 실제로 일하는 곳 (DB 조회, AI 호출) |
| `lib/` | 공용 도구 창고 | 여러 화면이 같이 쓰는 도구 (AI 도구, 로그인 확인, DB 연결) |
| `supabase/migrations/` | 데이터베이스 설계도철 | DB 구조 변경 기록 (`.sql` 파일들) |
| `clinictalk-landing/` | 별관 (마케팅관) | `clinictalk.kr` 홍보용 홈페이지 (별도 관리) |
| `proxy.js` | 건물 입구 검문소 | 로그인 안 한 사람이 사무실 들어오면 막음 |
| `CLAUDE.md` / `WORK_LOG.md` / `architecture.md` | 안내 문서철 | 프로젝트 설명·작업일지·이 문서 |

**핵심**: 환자가 보는 것(`app/page.js`, `app/[slug]/`)과 직원이 보는 것(`app/admin/`)은
화면이고, 그 뒤에서 실제 일을 하는 것이 `app/api/`(주방)입니다. 화면은 주방에 "이것
해줘"라고 요청만 하고, 진짜 처리는 주방에서 일어납니다.

## A2. 핵심 기능 흐름 — 세 종류의 사용자

ClinicTalk을 쓰는 사람은 세 부류이고, 각자 다른 흐름을 탑니다.

**① 환자 (챗봇)**
질문 입력 → AI가 병원 정보를 바탕으로 답변. 단, 증상·진단처럼 위험한 질문이면 AI가
자동으로 "직원 확인 필요"로 분류해서 직원에게 넘김. 환자는 "곧 답변드릴게요" 안내를 받음.

**② 병원 직원 (어드민)**
관리 페이지에서 들어온 문의를 실시간으로 받음 → AI가 써둔 답변 초안을 검토·수정 →
발송. 그 외에 병원 정보·진료시간·FAQ·회복 가이드를 직접 편집할 수 있음.

**③ 운영자 = 우림님 (superadmin)**
로그인하면 **병원 목록**이 보임 → 관리할 병원을 골라 들어감 → 그 병원의 어드민을
다룸. 새 병원은 "병원 등록"으로 한 번에 추가(홈페이지·챗봇·직원 계정이 같이 생성됨).

## A3. 가장 중요한 파일 4개

이 네 개가 서비스의 심장입니다.

| 파일 | 역할 (한 줄로) |
|---|---|
| `app/api/chat/route.js` | **챗봇의 두뇌.** 환자 메시지가 전부 여기를 거쳐 AI 답변이 나옴 |
| `lib/prompts/safety.js` | **의료법 안전장치.** AI가 진단·위험한 답을 못 하게 막는 규칙 |
| `lib/prompts/buildPrompt.js` | **AI 설명서 조립기.** "이 병원은 이렇습니다"를 AI에게 알려줌 |
| `lib/auth/getCurrentClinic.js` | **신원 확인.** "지금 이 사람은 누구이고 어느 병원인가" 판정 |

## A4. 절대 함부로 수정하면 안 되는 영역 ⚠️

잘못 건드리면 법적 문제·보안 사고·데이터 손실로 이어지는 곳입니다. 개발자가 작업할
때도 반드시 검토를 거쳐야 합니다.

| 영역 | 잘못 건드리면 |
|---|---|
| `lib/prompts/safety.js` | AI가 의학적 진단을 하거나 위험한 답변 → **의료법 위반·법적 책임** |
| `supabase/migrations/` 의 이미 적용된 파일 | 데이터베이스가 깨지거나 기존 병원 데이터 손실 |
| `lib/supabase/service.js` 와 service_role 키 | 이 키가 외부에 노출되면 **누구나 전체 DB를 읽고 지울 수 있음** |
| `proxy.js` | 관리 페이지가 아무나 접근 가능해지거나, 반대로 직원도 다 막힘 |
| DB의 보안 규칙(RLS) | 한 병원이 다른 병원 데이터를 볼 수 있게 됨 |
| 환경변수 (API 키들) | 챗봇·DB·실시간 알림이 전부 멈춤 |

## A5. 멀티테넌트(여러 병원) 관련 핵심 파일

"하나의 프로그램이 여러 병원을 구분해서 서비스"하는 것이 멀티테넌트입니다. 그 구분을
담당하는 파일들:

| 파일 | 역할 |
|---|---|
| DB `clinics` 테이블 | 병원 명단. 한 줄 = 한 병원 |
| `app/[slug]/page.js` | 주소(`/병원이름`)를 보고 해당 병원 홈페이지를 보여줌 |
| `app/api/chat/route.js` | 챗봇이 "지금 어느 병원 챗봇인지" 판단 |
| `lib/prompts/buildPrompt.js` | 그 병원의 정보만 골라 AI에게 전달 |
| `lib/auth/getCurrentClinic.js` | 로그인한 직원이 어느 병원 소속인지 판정 |
| `app/admin/onboarding/` | 새 병원을 한 번에 등록 |

## A6. 인증/권한(로그인·접근 통제) 관련 핵심 파일

"누가 무엇을 볼 수 있는가"를 통제하는 파일들:

| 파일 | 역할 |
|---|---|
| `app/login/page.js` | 로그인 화면 |
| `proxy.js` | 입구 검문 — 로그인 안 했으면 관리 페이지 차단 |
| `lib/auth/getCurrentClinic.js` | 로그인한 사람의 신원·소속 병원·등급(직원/운영자) 판정 |
| `app/api/select-clinic/route.js` | 운영자가 "지금 관리할 병원" 선택 |
| `lib/supabase/` 안의 3개 파일 | 권한 등급별 DB 접근 통로 (아래 B4 참고) |
| DB `superadmins` / `clinic_users` 테이블 | 누가 운영자이고, 누가 어느 병원 직원인지 명단 |

권한은 두 등급입니다 — **직원(admin)**: 자기 병원 하나만. **운영자(superadmin)**:
모든 병원 + 새 병원 등록.

## A7. AI 응답 생성 흐름

환자가 챗봇에 메시지를 보내면 `app/api/chat/route.js`에서 다음 순서로 처리됩니다:

```
환자 메시지
  1. 개인정보 차단    — 전화번호·주민번호 등이 있으면 AI에 보내기 전에 막음
  2. 횟수 제한 확인    — 한 사람/하루 과다 사용 방지
  3. 설명서 조립      — buildPrompt가 "이 병원 정보 + 안전 규칙"을 AI용 설명서로 작성
  4. AI 호출         — Claude에게 설명서 + 환자 질문 전달
  5. 답변 분류        — AI 답에 "직원 확인 필요" 표시가 붙었는지 확인
  6. 저장 + 알림      — 문의를 DB에 저장하고, 직원에게 실시간 알림
```

3번의 "설명서"가 핵심입니다. 안전 규칙(`safety.js`)이 항상 병원 정보·FAQ보다 **먼저**
들어갑니다 — 그래야 AI가 FAQ의 친절한 말투를 따라 하다가 안전 규칙을 무시하는 일이
없습니다.

## A8. 데이터베이스 구조 요약

DB에는 8개의 표(테이블)가 있습니다:

| 테이블 | 무엇을 담는가 |
|---|---|
| `clinics` | 병원 명단 (이름·주소·전화·홈페이지 디자인 등) |
| `clinic_settings` | 병원별 상세 설정 (진료시간·슬로건·FAQ 메뉴 등) |
| `clinic_faqs` | 병원별 자주 묻는 질문 |
| `clinic_recovery_guides` | 수술 후 회복 가이드 |
| `inquiries` | 챗봇에 들어온 문의 기록 |
| `clinic_change_logs` | 누가 언제 무엇을 바꿨는지 변경 이력 |
| `superadmins` | 운영자 명단 |
| `clinic_users` | 직원 ↔ 병원 연결 명단 |

모든 표는 `clinics`(병원)에 연결됩니다 — 어느 문의가 어느 병원 것인지, 어느 FAQ가
어느 병원 것인지 표시되어 있습니다.

## A9. 실제 운영 시 가장 중요한 것들

서비스가 멈추거나 사고가 나는 것을 막으려면 이것들을 지켜야 합니다:

1. **환경변수 (API 키들)** — Vercel에 저장된 키. 이게 잘못되면 챗봇·DB·알림이 전부
   멈춤. (`CLAUDE.md`의 환경변수 표 참고)
2. **`app/api/chat/route.js`** — 챗봇이 멈추면 환자 서비스가 멈춤.
3. **`lib/prompts/safety.js`** — 의료법 안전장치. 사고 시 법적 책임.
4. **`supabase/migrations/`** — DB 설계도. 새 설계도(`.sql`)를 만들면 반드시
   Supabase 화면에 적용했는지 확인. 적용 안 하면 새 기능이 깨짐.
5. **`proxy.js` + DB 보안 규칙** — 접근 통제. 무너지면 보안 사고.

## A10. 개발자 채용 시 가장 먼저 보여줄 파일

새 개발자가 프로젝트를 빠르게 파악하도록, 이 순서로 보여주세요:

1. **`CLAUDE.md`** — 프로젝트 전체 개요·기술 스택·규칙. 가장 먼저.
2. **`architecture.md` (이 문서)** — 시스템 구조. 특히 아래 B부.
3. **`WORK_LOG.md`** — 지금까지의 작업 이력·결정 배경.
4. **`app/api/chat/route.js`** — 서비스 핵심 로직.
5. **`lib/prompts/safety.js` + `buildPrompt.js`** — AI 응답의 핵심.
6. **`lib/auth/getCurrentClinic.js` + `proxy.js`** — 인증·권한 구조.
7. **`supabase/migrations/`** — 데이터베이스 설계.
8. **`lib/supabase/`** — DB 접근 권한 분리 방식.

문서 3종(1~3)을 먼저 읽히면 코드를 훨씬 빠르게 이해합니다.

---

# B부 — 기술 레퍼런스

## B1. 한눈에 보기

하나의 Next.js 앱이 여러 병원(테넌트)을 slug 기반으로 구분해 서비스한다. 병원마다
코드를 복제하지 않는다 — `clinics` 테이블의 행 하나가 병원 하나이고, 모든 병원이 같은
코드·DB·배포를 공유한다.

한 병원에 제공하는 것:

- **챗봇** (`/`, 환자용) — 진료시간·예약·비용·일반 의학정보 문의.
- **어드민** (`/admin/*`, 직원용) — AI 자동답변 검토·발송, 병원 정보·FAQ·회복가이드 편집.
- **홈페이지** (`/[slug]`, 공개) — 병원 1페이지 홈페이지. 챗봇 위젯 임베드.

핵심 원칙: **의료법 가드레일은 코드에 고정**(`lib/prompts/safety.js`, 어드민 편집 불가),
**병원별 가변 데이터는 DB**(어드민 편집 가능). 챗봇 시스템 프롬프트는 둘을 런타임 합성.

## B2. 시스템 구성 (배포 토폴로지)

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
- **랜딩 프로젝트** (`clinictalk-landing`) — `clinictalk.kr` 마케팅. 별도 리포·배포, 서브모듈 마운트.
- **외부 서비스**: Supabase(DB·인증·파일), Anthropic Claude(AI), Pusher(실시간).
- 배포는 `master` push → Vercel 자동 빌드.

## B3. 멀티테넌트 모델

테넌트 = 병원(`clinics` 행). 식별은 slug 기반.

| 대상 | 경로 | 병원 결정 방식 |
|---|---|---|
| 병원 홈페이지 | `/[slug]` | 경로의 slug |
| 챗봇 | `/?clinic=<slug>` | 쿼리 파라미터. 없으면 `thequeens` fallback |
| 챗봇 API | `/api/chat` | GET은 `?clinic`, POST는 body `clinicSlug` |
| 어드민 | `/admin/*` | 로그인 사용자 → `getCurrentClinic()` |

홈페이지의 챗봇 위젯이 자기 slug를 iframe `?clinic=`으로 넘겨 홈페이지·챗봇이 같은
병원을 가리키게 한다. `demo-` 접두 slug는 영업 시연용 가상 병원(문의 미저장).

향후: 기본 서브도메인 `<slug>.clinictalk.kr` + 선택적 커스텀 도메인 (미구현, B9 참고).

## B4. 인증·권한

### 역할 모델

- **admin** — 병원 직원. `clinic_users`로 (사용자↔병원) 매핑. 자기 병원 하나만.
- **superadmin** — SaaS 운영자. `superadmins` 테이블. 모든 병원 접근.

인증은 Supabase Auth(이메일+비밀번호).

### `getCurrentClinic()` — 컨텍스트 결정의 단일 진입점

`lib/auth/getCurrentClinic.js`. 모든 어드민 페이지·API가 호출해 `{ user, clinic, role }`을
얻는다.

- 미로그인 → 전부 `null`.
- **admin** → `clinic_users` 매핑된 병원.
- **superadmin** → `ct_clinic` 쿠키가 가리키는 병원. 쿠키 없으면 `clinic = null`
  → 호출 페이지가 `/admin/clinics` 운영 콘솔로 보냄. 로그인 시 `ct_clinic`을 초기화
  (`/api/select-clinic` DELETE)해 항상 병원 목록부터 시작.

### `proxy.js` (Next.js 16 미들웨어)

`/admin/*`, `/api/inquiries`, `/api/reply`, `/api/clinic-settings`, `/api/clinic-faqs`,
`/login` 진입 시 세션 검사·갱신. 미인증의 보호 경로 접근 → `/login`, 로그인 사용자의
`/login` 접근 → `/admin`. `/api/chat`은 환자(비로그인)용 공개 API라 보호하지 않는다.

### Supabase 클라이언트 3종 — 신뢰 경계

| 클라이언트 | 키 | 용도 |
|---|---|---|
| `lib/supabase/client.js` | anon | 브라우저. Auth 한정 |
| `lib/supabase/server.js` | anon + 쿠키 | 로그인 admin의 SSR/라우트. RLS가 `auth.uid()`로 작동 |
| `lib/supabase/service.js` | service_role | RLS 우회. 챗봇 API·어드민 mutation·`getCurrentClinic` |

`service_role` 키는 **절대 브라우저로 노출 금지** (`NEXT_PUBLIC_` 접두어 금지).

### RLS (Row Level Security)

7개 테이블에 RLS 활성화, 13개 정책. `anon` 차단, `authenticated`는
`user_can_access_clinic(clinic_id)` 통과 시 SELECT/UPDATE/DELETE. INSERT는 미부여
(어드민 mutation이 service_role 사용). `is_superadmin()` / `user_can_access_clinic()`은
`SECURITY DEFINER` 함수.

> superadmin은 RLS상 모든 병원에 접근 가능하므로, "선택 병원만" 좁혀야 하는 쿼리
> (`/api/inquiries` 등)는 `clinic_id`를 명시 필터한다.

## B5. 데이터 모델

```
auth.users ──┬──< superadmins (user_id)
             └──< clinic_users (user_id, clinic_id)

clinics ──┬── clinic_settings   (1:1, clinic_id PK)
 (테넌트) ├──< clinic_faqs
          ├──< clinic_recovery_guides
          ├──< clinic_change_logs
          └──< inquiries
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

병원마다 구조가 가변인 값은 JSONB에 둔다. 주요 키: `hours{weekday,saturday,lunch,
closed[]}`, `doctors_summary`, `departments[]`, `services[]`, `features[]`, `hours_notes[]`,
`notices[]`, `substitute_holiday_policy`, `parking`, `reservation_note`, `current_event`,
`event_image_url`, `disclaimer`, `tone`(warm|formal), `chat_menu{header,items[]}`,
`doctor_images[]`.

### Storage

Supabase Storage 버킷 `clinic-assets` (public, 2MB). 폴더 `{clinic_id}/{kind}/`
(kind: `logo`/`event`/`notice`/`doctor`) — 병원별 격리.

### 마이그레이션

`supabase/migrations/*.sql`. **Supabase Studio SQL Editor에 수동 적용** (CLI 미사용).
새 마이그레이션 작성 시 실제 DB 적용 여부 확인 필수.

## B6. 요청 흐름

### B6.1 환자 챗봇 (`/api/chat`)

```
환자 → app/page.js
  GET /api/chat?clinic=<slug>     → 병원명·진료상태·이벤트·면책·메뉴·테마·로고 로드
  POST /api/chat {message,...}    → 파이프라인
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

`/api/chat`은 `service.js`(service_role) 사용 — 비로그인 환자에게 anon INSERT 권한을
열지 않기 위함.

### B6.2 직원 어드민

```
직원 로그인 → /admin
  GET /api/inquiries  (server 클라이언트, RLS + clinic_id 명시 필터)
  Pusher "admin-channel" 구독 → 새 문의 실시간 수신
  AI 초안 검토·수정 → POST /api/reply
        → inquiries UPDATE + Pusher "client-<sessionId>"로 환자에게 답변 푸시
```

### B6.3 superadmin 콘솔

```
superadmin 로그인 → /admin → (ct_clinic 쿠키 없음) → /admin/clinics 콘솔
  병원 [관리] → POST /api/select-clinic → ct_clinic 쿠키 설정 → /admin
  헤더 [병원 전환] → /admin/clinics 복귀
  [+ 병원 등록] → /admin/onboarding (clinics+settings+직원계정+매핑 일괄 생성)
```

### B6.4 병원 홈페이지 (`/[slug]`)

서버 컴포넌트가 `clinics` + `clinic_settings` 조회 → `clinic.template`(classic|modern|
soft)로 템플릿 분기 → 렌더. `?template=`로 미리보기 override. 우하단 `ChatWidget`
(챗봇 iframe 토글) 임베드.

## B7. 챗봇 시스템 프롬프트 조립

```
buildPrompt(clinicId)
  ├─ clinics + clinic_settings + clinic_faqs + clinic_recovery_guides 4쿼리 (병렬)
  ├─ [병원 정보] / [주요 진료 항목] / [병원 특징] 섹션 조립  ← DB 데이터
  ├─ safetyRules({clinicName, bookingUrl, tone})            ← 코드 고정 가드레일
  ├─ [참고: 수술 후 회복 가이드]                             ← DB 데이터
  └─ [참고: 자주 묻는 질문]                                  ← DB 데이터
```

**섹션 순서가 중요하다.** 안전 규칙이 FAQ·회복가이드보다 **먼저** 와야 한다 — 참고
데이터의 답변 패턴이 안전 규칙(증상→`STAFF_REQUIRED`)을 덮어쓰는 현상 방지.

`safety.js`는 의료법 가드레일을 담으며 **어드민 편집 불가**. `clinicName`/`bookingUrl`/
`tone`만 인자로 받는다. 모델은 응답에 `STAFF_REQUIRED` / `CATEGORY:<분류>` 태그를
붙이고 route가 파싱한다. 모델은 `claude-haiku-4-5-20251001`.

## B8. 핵심 아키텍처 결정

| 결정 | 이유 |
|---|---|
| 단일 멀티테넌트 앱 (병원별 프로젝트 X) | 코드·배포 1벌. 새 병원 = DB 행 추가 |
| 의료법 가드레일을 코드에 고정 | 어드민이 안전 룰을 망가뜨릴 수 없게. 법적 리스크 차단 |
| 시스템 프롬프트 = 코드(safety) + DB(병원 데이터) 분리 | 멀티테넌트화의 전제 |
| 챗봇 API → service_role | 비로그인 환자에게 anon INSERT 권한을 열지 않기 위함 |
| RLS는 모든 코드 준비 후 일괄 활성화 | 중간에 켜면 라이브 앱이 깨짐 |
| `clinic_settings.settings` JSONB | 병원마다 다른 가변 데이터를 스키마 변경 없이 수용 |
| FAQ 섹션을 [답변 규칙] 뒤에 배치 | 참고 데이터가 안전 룰을 덮어쓰는 현상 방지 |
| superadmin 병원 컨텍스트 = 쿠키 | superadmin은 특정 병원에 매이지 않음. 콘솔에서 선택·전환 |

## B9. 확장 예정

- **도메인 라우팅** — `<slug>.clinictalk.kr` 서브도메인 + 커스텀 도메인. `proxy.js`에
  호스트명→병원 해석, `clinics.custom_domain` 컬럼 추가.
- **`safety.js` 멀티 진료과화** — 현재 챗봇 가드레일은 산부인과 전용. 일반 병원에 챗봇을
  팔려면 진료과별 안전 룰 분리가 선행돼야 함. (비산부인과 데모는 `chatbot_enabled=false`)
- **시스템 프롬프트 캐싱** — `buildPrompt`가 chat 호출마다 DB 4쿼리. 트래픽 증가 시 검토.
