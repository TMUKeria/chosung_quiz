# feat: teacher auth (email + password)

## 요약

선생님 인증 흐름을 만들었어요. 회원가입 / 로그인 / 로그아웃 + 비로그인 사용자 차단(인증 가드)까지.
이메일과 비밀번호로 가입하면 즉시 로그인되어 `/admin` 홈으로 진입합니다.

## 변경 사항

### 1. 인증 페이지 — `/signup`, `/login`

각 경로에 **3개 파일**로 구성했어요:

```
src/app/signup/
├── page.tsx     서버 컴포넌트 (정적 마크업)
├── form.tsx     클라이언트 컴포넌트 (인터랙션)
└── actions.ts   서버 액션 (Supabase Auth 호출)
```

`/login`도 같은 구조의 거울. 차이는 `signUp` ↔ `signInWithPassword`와 텍스트뿐.

### 2. 로그인 후 도착 페이지 — `/admin`

- `src/app/admin/page.tsx` — 환영 메시지(이메일) + "퀴즈 만들기!" 큰 버튼 + 로그아웃 버튼
- `src/app/admin/actions.ts` — `logoutAction` (서버 액션)
- `src/app/admin/new/page.tsx` — 다음 PR(#4)에서 진짜 폼이 들어올 placeholder

### 3. 루트(`/`) 자동 분기 — `src/app/page.tsx`

create-next-app 기본 페이지를 지우고, 로그인 상태에 따라 자동 redirect:
- 로그인 ✓ → `/admin`
- 로그인 ✗ → `/login`

### 4. 인증 가드 — `src/proxy.ts`

기존 세션 갱신 로직에 두 규칙을 추가했어요:
- `/admin/*`인데 비로그인 → `/login`으로 차단
- `/login` 또는 `/signup`인데 이미 로그인 → `/admin`으로 보냄

## 핵심 설계 결정

### 인증 방식: 이메일 + 비밀번호 (가짜 이메일 트릭 X)

처음엔 username + password (가짜 이메일로 변환) 방안을 검토했지만,
**진짜 이메일을 그대로 쓰는 쪽**으로 결정했어요. 이유:

- 변환 헬퍼(`username↔email`) 안 만들어도 됨 = 코드 단순
- Supabase Auth 표준 흐름 그대로 = 학습 가치 ↑
- 나중에 비밀번호 분실 → 이메일로 재설정 흐름 추가하기 쉬움

### Email confirmation OFF

Supabase 대시보드에서 `Confirm email` 토글을 껐어요. 이유는 v1 데모/학습용이라
가입 후 즉시 사용 가능해야 자연스럽기 때문. **운영 단계에선 다시 켜고 캡차 추가**가
follow-up 항목입니다.

### 인증 가드는 페이지 안이 아니라 `proxy.ts`에

`proxy.ts`는 모든 요청이 페이지에 도착하기 전 거치는 **검문소**예요.
각 페이지 안에서 `if (!user) redirect(...)`를 매번 쓰는 것보다 한 군데에서 일괄 통제 = 일관성 ↑ + 빼먹는 사고 ↓.

### 에러 메시지 한국어 변환 — `translateAuthError()`

Supabase가 영어로 돌려주는 메시지(`"Invalid login credentials"` 등)를
사용자 친화적 한국어로 매핑. CLAUDE.md의 "raw DB 에러 노출 금지" 규칙 적용.

## 학습 포인트 (스스로 정리용)

### 1) Server Component vs Client Component
**Server Component** = 서버에서 미리 HTML로 만들어 전송. JavaScript가 브라우저로 안 감.
**Client Component** = `"use client"` 디렉티브. 인터랙션(클릭, 입력 등)이 있을 때만 사용.

이번 PR에선 page는 Server, form만 Client로 분리 → 번들 사이즈 최소화.

### 2) Server Action
`"use server"` 함수는 **서버에서만 실행**. 폼의 `action={함수}`로 직접 연결하면
별도 API route 안 만들어도 됨. Next.js 16의 가장 큰 변화 중 하나.

### 3) `useActionState` (React 19)
```tsx
const [state, formAction, isPending] = useActionState(action, initialState)
```
- `state` → 액션이 반환한 값 (에러 메시지)
- `formAction` → 폼에 연결할 함수
- `isPending` → 제출 중 상태 (버튼 disable + 텍스트 변경)

이전의 `useFormState`(React 18) 후속.

### 4) `proxy.ts` = 검문소 패턴
페이지 내부 if 분기 대신 **요청 진입 시점**에 한 번에 인증 검사. 보안 표준.

## 검증

- [x] 타입 체크 — `npx tsc --noEmit` 통과
- [x] 린트 — `npm run lint` 통과 (경고/에러 없음)
- [x] 수동 테스트 시나리오 7개 모두 통과:
  1. `/` → 자동 `/login`
  2. `/signup` → 회원가입 → 즉시 `/admin`
  3. `/admin` → "퀴즈 만들기!" → `/admin/new`
  4. 로그아웃 → `/login`
  5. 비로그인으로 `/admin` 직접 접근 → `/login`으로 차단
  6. 로그인 상태에서 `/login` 접근 → `/admin`으로 보냄
  7. 다시 로그인 → 정상 진입

## 다음 작업

- **PR #4** `feat: quiz creation form` — `/admin/new` placeholder를 실제 폼으로 교체.
  단어 입력 → 자동 초성 변환, 모음 힌트 토글, `hints.type` CHECK 확장 마이그레이션
  (`reveal_vowel` 추가) 포함.
- **운영 follow-up**: Email confirmation 다시 켜기 + 캡차 추가 (배포 직전).
