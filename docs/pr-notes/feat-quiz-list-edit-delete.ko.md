# feat: quiz list, edit, delete

## 요약

만든 퀴즈를 한눈에 보고 수정/삭제할 수 있는 관리 흐름을 추가했어요.
만들기 폼을 일반화해서 수정에서 그대로 재사용하고, 변경 사항을 저장 안 하고
페이지를 떠나려 하면 경고가 뜨도록 UX도 정리했습니다.

## 변경 사항

### 1. 목록 페이지 — `/admin`

기존엔 "퀴즈 만들기!" 버튼 1개만 있던 홈을 **본인이 만든 퀴즈 목록 + 카드**로 확장.

- `src/app/admin/page.tsx` — 서버 컴포넌트, RLS 덕분에 `where teacher_id = ?` 없이도 본인 것만 조회됨
- `src/app/admin/QuizCard.tsx` — 클라이언트 카드 컴포넌트 (발표 / 수정 / 삭제 버튼)
- 빈 상태: "아직 만든 퀴즈가 없어요" 안내

### 2. 폼 일반화 — `NewQuizForm` → `QuizForm`

기존 `form.tsx`를 삭제하고, 만들기/수정 양쪽에서 같은 컴포넌트를 쓰도록 일반화.

- `src/app/admin/QuizForm.tsx` — `mode: 'create' | 'edit'` + `initialData?` + `onSave` props
- `src/app/admin/quiz-form-types.ts` — `HintType`, `SaveQuizInput` 등 공유 타입 분리

### 3. 수정 페이지 — `/admin/edit/[id]`

- `src/app/admin/edit/[id]/page.tsx` — 서버에서 quiz_set + questions + hints 한 번에 로드 → `QuizForm`에 `initialData`로 전달
- `src/app/admin/edit/[id]/actions.ts` — `updateQuizAction`

### 4. 액션들

- `deleteQuizAction` — `src/app/admin/actions.ts` (cascade로 questions/hints 자동 정리)
- `updateQuizAction` — delete-and-replace 패턴 (자식 행 모두 삭제 후 새로 INSERT)

### 5. 이탈 경고 (UX)

폼에서 변경한 후 저장 안 하고 떠나려 하면 경고:
- 앱 안 navigation (← 홈으로 버튼) → `confirm()` 다이얼로그
- 브라우저 새로고침 / 탭 닫기 → `beforeunload` 이벤트로 표준 경고

## 핵심 설계 결정

### 폼 재사용 (props로 모드 전환)

만들기와 수정 폼이 거의 똑같아서, 두 컴포넌트로 분리하면 250줄 코드가 두 곳에 중복.
대신 한 컴포넌트가 `mode` + `initialData` props를 받아 두 화면 모두 처리.
실무 표준 패턴이고, 한 군데만 고쳐도 양쪽 다 반영돼서 어긋날 일이 없어요.

### `updateQuizAction.bind(null, id)` — Server Action 부분 적용

수정 페이지 server component에서:
```ts
const onSave = updateQuizAction.bind(null, id)
```

`updateQuizAction(quizId, input)` 두 인자 함수에서 `quizId`를 미리 고정해
`(input) => ...` 모양의 함수로 만듦. `QuizForm`은 만들기/수정 모두 `(input)` 시그니처
하나만 알면 되니 인터페이스 통일.

### Delete-and-replace (수정 시)

`updateQuizAction`은 차분(diff) 계산 대신 quiz_set의 모든 questions를 DELETE 후
새로 INSERT. cascade가 hints까지 정리해줘서 코드도 단순해요. 차분 계산은
복잡도 ↑ + 버그 가능성 ↑.

> 트레이드오프: question/hint의 PK가 매번 바뀜. 외부에서 question id를 link로
> 거는 시스템이라면 부적절하지만, 우리 프로젝트엔 그런 use case 없음.

### 이탈 경고 — 두 경로 모두 막기

| 경로 | 처리 |
|---|---|
| 앱 안에서 navigation | `router.push` 전 `confirm()` |
| 브라우저 자체 (새로고침/탭 닫기) | `beforeunload` 이벤트 |

`isDirty` state로 변경 여부 추적. `handleSave` 시작 시 `setIsDirty(false)`로
저장 흐름은 경고 없이 진행, 실패 시 다시 `true`로 되돌림.

## 학습 포인트 (정리용)

### 1) 컴포넌트 일반화 — `mode` + `initialData`
```tsx
<QuizForm mode="create" onSave={saveQuizAction} />
<QuizForm mode="edit" initialData={existingQuiz} onSave={updateBound} />
```
모드 prop으로 분기. 큰 폼 1개로 두 화면 처리.

### 2) `Function.prototype.bind`로 부분 적용
JavaScript 표준 메서드. `fn.bind(null, arg1)` → `arg1` 고정된 새 함수.
Server Action도 함수라 그대로 `.bind` 가능.

### 3) RLS 덕분에 필터 코드 불필요
```ts
supabase.from('quiz_sets').select('id, title, ...')
// where teacher_id = ? 없는데 본인 것만 조회됨
```

### 4) PostgREST nested count
```ts
.select('id, title, questions(count)')
```
자식 테이블 행 개수를 한 쿼리로 가져옴.

### 5) `beforeunload` 메시지는 브라우저가 결정
보안 정책상 우리가 정한 텍스트가 안 보이고 브라우저 표준 메시지 표시.
`e.returnValue = ''`는 "경고 띄워달라" 신호일 뿐.

## 검증

- [x] `npx tsc --noEmit` — 타입 체크 통과
- [x] `npm run lint` — 경고/에러 없음
- [x] 수동 테스트:
  1. 목록 페이지에 본인 퀴즈만 표시
  2. 새로 만들기 → 목록에 즉시 반영
  3. 수정 페이지에 기존 데이터 자동 로드
  4. 수정 저장 → 변경 반영
  5. 삭제 → confirm → 카드 사라짐
  6. 변경 후 ← 홈으로 → confirm 경고
  7. 변경 후 새로고침 → 브라우저 경고
  8. 변경 안 하고 ← 홈으로 → 경고 없이 이동
  9. 저장 흐름 → 경고 없이 redirect

## 다음 작업

- **PR #6** `feat: presentation mode` — `/play/[id]` placeholder를 실제 발표 화면으로.
  여기서 음절 힌트 인라인 표시 디자인(받침 자모 나열 / 괄호 / 분리 영역)을 결정.
- 모달 기반 삭제 confirm 정교화 (현재는 `window.confirm()`)
