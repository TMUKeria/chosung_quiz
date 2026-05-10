# 초성 퀴즈 — 수업용 초성 맞히기 도구

[![Release](https://img.shields.io/github/v/release/TMUKeria/chosung_quiz?label=release&color=blue)](https://github.com/TMUKeria/chosung_quiz/releases)

[Read in English →](README.md)

선생님이 수업용 초성 퀴즈를 만들고, 수업 시간에 풀스크린으로 학생들에게 보여주는 웹 도구. **특수교육 맥락의 포용적 디자인** — 타이머 X, 학생 입력 X, 시각적 자극 X.

🔗 **[데모](https://chosung-quiz-three.vercel.app)** — 자유롭게 가입해서 둘러보세요

---

## 스크린샷

| 로그인 | 관리자 목록 |
|---|---|
| ![Login](docs/screenshots/01-login.png) | ![Admin list](docs/screenshots/02-admin-list.png) |

| 만들기 폼 | 풀기 화면 |
|---|---|
| ![Create form](docs/screenshots/03-create-form.png) | ![Play screen](docs/screenshots/04-play.png) |

풀기 화면 캡처에서 받침이 글자 아래 별도 영역에 표시되는 것을 볼 수 있어요 — `ㅋ` 아래에 `ㄴ`. 한글 음절은 모음 없이 받침만 결합할 수 없어서, 인라인 강제 결합 대신 위/아래 분리(C 패턴)로 처리.

---

## 만든 이유

특수아동 수업 도구는 일반 교육용과 다른 결정이 필요했어요:

- **타이머 X** — 가장 도움이 필요한 학생들에게 스트레스를 주는 요소예요.
- **학생 입력 X** — 읽기/타이핑 속도가 진입 장벽이 되면 안 돼요.
- **애니메이션·사운드 X** — 감각 과부하 가능성.

선생님이 한 화면에서 전체 흐름을 컨트롤하고, 학생은 큰 모니터로 화면만 봅니다.

---

## 기술 스택

- **Next.js 16** (App Router · Server Actions · Turbopack)
- **React 19** (`useActionState` / `useTransition`)
- **TypeScript** (strict, `any` 금지)
- **Tailwind CSS 4**
- **Supabase** — Postgres · Auth · Row Level Security
- **react-joyride** — 만들기 화면 첫 방문 spotlight tour
- **Vercel** — 배포

---

## 아키텍처 하이라이트

### RLS가 곧 보안 경계
모든 테이블에 `auth.uid() = teacher_id` 정책. 자식 테이블(`questions`, `hints`)은 부모 테이블 통한 EXISTS 검사. **앱 코드에서 `where teacher_id = ?` 안 씀** — 개발자가 필터를 빼먹어도 DB가 다른 사람 데이터를 반환하지 않음.

### 한글 유니코드 직접 처리
초성 추출과 받침 처리를 라이브러리 없이 codepoint 산술로:
```ts
const code = ch.charCodeAt(0) - 0xAC00
const choIdx  = Math.floor(code / 588)  // 초성 인덱스
const jongIdx = code % 28               // 종성 인덱스 (0이면 받침 없음)
```

### 마이그레이션은 누적
`supabase/migrations/`에 시퀀스 SQL 파일 3개. 나중 마이그레이션(`0003`)이 이전(`0002`)을 덮어써도 이전 파일을 지우지 않음 — git commit 역사 보존과 같은 원칙.

### 폼 컴포넌트 일반화
`QuizForm`이 `mode: 'create' | 'edit'`, `initialData`, `onSave` props를 받음. 만들기 페이지는 `saveQuizAction`, 수정 페이지는 `updateQuizAction.bind(null, id)` (부분 적용). 한 컴포넌트가 두 화면을 다 담당.

### 받침 인라인 표시 = 위/아래 분리 (C 패턴)
풀기 화면의 각 음절은 2단 셀 — 윗 줄: 초성/자음+모음/글자 통째, 아랫 줄: 받침 자모. 받침을 사용하는 셀이 하나라도 있으면 모든 셀에 받침 영역을 미리 reserve해서 화면이 출렁이지 않게.

---

## 포트폴리오 어필 포인트

1. **접근성/포용적 디자인** — 특수아동 수업 맥락에서의 UX 결정 근거가 코드와 README에 명시.
2. **한글 유니코드 직접 다루기** — 라이브러리 없이 자모 분해/결합. 면접 토픽.
3. **Supabase RLS 정책 설계** — 부모-자식 관계에서 EXISTS join으로 권한 검증.
4. **Next.js 16 / React 19 신규 패턴** — Server Actions, `useTransition`, `useActionState`, `proxy.ts`.
5. **마이그레이션 누적 패턴** — 실무에서 새 개발자가 합류해도 같은 결과 보장.

---

## 로컬 실행

```bash
git clone https://github.com/TMUKeria/chosung_quiz.git
cd chosung_quiz
npm install
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
npm run dev
```

Supabase 설정:
1. https://supabase.com 에서 프로젝트 생성
2. `supabase/migrations/`의 SQL 파일을 순서대로 SQL Editor에서 실행
3. Authentication → Providers → Email에서 **Confirm email 끄기** (이 앱은 synchronous signup 사용)
4. Project URL과 anon key를 `.env.local`에 입력

---

## 향후 계획

- [ ] 이미지 힌트 (Supabase Storage)
- [ ] AI 자동 퀴즈 생성 (Claude API)
- [ ] 모달 기반 삭제 확인 (`window.confirm()` 대체)
- [ ] 운영 단계 보안 강화 (Confirm email 다시 켜기 + 캡차)
