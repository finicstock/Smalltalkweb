# 닉스의 스몰톡

투자 인사이트 구독 플랫폼. 무료/유료 콘텐츠를 발행하고, 유료 구독자에게 텔레그램 커뮤니티 입장권을 제공합니다.

---

## 관리자 사용 가이드 (코딩 없이 편집 가능한 항목)

관리자 페이지(`/admin`)에 로그인하면 아래 항목을 코딩 없이 직접 편집할 수 있습니다.

| 메뉴 | 할 수 있는 일 |
|------|-------------|
| 대시보드 | 전체 회원 수, 발행 콘텐츠 수, 유료 구독자 수 확인 |
| 콘텐츠 관리 | 아티클/영상 작성·수정·삭제, 무료/유료 설정, 발행 상태 변경 |
| 카테고리 | 콘텐츠 분류 카테고리 추가·수정·삭제 |
| 구독 플랜 | 월간/연간 가격, 혜택 목록, 플랜 활성화 여부 설정 |
| 재생목록 | 콘텐츠를 묶어 재생목록 구성 |
| 텔레그램 입장권 | 구독자에게 보여줄 텔레그램 초대 링크·채널명·안내 문구 설정 |
| 구독자 목록 | 유료 구독자 현황 확인 |

### 코딩이 필요한 항목 (현재 하드코딩)

아래 항목은 코드를 수정해야 변경됩니다:

| 항목 | 파일 위치 | 설명 |
|------|----------|------|
| 홈페이지 히어로 문구 | `client/src/pages/Home.tsx` | "투자의 본질을 이야기합니다" 등 |
| 구독 페이지 FAQ | `client/src/pages/Pricing.tsx` | 자주 묻는 질문 목록 |
| 푸터 정보 | `client/src/components/Footer.tsx` | 하단 링크, 브랜드 문구 |
| 로고 이미지 | 각 페이지 상단 `LOGO_URL` 상수 | 로고 교체 시 업로드 후 URL 변경 |
| 색상/폰트 | `client/src/index.css` | 전체 디자인 토큰 |

---

## 개발자 가이드

### 기술 스택

- **프론트엔드**: React 19 + Tailwind CSS 4 + shadcn/ui + wouter (라우팅)
- **백엔드**: Express 4 + tRPC 11 + Drizzle ORM
- **DB**: MySQL (TiDB)
- **인증**: Manus OAuth (세션 쿠키 기반)
- **결제**: 토스페이먼츠 정기결제 (API 구조 준비됨, 키 미연동)

### 디렉토리 구조

```
client/src/
├── pages/           → 페이지 컴포넌트 (Home, Contents, Pricing, MyPage, SearchPage)
├── pages/admin/     → 관리자 페이지 (AdminDashboard, AdminContents, AdminTelegram 등)
├── components/      → 공통 컴포넌트 (Header, Footer, Layout, MarkdownEditor)
├── components/ui/   → shadcn/ui 기본 컴포넌트
├── hooks/           → 커스텀 훅
├── lib/             → tRPC 클라이언트, 유틸리티
└── index.css        → 글로벌 스타일 (디자인 토큰)

server/
├── routers.ts       → tRPC 프로시저 정의 (public/protected/admin)
├── db.ts            → DB 쿼리 헬퍼 함수
├── payment.ts       → 토스페이먼츠 결제 유틸리티
├── storage.ts       → S3 파일 스토리지 헬퍼
└── _core/           → 프레임워크 코드 (수정 금지)

drizzle/
├── schema.ts        → DB 테이블 정의 (Drizzle ORM)
└── relations.ts     → 테이블 관계 정의

shared/
├── types.ts         → 공유 타입
└── const.ts         → 공유 상수
```

### 주요 패턴

1. **데이터 흐름**: `drizzle/schema.ts` → `server/db.ts` → `server/routers.ts` → `client/src/pages/*.tsx`
2. **인증 구분**: `publicProcedure` (누구나), `protectedProcedure` (로그인 필수), `adminProcedure` (관리자만)
3. **프론트엔드 데이터**: `trpc.*.useQuery()` / `trpc.*.useMutation()` 사용
4. **스타일**: Tailwind 유틸리티 + shadcn/ui 컴포넌트 조합

### 새 기능 추가 절차

1. `drizzle/schema.ts`에 테이블 추가 → `pnpm drizzle-kit generate` → SQL 실행
2. `server/db.ts`에 쿼리 헬퍼 추가
3. `server/routers.ts`에 tRPC 프로시저 추가
4. `client/src/pages/`에 UI 페이지 생성
5. `client/src/App.tsx`에 라우트 등록
6. `server/features.test.ts`에 테스트 추가 → `pnpm test`

### 테스트

```bash
pnpm test          # Vitest 단위 테스트 실행
```

### 환경 변수

시스템에서 자동 주입됩니다. `.env` 파일을 직접 편집하지 마세요.

- `DATABASE_URL` - DB 연결 문자열
- `JWT_SECRET` - 세션 서명 키
- `VITE_APP_ID` - OAuth 앱 ID
- `BUILT_IN_FORGE_API_KEY` - 내부 API 키

---

## 현재 기능 목록

- 홈페이지 (브랜드 소개, CTA)
- 콘텐츠 목록/상세 (카테고리 필터, 검색, 페이지네이션)
- 페이월 (유료 콘텐츠 잠금 + 미리보기)
- 구독 안내 페이지 (플랜 비교, 결제 CTA)
- 마이페이지 (프로필, 구독 상태, 텔레그램 입장권)
- 관리자 CMS (콘텐츠 CRUD, 카테고리, 플랜, 재생목록, 텔레그램 설정)
- 토스페이먼츠 결제 구조 (API 키 연동 대기)
- 텔레그램 입장권 (구독자 전용 초대 링크)
