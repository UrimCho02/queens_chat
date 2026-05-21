# ClinicTalk (작업 디렉토리명: obgyn-demo)

## 프로젝트 개요

**서비스명**: ClinicTalk — 개인 병원용 AI 챗봇 SaaS
**현재 상태**: 더퀸즈여성의원 단일 운영 → 멀티테넌트 SaaS로 전환 중 (branch: `multitenant`)
**타겟**: 1차 산부인과/여성의원, 향후 일반 개인 병원 전반

환자가 전화 대신 채팅으로 24시간 진료시간/예약/비용/일반 의학 정보를 문의할 수 있고, 직원은 어드민 페이지에서 AI 자동 답변을 검토·발송한다. 의료법 가드레일이 코드 단에 박혀 있어 증상 진단 같은 위험 영역은 자동으로 직원 확인으로 전환된다.

**관련 리포 / 배포**
- 챗봇 본체: `UrimCho02/queens_chat` → Vercel **queens-chat** 프로젝트 (`queens-chat.vercel.app`). 디렉토리명 `obgyn-demo` 와 다름. 커스텀 도메인 미연결 (더퀸즈가 도메인 구입 시 연결 예정).
- 랜딩 페이지: `UrimCho02/clinictalk-landing` (서브모듈로 마운트). 별도 Vercel 프로젝트, 도메인 **clinictalk.kr**.

## 기술 스택

- **Next.js 16.2.4** (App Router, Turbopack). Next.js 16에서 `middleware.js` 컨벤션이 `proxy.js`로 바뀐 점 주의.
- **React 19.2.4**
- **Supabase** — Postgres + Auth + Storage. SSR 통합은 `@supabase/ssr ^0.10.3`.
- **Anthropic Claude API** — 모델 `claude-haiku-4-5-20251001`. SDK `@anthropic-ai/sdk ^0.91.1`.
- **Pusher** — 어드민↔챗봇 실시간 답변 푸시.
- **TailwindCSS v4** (`@tailwindcss/postcss`).
- **Vercel** — 프로덕션 배포.

## 디렉토리 구조

```
obgyn-demo/
├── app/                            # Next.js App Router
│   ├── page.js                     # 챗봇 메인 (환자용)
│   ├── layout.js                   # 루트 레이아웃
│   ├── login/page.js               # Supabase Auth 로그인 화면
│   ├── admin/
│   │   ├── page.js                 # 어드민: 문의 목록 + 답변 발송
│   │   ├── settings/{page,SettingsForm}.js   # 병원 정보 + 챗봇 설정 편집
│   │   └── faqs/{page,FaqsManager}.js        # FAQ CRUD
│   └── api/
│       ├── chat/route.js           # 챗봇 응답 생성 (Claude 호출)
│       ├── inquiries/route.js      # 어드민: 문의 조회/삭제
│       ├── reply/route.js          # 어드민: 답변 발송 (Pusher)
│       ├── clinic-settings/route.js
│       ├── clinic-faqs/route.js, [id]/route.js
│       └── auth/  (현재 비어있음 — 5C에서 비밀번호 쿠키 방식 제거)
├── lib/
│   ├── supabase/{client,server,service}.js  # 역할별 클라이언트 (아래 "주요 결정" 참고)
│   ├── auth/getCurrentClinic.js    # 로그인 사용자 → user/clinic/role 결정
│   └── prompts/
│       ├── safety.js               # 의료법 가드레일 (코드 단 고정)
│       └── buildPrompt.js          # 병원별 DB 조회 → 시스템 프롬프트 조립
├── supabase/migrations/            # DDL 파일들 (Studio SQL Editor에 수동 적용)
├── clinictalk-landing/             # 서브모듈 (별도 리포)
├── proxy.js                        # Next.js 16용 미들웨어 (인증 보호 + 세션 갱신)
├── CLAUDE.md                       # 이 파일
└── WORK_LOG.md                     # 작업 일지
```

## 주요 파일과 역할

