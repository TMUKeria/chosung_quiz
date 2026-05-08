# 초성 퀴즈 (chosung_quiz)

> 특수아동 수업용 초성 퀴즈 도구 — 선생님이 퀴즈를 만들고, 큰 화면에 풀스크린으로 띄워서 함께 풀어요.

🚀 **Demo**: _배포 후 추가 예정_ (Vercel)

## ✨ 주요 특징

- **풀스크린 발표 모드** — 큰 글자 + 고대비 + 자극 최소화 (특수아동 친화)
- **자동 초성 변환** — 단어 입력하면 한글 유니코드 직접 분석해서 초성으로 변환 (`사과 주스` → `ㅅㄱ ㅈㅅ`)
- **유연한 힌트 시스템** — 텍스트 / 이미지 / 자모 공개를 자유롭게 조합
- **타이머 없음, 입력 없음** — 학생은 화면만 보면 됨

## 🛠️ 기술 스택

| 영역 | 도구 |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 4 |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Hosting | Vercel |

## 🏃 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase URL/anon key를 채워 넣기

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기.

## 📁 폴더 구조

```
src/
├── app/                  Next.js App Router 페이지
├── components/           재사용 UI 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts     브라우저용 Supabase 클라이언트
│   │   └── server.ts     서버용 Supabase 클라이언트
│   └── utils/
│       └── hangul.ts     한글 → 초성 변환 유틸
└── proxy.ts              Supabase 세션 갱신 (Next.js 16 컨벤션)
```

## 🎯 학습/포트폴리오 포인트

- **접근성/포용적 디자인** — 특수아동 수업 맥락에서의 UX 결정
- **한글 유니코드 직접 처리** — 라이브러리 없이 자모 분리 구현
- **Supabase RLS** — 행 단위 접근 제어 정책 설계
- **Next.js 16 신규 컨벤션** — `proxy.ts` (구 `middleware.ts`)

## 📜 라이선스

개인 학습/포트폴리오용 프로젝트.
