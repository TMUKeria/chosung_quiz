# feat: quiz creation form

## 요약

선생님이 퀴즈 세트를 만들 수 있는 동적 폼을 구현했어요. 문제/힌트를 자유롭게
추가·삭제·순서 변경할 수 있고, 정답에서 자동으로 초성 미리보기가 뜨고,
힌트 종류는 4가지(텍스트 + 음절 부분/전체 공개 3종)로 통일했습니다.

## 변경 사항

### 1. 마이그레이션 두 개 (0002 + 0003)

- `0002_quiz_creation_form_support.sql`
  1. `hints.type` CHECK 확장 — `reveal_vowel` 추가
  2. `questions.category` 컬럼 추가 (nullable text)
- `0003_replace_reveal_jamo_with_syllable_hints.sql`
  1. `hints.type` 재구성 — `reveal_jamo` 제거 + `reveal_jongsung` / `reveal_syllable` 추가
  2. 결과: `'text' | 'image' | 'reveal_jongsung' | 'reveal_vowel' | 'reveal_syllable'`

> 0003이 0002의 reveal_vowel 추가를 덮어쓰지만 마이그레이션은 시간순 history라 합치지 않고 누적. (git commit과 같은 원리)

### 2. CLAUDE.md 스펙 갱신

- 카테고리 추가: 문제마다 자유 입력, 발표 모드 시작 시 첫 힌트로 항상 표시
- 자모 공개 (reveal_jamo) 제거: 초성 화면에 이미 다 보여 정보량 0이라 무의미
- 음절 힌트 3종으로 통일: 받침 / 모음(받침 가림) / 글자 전체
- 모음 힌트 자동 토글 → 선생님이 직접 글자 선택하는 방식으로 변경
- 발표 모드 받침 인라인 표시 디자인은 PR #7에서 결정 (자모 나열 / 괄호 / 분리)

### 3. 한글 유틸 — `src/lib/utils/hangul.ts`

세 함수 추가:
- `countHangulSyllables(text)` — 한글 음절 개수
- `splitHangulSyllables(text)` — 한글 음절만 배열로 (공백 제외)
- `hasJongsung(syllable)` — 받침 유무. `(code - 0xAC00) % 28 !== 0`

### 4. 만들기 폼 — `src/app/admin/new/`

- `page.tsx` — 서버 컴포넌트 (껍데기)
- `form.tsx` — 클라이언트 컴포넌트, `useState`로 동적 폼 상태 관리
- `actions.ts` — 서버 액션, quiz_sets → questions → hints 순서로 INSERT

힌트 종류 선택 시 동작:
- **텍스트** → 자유 입력
- **받침/모음/글자 전체** → 정답에서 분리한 음절 chip 버튼으로 글자 인덱스 선택
- **받침 공개** + 받침 없는 글자 → chip이 disabled (의미 없는 입력 폼 단계에서 차단)

## 핵심 설계 결정

### 자모 공개를 빼고 음절 단위 3종으로 통일

초성 퀴즈 화면엔 모든 초성이 이미 노출돼 있어서 자모 한 개 공개는 정보량이 0인
경우가 많아요 (이미 보이는 초성을 다시 공개). 받침/모음/글자 통째 3종은 학생이
받는 정보량을 단계별로 명확하게 조절할 수 있어요.

### 모음 힌트 자동 생성을 사용자 선택형으로

처음엔 토글 ON → 글자 수만큼 자동 생성으로 만들었지만, 선생님이 어느 글자를
얼마나 공개할지 직접 고르는 게 훨씬 유연. 자동 생성은 모든 글자를 같은 방식으로
공개해 단조로움.

### 폼은 `useTransition` + 서버 액션 직접 호출

회원가입/로그인은 `useActionState` + `<form action={...}>` 패턴이었지만,
이번 폼은 동적 배열 상태(`useState`로 관리)라 form 데이터로 직렬화하기보다
객체 그대로 서버 액션에 넘기는 게 깔끔. `useTransition`으로 pending 상태 관리.

### 받침 chip disabled를 폼 단계에서

`reveal_jongsung` 선택 후 받침 없는 글자(예: "치")의 chip은 disabled.
DB INSERT에 의지하지 않고 폼에서 의미 없는 입력 자체를 막는 게 UX + 학습 가치.

## 학습 포인트 (정리용)

### 1) 동적 폼 — `useState`로 배열 상태 관리

```ts
const [questions, setQuestions] = useState<Question[]>([newQuestion()])
// 추가, 삭제, 부분 갱신, 순서 이동 모두 immutable update 패턴
```

### 2) `useTransition` — pending 상태와 서버 액션

```ts
const [isPending, startTransition] = useTransition()
startTransition(async () => {
  const result = await saveQuizAction({...})
  if (result?.error) setError(result.error)
})
```

회원가입의 `useActionState`와 다른 패턴 — 동적 데이터에 더 자연스러움.

### 3) 한글 음절 분해 — 받침 인덱스

한글 음절 코드는 `(초성 * 588) + (중성 * 28) + 종성`. 종성이 없으면 `% 28 == 0`.
유니코드 구조를 직접 다루는 학습 토픽.

### 4) 마이그레이션 누적 패턴

0003이 0002의 변경을 덮어써도 0002를 지우지 않음. 마이그레이션은 "지금 깔끔한
상태"보다 "어떻게 여기까지 왔는지의 기록"이 더 중요.

## 검증

- [x] `npx tsc --noEmit` — 타입 체크 통과
- [x] `npm run lint` — 경고/에러 없음
- [x] 수동 테스트:
  1. 정답 입력 → 초성 미리보기 자동 표시
  2. 카테고리 입력
  3. 4종 힌트(텍스트/받침/모음/글자전체) 추가 + 각각의 글자 선택 chip 동작
  4. 받침 없는 글자에서 받침 chip disabled
  5. ↑↓ 버튼으로 힌트 순서 변경
  6. + 문제 추가 / 삭제
  7. 저장 → `/admin` 이동, DB에 quiz_set + questions + hints 저장 확인

## 다음 작업

- **PR #5** `feat: quiz list & edit & delete` — 만든 퀴즈를 보고/수정/삭제하는 관리 페이지
- **PR #7** `feat: presentation mode + hint reveal` — 발표 화면 + 음절 힌트 함수 구현
  (받침 인라인 표시 디자인을 거기서 결정)
- **별도 PR**: 이미지 힌트 — Supabase Storage 설정 + 업로드 컴포넌트
