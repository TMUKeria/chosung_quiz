# chosung_quiz — 초성 퀴즈 수업 도구

> Next.js 16 관련 주의사항은 [AGENTS.md](./AGENTS.md)도 같이 읽기.
> (Next.js 16은 v15 이전과 API/컨벤션이 달라 train data가 어긋날 수 있음 — `middleware.ts` → `proxy.ts` 등.)

> 이 문서는 프로젝트의 합의된 스펙입니다. 데스크탑의 `chosung_quiz_AGENTS.md`가 원본 사본.

---

## 프로젝트 개요

선생님이 수업용 초성 퀴즈를 만들고, 수업 시간에 풀스크린으로 진행하는 웹 도구.

**핵심 사용자**
- **선생님** — 전날 수업 준비 시 퀴즈 세트 생성/수정/삭제, 당일 수업 중 발표
- **학생(특수아동)** — 큰 모니터로 화면만 봄. 입력/계정 없음. 타이머 없음.

---

## 기술 스택

- **Next.js 16** (App Router, TypeScript, Turbopack) — `middleware.ts` 아닌 **`proxy.ts`** 컨벤션 주의
- **React 19**
- **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + Row Level Security + Storage 사진 힌트용)
- **Vercel** (배포)

---

## 확정된 스펙

| 항목 | 결정 |
|---|---|
| 학생 계정 | ❌ 없음 — 선생님만 로그인 |
| 글자 수 | 문제마다 자유 (단어 입력하면 자동으로 초성 변환) |
| 띄어쓰기 | 보존 — `사과 주스` → `ㅅㄱ ㅈㅅ` |
| 힌트 타입 | `text` · `image` · `reveal_jamo` · `reveal_vowel` (자유 조합/순서) |
| 모음 힌트 | `reveal_vowel` 사용 시 글자별로 자음+모음 결합해서 음절을 부분 공개 (`ㅅ ㄱ` → `사 ㄱ` → `사과`) |
| 모음 입력 | 정답을 분석해 모음 자동 추출. 선생님은 "모음 힌트 사용 ON/OFF" 토글만. 글자 수만큼 `reveal_vowel` 행이 자동 생성됨 |
| 사용 가이드 | 모든 페이지 헤더에 `?` 아이콘 → 모달로 페이지별 버튼 설명 |
| 힌트 공개 | 처음 다 숨김 → 선생님이 버튼 누르면 하나씩 펼침 |
| 정답 표시 | 텍스트만 (이펙트/애니메이션 없음 — 특수아동 자극 최소화) |
| 수정/삭제 | 둘 다 가능 |
| 공유 기능 | ❌ v1에서는 본인 퀴즈만 |
| 발표 모드 | 풀스크린 + 큰 글자 + 고대비 |
| 타이머 | ❌ 없음 |

---

## 데이터 모델

```
quiz_sets
  id          uuid pk
  teacher_id  uuid (auth.users 참조)
  title       text
  created_at  timestamptz

questions
  id          uuid pk
  quiz_set_id uuid fk -> quiz_sets
  answer      text       -- 정답 단어 (초성은 클라이언트에서 자동 계산)
  order       int

hints
  id          uuid pk
  question_id uuid fk -> questions
  type        text       -- 'text' | 'image' | 'reveal_jamo' | 'reveal_vowel'
  content     text       -- 의미는 type 별로 다름:
                         --   text         : 표시할 텍스트
                         --   image        : Storage 이미지 경로
                         --   reveal_jamo  : 공개할 자모 문자열
                         --   reveal_vowel : 공개할 글자 인덱스(0-base, 정수 문자열)
  order       int        -- 공개 순서 (모음/자모/텍스트/이미지를 자유롭게 섞을 수 있음)
```

> **DB 마이그레이션 메모**: `hints.type` CHECK는 PR #2에서 `'text' | 'image' | 'reveal_jamo'`만 허용하도록 만들어졌음. `reveal_vowel` 추가는 단독 PR로 빼지 않고 PR #4(quiz creation form)에 묶어 `ALTER TABLE hints DROP CONSTRAINT ...; ADD CONSTRAINT ... CHECK (type IN ('text','image','reveal_jamo','reveal_vowel'))` 마이그레이션으로 처리.

**RLS 정책**: 모든 테이블에서 `teacher_id = auth.uid()` 인 행만 본인이 SELECT/INSERT/UPDATE/DELETE 가능.

---

## 핵심 로직 — 한글 → 초성 변환

`src/lib/utils/hangul.ts`:

```ts
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

export function toChosung(text: string): string {
  return [...text].map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch  // 한글 아니면 그대로 (공백 등)
    return CHOSUNG[Math.floor(code / 588)]
  }).join('')
}
```

라이브러리 안 쓰고 직접 구현하는 이유: 한글 유니코드 구조 학습 + 면접 토픽.

### 모음 힌트용 추가 함수 (PR #4 또는 #7에서 구현 예정)

