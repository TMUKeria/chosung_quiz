# feat: 퀴즈 풀기 화면 글자 크기 슬라이더

## 요약

선생님이 교실 환경(모니터 크기, 학생 시력, 자리 배치)에 맞춰 퀴즈 풀기
화면의 정답 글자 크기를 **실시간으로 자유롭게 조정**할 수 있도록.

- 슬라이더(range input)로 4rem ~ 16rem 사이 자유 값
- 즉시 화면 반영 — 슬라이더가 곧 미리보기
- localStorage로 기억 (다음 수업 시 같은 크기로 자동 복원)
- "기본값" 버튼으로 한 번에 8rem 복귀

## 변경 사항

### `PlayClient.tsx`

#### 1. 상수 정의

```ts
const FONT_SIZE_STORAGE_KEY = 'chosung-quiz-play-font-size'
const FONT_SIZE_DEFAULT = 8   // rem (≈ Tailwind text-9xl)
const FONT_SIZE_MIN = 4
const FONT_SIZE_MAX = 16
const FONT_SIZE_STEP = 0.5
const JONGSUNG_SIZE_RATIO = 0.5  // 받침 줄은 메인 글자의 50%
```

#### 2. State + localStorage 동기화

- 마운트 시 localStorage에서 복원 (없으면 기본값 8rem)
- 잘못된 값 / 범위 밖 값은 `Math.min(MAX, Math.max(MIN, parsed))`로 clamp
- 슬라이더 변경 시마다 localStorage에 저장

#### 3. 동적 글자 크기 적용

정답 표시·SyllableDisplay·받침 줄 모두 **inline style**로 fontSize 직접 지정:

```tsx
<div style={{ fontSize: `${fontSize}rem`, lineHeight: 1.1 }}>{answer}</div>
```

받침 줄은 `fontSize * 0.5` rem (기존 Tailwind text-9xl / text-6xl
비율과 거의 동일 ≈ 0.47).

#### 4. 슬라이더 toolbar

footer 위에 별도 행 추가:

```
글자 크기  [─────●──────]  8.0 rem  [기본값]
```

- `<label>` + `<input type="range">` + 현재 값 표시 + 기본값 복귀 버튼
- `aria-label="정답 글자 크기 조정"`로 스크린리더 안내
- 좁은 화면에서 wrap 가능하도록 `flex-wrap`

## 핵심 설계 결정

### 슬라이더(자유 값) vs 토글 버튼(작/중/대)

처음엔 4단 토글 버튼 제안했지만, 사용자가 "**직접 정할 수 있게**"
요청 — 자유도가 핵심. 슬라이더 한 줄로 학생 시력·자리에 맞춰 미세
조정 가능.

### inline style vs Tailwind 클래스

Tailwind는 **빌드 타임 컴파일**이라 런타임 변수 기반의 `text-[Xrem]`을
못 만듦. JIT의 arbitrary value 문법(`text-[8rem]`)도 코드에 정적으로
적혀 있어야 작동. 그래서 fontSize는 inline style로 처리. 다른 visual
프로퍼티(font-weight, tracking 등)는 Tailwind 클래스 유지 — 책임 분리.

### 미리보기는 화면 자체

별도 "미리보기 모달" 만들지 않음. 슬라이더 움직이면 즉시 정답 글자가
커지고 작아져서 **현재 화면이 곧 미리보기**. 한 번 더 클릭(확정)
필요 없음.

### 받침 줄도 비례 확대

기존 받침 줄은 `text-6xl` (≈3.75rem)로 메인의 약 0.47. inline style로
넘어가면서 0.5 비율로 통일 — 동작 시 출렁임/비례 깨짐 없이 자연스럽게
확대/축소.

### 슬라이더는 정답 글자만 조정

텍스트 힌트·카테고리·헤더 등은 그대로 두고 **정답 음절/정답
표시에만** 적용. 학생 시선이 가장 머무는 핵심 요소가 정답 글자라서.
다른 요소까지 같이 키우면 좁은 화면에서 레이아웃이 깨질 위험도 있음.

## 검증

- [x] `npm run lint` 통과
- [x] `npm run build` 통과 (TypeScript 포함)
- [ ] 수동 테스트 권장:
  - `/play/[id]` 진입 → 슬라이더로 글자 크기 조정 → 정답 음절 즉시 변화
  - 새로고침 → 마지막 값으로 복원
  - 받침 있는 글자 reveal → 받침 줄도 비례 확대
  - "기본값" 버튼 → 8rem로 복귀
  - 풀스크린 토글 → 슬라이더와 글자 크기 모두 유지

## 향후 작업

- PR C: 이미지 힌트 (Supabase Storage)
  - 새 타입 2종: `image` (눌러서 공개) + `image_intro` (시작부터 공개)
