# feat: play mode + guide + rename

## 요약

수업 시간에 학생들에게 보여주는 **퀴즈 풀기 모드**를 만들었어요. 정답이 한 글자씩
점점 채워지는 인라인 reveal, 받침은 글자 아래 별도 영역에 분리 표시(C 패턴),
선생님이 어떤 힌트든 골라서 클릭, 다 풀면 격려 화면.
부수로 만들기 화면에 spotlight tour 가이드 추가, "발표" → "퀴즈 풀기" 명칭 통일.

## 변경 사항

### 1. 퀴즈 풀기 페이지 — `/play/[id]`

- `src/app/play/[id]/page.tsx` — 서버 컴포넌트. quiz_set + questions + hints
  를 한 번의 nested select로 로드.
- `src/app/play/[id]/PlayClient.tsx` — 클라이언트. 모든 인터랙션과 reveal 상태.
- `src/proxy.ts` — `/play/*`도 비로그인 시 `/login`으로 리다이렉트.

### 2. 인라인 음절 reveal (C 패턴)

각 음절은 두 영역으로 그려요:
- **상단**: 초성 / 자음+모음 / 글자 통째 중 하나 (현재 reveal 레벨)
- **하단**: 받침 자모 (받침 힌트 발동 시에만)

```
     ㅊ  ㅋ
            ㄴ        ← 받침 분리 영역
```

받침이 있는 셀이 하나라도 있으면 모든 셀에 받침 영역을 reserve해서 화면이
한 줄 ↔ 두 줄로 출렁이지 않게.

### 3. 힌트 = 종류별 toggle 버튼

기존 "다음 힌트" 한 버튼이 순차로 reveal하는 방식 → 선생님이 학생 반응 보면서
**원하는 힌트를 직접 골라서 클릭**하는 방식으로 변경. 각 힌트가 별도 버튼:

- `텍스트 힌트`
- `받침: 2번째`
- `모음: 1번째`
- `글자: 1번째`

> 정답 노출 방지: 라벨에 글자 자체("(킨)")는 표시하지 않음 — 학생도 같은 화면을 봄.

다시 누르면 끄기 (`Set<number>` 토글). 실수로 누른 경우 복구 가능.

### 4. 한글 helpers — `src/lib/utils/hangul.ts`

```ts
getJongsung(syllable)  // 받침 자모 또는 null
removeJongsung(syllable)  // 자음+모음만 결합 (받침 제거)
```

음절 코드 산식: `(코드 - 0xAC00) % 28` 이 종성 인덱스. 0이면 받침 없음.

### 5. 완료 화면

마지막 문제에서 "완료" 누르면:
```
🎉 다 풀었어요!
[다시 풀기] [홈으로]
```
"다시 풀기" = 첫 문제로 돌아가기 + 모든 reveal 초기화.

### 6. 만들기 화면 spotlight tour (react-joyride)

- 라이브러리: `react-joyride@3` (Next.js 16 + React 19 호환)
- 6단계: 제목 → 정답+초성 → 카테고리 → 힌트 추가 → 문제 추가 → 저장
- **만들기 모드 첫 방문 시 자동 실행** (localStorage로 추적)
- 헤더 우측 **?** 버튼으로 언제든 재실행 가능
- 수정 모드(`/admin/edit/[id]`)에서는 자동 X — 이미 익숙한 사람이 수정함

> 처음엔 퀴즈 풀기 화면에 적용했다가 "퀴즈를 푸는 시점이 아니라 만들 때 안내가
> 필요하다"는 피드백 받고 만들기 화면으로 이동.

### 7. "발표" → "퀴즈 풀기" 명칭 통일

- `QuizCard.tsx` 버튼 라벨
- `CLAUDE.md` 스펙 표, 데이터 모델 주석, 사용 가이드, 작업 순서

## 핵심 설계 결정

### 받침 분리 영역 (C 패턴)

A(자모 옆 나열 `ㅋㄴ`), B(괄호 `ㅋ(ㄴ)`), C(위/아래 분리) 중 **C** 선택.
한글 음절은 모음 없이 결합 못 하므로 받침만 인라인 결합은 불가능. 대신 CSS로
글자 아래 별도 줄에 받침을 표시하는 게 학생에게 직관적("받침 = 글자 아래").
출렁임은 사전 예약(reserve)으로 해결.

### 종류별 토글 vs 순차 reveal

순차는 일률적이라 선생님이 수업 흐름에 따라 "이 학생은 받침만 알려주자",
"저 학생은 글자 통째 보여주자" 같은 미세 조정이 어려움. 종류별 토글이 수업
도구로 더 유연.

### Tour는 만들기에만 자동, 풀기에는 X

퀴즈 풀기는 학생들에게 보여주는 화면이라 사용자(선생님)가 이미 알고 있어야
함. 가이드가 필요한 곳은 처음 퀴즈를 만들 때.

### `useEffect` 안에서 `setState` — ESLint disable

React 19의 새 룰 `react-hooks/set-state-in-effect`. 우리 케이스는 mount
후 한 번만 실행되어 cascading render 아님. 룰을 케이스별로 disable.

## 학습 포인트 (정리용)

### 1) 한글 음절 분해/결합
- 코드: `(charCode - 0xAC00)`
- 초성 인덱스: `Math.floor(코드 / 588)`
- 종성 인덱스: `코드 % 28`
- 받침 제거: `code - 종성인덱스` 한 String.fromCharCode

### 2) `Set<number>` 상태로 toggle
```ts
setRevealedHints((prev) => {
  const next = new Set(prev)
  if (next.has(i)) next.delete(i); else next.add(i)
  return next
})
```
배열 + indexOf보다 O(1) 멤버십 + immutable update가 깔끔.

### 3) Fullscreen API + change 이벤트
사용자가 ESC로 풀스크린을 나갈 수 있어서 `fullscreenchange` 이벤트로 외부
변화를 따라가야 함. setState만으로는 부족.

### 4) react-joyride v3 API
- import: `{ Joyride }` (named, not default)
- callback: `onEvent` (v2는 `callback`)
- `disableBeacon`은 사라짐
- 단계는 정적 selector — 동적으로 추가/삭제되는 영역은 `data-tour` 속성을
  공통으로 두면 첫 매칭 사용

## 검증

- [x] `npx tsc --noEmit` 통과
- [x] `npm run lint` 통과
- [x] 수동 테스트:
  - 만들기 첫 방문 시 spotlight tour 자동 → "건너뛰기" / "다음" 정상 작동
  - ? 버튼 → tour 재실행
  - 수정 페이지에서는 자동 tour 안 뜸
  - 퀴즈 풀기 화면 진입 → 카테고리 + 초성 표시
  - 힌트 버튼 누름/끔 토글
  - 받침 힌트 활성화 시 글자 아래 받침 자모 표시, 출렁임 없음
  - 정답 보기 / 풀스크린 / 다음 / 이전 모두 정상
  - 마지막 문제 "완료" → 완료 화면 + 다시 풀기 / 홈으로

## 다음 작업

- **PR #7** `docs: README + demo link` — 포트폴리오 마무리. 배포 링크,
  스크린샷, 기술 스택 정리.
- 모달 기반 confirm (현재 `window.confirm()` 그대로)
- 이미지 힌트 (별도 PR — Supabase Storage)
- AI 자동 퀴즈 생성 (별도 PR — Claude API)