```ts
// 한글 음절에서 중성(모음) 인덱스. 한글 음절이 아니면 null.
export function getJungsungIndex(syllable: string): number | null

// 초성 인덱스 + 중성 인덱스 → 종성 없는 음절. (예: 9, 0 → '사')
export function composeChoJung(choIdx: number, jungIdx: number): string

// answer의 index번째 글자만 자음+모음 결합, 나머지는 초성. 공백 보존.
// 예: revealVowelAt('사과 주스', 0) → '사ㄱ ㅈㅅ'
export function revealVowelAt(answer: string, index: number): string
```

---

## 폴더 구조

```
src/
├── app/                  Next.js App Router
├── components/           재사용 UI (Server Component 우선)
├── lib/
│   ├── supabase/
│   │   ├── client.ts     브라우저용
│   │   └── server.ts     서버용
│   └── utils/
│       └── hangul.ts     초성 변환
└── proxy.ts              Supabase 세션 갱신 (Next.js 16: middleware.ts 아님)
```

---

## 코딩 규칙

- **Server Component 기본**, `"use client"`는 인터랙션 필요할 때만
- **TypeScript strict**, `any` 금지 (모르면 `unknown` 후 좁히기)
- **Tailwind 유틸리티 클래스** 우선
- **`@/*` alias** 사용 (상대경로 `../../` 지양)
- 컴포넌트 파일명: **PascalCase** (`QuizCard.tsx`), 유틸/훅: **camelCase**

---

## 보안 규칙

1. 모든 Supabase 테이블에 **RLS 켜기**
2. `service_role` 키는 서버 코드에서만 (`NEXT_PUBLIC_` 절대 금지)
3. 에러 메시지에 raw DB 에러 노출 금지 — 사용자 친화적 메시지로 변환
4. 이미지 힌트 업로드는 Supabase **Storage** + 서명된 URL 사용
5. 학생 PII는 다루지 않음 (학생 계정 자체가 없음 — 보안 부담 ↓)

---

## Git 워크플로우

- `main` 브랜치 보호, 작업은 `feat/<name>`, `fix/<name>`, `chore/<name>`
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- 작은 PR 단위로 머지 (셀프 리뷰 후)
- PR 본문에 `Closes #N` 으로 이슈 연결

---

## 작업 순서 (PR 단위)

1. `chore: scaffold next.js 16 + supabase` — 초기 셋업 ✅
2. `feat: db schema for quiz sets and questions` — Supabase 스키마 + RLS ✅
   (※ 모음 힌트는 PR #4에 묶어 `hints.type` CHECK 확장 마이그레이션 진행)
3. `feat: teacher auth` — 선생님 로그인
4. `feat: quiz creation form` — 단어 입력 → 자동 초성 변환 + **모음 힌트 토글** + `hints.type` CHECK 마이그레이션(`reveal_vowel` 추가)
5. `feat: quiz list & edit & delete` — 관리 페이지
6. `feat: presentation mode` — 수업용 풀스크린(**핵심 차별화**) + **헤더 `?` 가이드 모달 골격**
7. `feat: hint reveal & answer reveal` — 힌트/정답 토글 + `reveal_vowel` 처리(`revealVowelAt` 사용)
8. `docs: README with demo link` — 포트폴리오 마무리 + 가이드 모달 페이지별 콘텐츠 마무리

---

## 응답 언어

- 대화: **한국어**
- 코드/식별자/주석/커밋 메시지: **영어**
- UI 텍스트: **한국어** (선생님/학생이 한국어 사용자)

---

## 사용 가이드 (in-app help)

- 모든 페이지 헤더 우측에 `?` 아이콘 버튼.
- 클릭 시 페이지별로 다른 콘텐츠의 모달 오픈.
- 콘텐츠는 한국어 짧은 글머리표 (선생님이 1분 안에 훑을 분량).
- 페이지별 콘텐츠:
  - **만들기**(`/admin/new`): "정답 입력 → 자동 초성 변환 / [+ 힌트] 버튼 / 모음 힌트 토글"
  - **목록**(`/admin`): "퀴즈 클릭 → 발표 모드 / 수정 / 삭제"
  - **발표**(`/play/:id`): "다음 힌트 / 정답 확인 / 다음 문제 / 풀스크린 토글"
- 컴포넌트: `<HelpButton />` (헤더에 배치) + `<HelpModal page="...">` (페이지 prop으로 분기).
- 접근성: ESC 닫힘, 포커스 트랩, `aria-modal="true"`, 스크린리더용 라벨.

---

## 포트폴리오 어필 포인트

- **접근성/포용적 디자인**: "특수아동 수업 맥락에서 왜 이 UX 결정을 했는가"를 README에 정리
- **한글 유니코드 직접 다루기**: 라이브러리 없이 자모 분리 — 면접 토픽
- **Supabase RLS**: 행 단위 접근 제어 정책 설계 — 백엔드 보안 학습 증거
- **Vercel 배포 링크**: README에 클릭 가능한 데모 링크 필수
