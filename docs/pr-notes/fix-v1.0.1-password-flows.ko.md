# release: v1.0.1 — confirm password + 비밀번호 재설정

## 요약

v1 릴리스(v1.0.0) 이후 첫 패치. 회원가입 시 비밀번호 오타 방지 + 잊어버린
비밀번호 재설정 흐름 추가.

## 변경 사항

### 1. 회원가입 비밀번호 확인
- `/signup` 폼에 **비밀번호 확인** 입력 필드 추가
- 폼 제출 시 두 값 일치 확인 → 불일치면 "비밀번호가 일치하지 않아요"
  에러 표시 (Supabase 호출 전)

### 2. 비밀번호 재설정 흐름 (3개 페이지 + 1개 route handler)

```
/login → "비밀번호를 잊으셨나요?" 링크
  ↓
/forgot-password → 이메일 입력 → resetPasswordForEmail 호출
  ↓
사용자가 메일에서 링크 클릭
  ↓
/auth/callback?code=xxx&next=/reset-password
  ↓ (exchangeCodeForSession 성공)
/reset-password → 새 비밀번호 입력 → updateUser
  ↓
/admin (이미 로그인된 상태로 진입)
```

- `src/app/forgot-password/{page,form,actions}.tsx` 신규
- `src/app/reset-password/{page,form,actions}.tsx` 신규
- `src/app/auth/callback/route.ts` 신규 (Route Handler)
- `src/app/login/page.tsx`에 forgot-password 링크 추가

### 3. 릴리스 메타데이터
- `package.json` version `0.1.0` → `1.0.1`
- README.md / README.ko.md 상단에 GitHub Release 배지 추가

## 핵심 설계 결정

### redirectTo URL은 환경에 따라 동적
`forgotPasswordAction`에서 `headers().get('host')`로 현재 호스트 받아서
`<protocol>://<host>/auth/callback?next=/reset-password` 생성. dev에선
localhost, prod에선 vercel URL로 자동 분기 → 환경변수 추가 X.

### Auth Callback을 Route Handler로
페이지 컴포넌트 대신 Route Handler(`route.ts`)로 처리. 이유: 토큰 교환은
사용자에게 보여줄 UI가 없는 순수 redirect 작업이라 페이지가 필요 없음.

### `/reset-password`에서 비로그인이면 `/forgot-password`로 redirect
메일 링크를 거치지 않고 직접 접근하면 세션이 없음. 페이지에서
`getUser()` 체크 후 forgot-password로 안내.

### Confirm password는 client + server 양쪽 검증
HTML5 `required + minLength`(client) + server action에서 일치 비교.
HTML5만 믿으면 우회 가능 → server-side가 진실.

## 검증

- [x] `npx tsc --noEmit` 통과
- [x] `npm run lint` 통과
- [x] 수동 테스트:
  1. 회원가입 비밀번호 불일치 → 에러 표시
  2. 비밀번호 일치 → 정상 가입
  3. 로그인 페이지에 forgot-password 링크 보임
  4. forgot-password → 이메일 입력 → 메일 발송 성공 메시지
  5. 진짜 이메일 받기 + 링크 클릭 → callback → reset-password 도착
  6. 새 비밀번호 입력 → /admin 자동 진입
  7. 로그아웃 → 새 비밀번호로 재로그인 OK

## 향후 작업

- 운영 단계: Confirm email 다시 켜기 + 캡차
- 메일 템플릿 한국어 커스터마이징 (Supabase 대시보드 → Email Templates)
