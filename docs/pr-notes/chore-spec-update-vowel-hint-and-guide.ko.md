# chore: spec update for vowel hint and in-app guide

## 요약

의뢰 선생님이 만든 참고 사이트(Gemini Canvas) 동작을 본 뒤, 현재 스펙에 빠져 있던 두 가지 UX를 `CLAUDE.md`에 반영했어요. **코드/DB 변경은 0**, 문서만 +48 / -10. 실제 구현은 다음 PR들(`#4`, `#6`, `#7`, `#8`)에 자연스럽게 흡수됩니다.

## 변경 사항

### 1. 모음 힌트 (`reveal_vowel`)

- 기존 `text` / `image` / `reveal_jamo` 외에 **`reveal_vowel`** 타입 추가.
- 동작: 자음(초성)에 모음을 결합해 음절을 부분 공개. `ㅅ ㄱ` → `사 ㄱ` → `사과`.
- UX: 선생님은 "모음 힌트 사용 ON/OFF" 토글만. 정답에서 모음 자동 추출, 글자 수만큼 `reveal_vowel` 행이 자동 생성.
- `hints.content`는 공개할 글자 인덱스(0-base) 정수 문자열.

### 2. 사용 가이드 (in-app help)

- 모든 페이지 헤더 우측 `?` 아이콘 → 모달.
- 페이지(`/admin/new`, `/admin`, `/play/:id`)별 다른 콘텐츠 (1분 안에 훑을 분량).
- 컴포넌트 분리: `<HelpButton />` + `<HelpModal page="...">`.
- 접근성 요건 명시: ESC 닫힘, 포커스 트랩, `aria-modal="true"`.

### 3. `hangul.ts` 확장 함수 시그니처 메모

다음 PR에서 구현할 함수를 미리 정의:

```ts
getJungsungIndex(syllable: string): number | null
composeChoJung(choIdx: number, jungIdx: number): string
revealVowelAt(answer: string, index: number): string
```

### 4. 작업 순서 표 — 흡수 지점 표기

- PR #1, #2 ✅ 표시
- PR #4 quiz creation form: **모음 힌트 토글** + `hints.type` CHECK 마이그레이션 (`reveal_vowel` 추가)
- PR #6 presentation mode: **헤더 `?` 가이드 모달 골격**
- PR #7 hint reveal: `reveal_vowel` 처리 (`revealVowelAt` 사용)
- PR #8 docs README: 가이드 모달 페이지별 콘텐츠 마무리

## 핵심 설계 결정

### 별도 PR로 빼지 않고 흡수

작은 docs PR과 별도 schema PR 두 개로 쪼개는 것보다, **스펙을 먼저 합의**해 두면 다음 기능 PR이 한 번에 모음 힌트까지 들고 들어올 수 있어요. PR 개수가 줄고 리뷰 맥락이 한군데로 모입니다.

### `reveal_vowel.content` = 글자 인덱스 (0-base 문자열)

`reveal_vowel` 행을 글자 수만큼 자동 생성하고 `content`에 인덱스를 넣으면, **모음/자모/텍스트/이미지 힌트를 자유롭게 섞은 순서**로 공개할 수 있어요. (예: 텍스트 → 모음 한 글자 → 이미지 → 모음 다음 글자) `questions`에 `vowel_hint_enabled boolean`만 두는 안과 비교했을 때, 순서 자유도 측면에서 이쪽이 우월.

## 검증

- [x] `git diff CLAUDE.md` — +48 / -10, 의도대로 5개 항목 모두 반영
- [x] 코드/DB 무변경 → 빌드/테스트 무관
- [ ] (Follow-up) 다음 PR(#3 `feat: teacher auth`) 시작 시 새 스펙 자연스럽게 참조되는지 확인

## 다음 작업

- PR #3 `feat: teacher auth` 진행
- PR #4에서 약속한 `hints.type` CHECK 확장 마이그레이션 잊지 않기 (체크리스트로 옮길 것)