| 파일 | 책임 |
|---|---|
| `app/page.js` | 챗봇 UI. Pusher로 직원 답변 수신. `/api/chat`에 메시지 POST. |
| `app/admin/page.js` | 문의 목록 (직원 확인 필요 / 전체 탭). 카테고리 필터. AI 초안 편집 후 발송. |
| `app/api/chat/route.js` | **핵심 비즈니스 로직.** 개인정보 마스킹 → 일일 한도 체크 → `buildPrompt`로 시스템 프롬프트 → Claude 호출 → STAFF_REQUIRED/CATEGORY 태그 파싱 → `inquiries` INSERT → 직원 확인 필요 시 Pusher로 어드민 채널 푸시. |
| `lib/prompts/safety.js` | 의료법 가드레일. `clinicName`/`bookingUrl` 인자로 받음. **어드민이 편집 불가.** |
| `lib/prompts/buildPrompt.js` | `clinics` + `clinic_settings` + `clinic_faqs` (`is_active=true`) 3쿼리 → 시스템 프롬프트 조립. FAQ 섹션 순서는 `[답변 규칙]` **뒤** (앞에 두면 모델이 FAQ 패턴 따라 안전 룰 무시함). |
| `lib/auth/getCurrentClinic.js` | `superadmins` 우선 조회 → 본인이면 첫 clinic. 아니면 `clinic_users` 매핑된 clinic. service_role로 조회해서 RLS 우회. |
| `lib/supabase/client.js` | 브라우저용 anon. signInWithPassword / signOut 정도. |
| `lib/supabase/server.js` | 서버용 anon + cookie. 로그인된 admin이 호출하는 라우트/페이지에서 사용. RLS가 auth.uid()로 작동. |
| `lib/supabase/service.js` | service_role. RLS bypass. 챗봇 API와 어드민 mutation API에서 사용. 절대 브라우저로 보내지 않음 (NEXT_PUBLIC_ 접두어 금지). |
| `proxy.js` | `/admin/*`, `/api/inquiries`, `/api/reply` 보호 + 세션 갱신. 미로그인이면 `/login`으로. |
| `supabase/migrations/*.sql` | Supabase Studio SQL Editor에 **수동 적용**. CLI는 안 씀. |

## 코드 작성 원칙

- **언어**: 한글 주석/UI 텍스트 사용. 식별자는 영문.
- **파일**: JavaScript (TypeScript 아님). `.js` 확장자. 컴포넌트는 `PascalCase.js`, 라우트는 `route.js`/`page.js` (App Router 컨벤션).
- **스타일**: TailwindCSS 클래스 직접 사용. CSS-in-JS / styled-components 없음. 색 토큰은 `#C9A96E` (브랜드 골드) 기준.
- **클라이언트 분리 원칙** — 어떤 코드 경로가 어떤 클라이언트를 쓰는지 명확히:
  - 비로그인 환자 트래픽 (`/api/chat`) → `service.js` (service_role)
  - 로그인 admin 트래픽이지만 mutation이 본인 clinic만 만지는 경우 → `service.js` (편의상)
  - 로그인 admin이 본인 데이터만 보는 read 경로 → `server.js` (cookie auth, RLS로 자동 격리)
  - 브라우저에서 직접 Supabase 호출 → `client.js` (auth 한정)
- **주석**: 의도/제약/주의점만. WHAT은 코드로 충분.
- **에러 처리**: API 라우트는 `try/catch + Response.json({ error }, { status })`. 사용자 메시지는 한글.
- **새 API 라우트 패턴**: `getCurrentClinic()` 호출 → `user`/`clinic` 검증 → `createServiceClient()` 또는 `createClient()` 분기.

## 환경 변수

`.env.local` (로컬) 과 Vercel 환경변수 양쪽에 동일하게 둬야 함.

| 키 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/SSR에서 사용. RLS 정책의 authenticated 컨텍스트 진입점. |
| `SUPABASE_SERVICE_ROLE_KEY` | **절대 브라우저로 노출 금지.** service client 전용. |
| `ANTHROPIC_API_KEY` | Claude API |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | 서버에서 trigger 용 |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | 브라우저에서 subscribe 용 |
| `DAILY_LIMIT` | 일일 챗봇 응답 한도. 코드 fallback이 파일별 불일치 (`inquiries` 50 / `chat` 20). Vercel 에 `20` 명시. |

## 자주 사용하는 명령어

```bash
npm run dev     # 로컬 개발 서버 (Turbopack, http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint
```

배포는 GitHub `master` push → Vercel 자동 배포 (queens-chat 프로젝트).
서브모듈 작업 시 `git -C clinictalk-landing <cmd>` 형태로.

## 주요 결정 사항

- **멀티테넌트 URL 식별**: slug 기반. 홈페이지는 `/[slug]/`, 챗봇은 `/?clinic=<slug>` 쿼리 파라미터(홈페이지 임베드 위젯이 전달, 없으면 더퀸즈 fallback). 서브도메인은 추후.
- **홈페이지 템플릿**: `clinics.template` (classic|modern|soft). `app/[slug]/page.js`가 분기, `?template=<key>`로 미리보기 override. 템플릿은 `app/[slug]/templates/`에, 공통 데이터 가공은 `shared.js`. 데이터·어드민은 템플릿과 무관하게 공유 — 보이는 레이아웃만 다름. 영업 데모용 가상 병원 `demo-obgyn`/`demo-internal` (SQL 시드만, 어드민 없음).
- **`clinic_settings` 구조**: 정규화 컬럼 (`booking_url`, `slogan`) + JSONB `settings` (hours, doctors_summary, services, features, departments, parking, reservation_note, current_event, disclaimer, tone 등 가변).
- **인증 방식**: 이메일+비밀번호 Supabase Auth. 매직링크/OAuth는 추후.
- **역할 모델**: `admin` (`clinic_users` 매핑) + `superadmin` (별도 `superadmins` 테이블). superadmin = SaaS 운영자 (우림님 본인).
- **챗봇 API → service_role**: anon 권한을 inquiries INSERT에 열어주는 보안 risk 회피.
- **RLS는 모든 코드 준비 후 일괄 활성화**: 5E 단계. 중간에 켜면 라이브 앱 깨짐.
- **의료법 안전 가드레일 = 코드 단 고정** (`lib/prompts/safety.js`). 어드민이 편집할 수 있는 건 `clinic_settings` / `clinic_faqs` 뿐.
- **FAQ 섹션은 시스템 프롬프트의 `[답변 규칙]` 뒤**에 둠. 앞에 두면 모델이 FAQ의 친절-답변 패턴을 따라 안전 룰(증상 → STAFF_REQUIRED)을 무시함. 라벨링도 "[참고: 자주 묻는 질문] — [답변 규칙] 우선 적용".

## 작업 시 주의사항

1. **마이그레이션 파일과 실제 DB 상태 동기화 필수.** 새 마이그레이션 작성 시 사용자가 Studio SQL Editor에 적용했는지 매번 확인.
2. **사용자는 비개발자.** HTML/Python/SQL 기본은 알지만 npm·env·git 등 CLI 작업은 단계별 spell-out 필요. 화면에서 클릭할 수 있는 경로(Studio/Vercel)는 클릭 가이드로.
3. **환경**: Windows 11 + PowerShell + VS Code + Supabase Studio + Vercel.
4. **퇴근/end-of-session 신호 시 자동 commit + push** (메모리 `feedback_auto_commit_on_leave.md` 룰).
5. **Next.js 16 컨벤션 변화**: `middleware.js` → `proxy.js`, 함수명도 `middleware` → `proxy`. API는 동일.
6. **Vercel 프로젝트명은 queens-chat** (production 도메인 `queens-chat.vercel.app`). 디렉토리명 `obgyn-demo`와 다름.
7. **`DAILY_LIMIT` fallback 불일치**: `inquiries` route 기본값 50, `chat` route 기본값 20. Vercel에 `DAILY_LIMIT=20` 환경변수로 덮음. 코드 정리는 미뤄둠.
8. **시스템 프롬프트 분리 후 캐싱 가능성**: `buildPrompt` 가 chat 호출마다 DB 3쿼리. 현재는 무시. 트래픽 늘면 검토.
9. **상세 진척도 / 단계별 작업 결정은 `WORK_LOG.md` 와 자동 메모리(`.claude/projects/.../memory/multitenant_conversion.md`) 참조.**
