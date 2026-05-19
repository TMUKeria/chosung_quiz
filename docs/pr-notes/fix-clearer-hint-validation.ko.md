# fix: 힌트 검증 에러 메시지 명확화 + 클라이언트 사전 검증

## 요약

모바일에서 "모든 힌트를 기입했는데도 저장이 안 된다"는 사용자 보고
대응. 실제로는 다음 셋 중 하나가 비어 있는데 메시지가 모호해서 어느
힌트가 문제인지 찾기 어려웠던 게 원인:

1. `image` / `image_intro` 힌트를 추가했는데 사진을 안 올림 (Storage path가 비어 있음)
2. `reveal_*` 힌트를 추가했는데 chip(글자)을 선택 안 함
3. 텍스트 힌트에 공백만 입력

기존 메시지: `모든 힌트의 내용을 입력해주세요.` — 어느 문제 / 어느
힌트 / 무엇이 비었는지 알 수 없음.

새 메시지 예: `문제 2의 3번째 힌트 — 사진이(가) 비어 있어요.`

## 변경 사항

### 1. 새 헬퍼 [validate-quiz-input.ts](src/app/admin/validate-quiz-input.ts)

- `validateSaveQuizInput(input)` — 통과 시 null, 실패 시 한국어 에러
  메시지 반환
- `EMPTY_LABEL_BY_TYPE` 맵으로 타입별 라벨 분기:
  - `text` → "텍스트 내용"
  - `image` / `image_intro` → "사진"
  - `reveal_*` → "공개할 글자"
- 메시지에 **문제 번호 + 힌트 번호** 포함해 모바일에서 한눈에 위치 파악 가능

### 2. 두 server actions에서 헬퍼 사용

- [new/actions.ts](src/app/admin/new/actions.ts) — `saveQuizAction`
- [edit/[id]/actions.ts](src/app/admin/edit/[id]/actions.ts) — `updateQuizAction`

기존엔 두 파일이 같은 검증 로직을 복붙하고 있었는데 (DRY 위반), 한 곳으로 모아 추후 확장 시 한 군데만 손보면 됨.

### 3. 클라이언트 사전 검증 ([QuizForm.tsx](src/app/admin/QuizForm.tsx))

`handleSave`에서 server action 호출 **직전**에 같은 헬퍼로 한 번 검증
→ 실패면 즉시 에러 표시, 서버 round-trip 안 함.

모바일 사용자에게 즉각적인 피드백 → 네트워크 느린 환경에서도 빠르게
어느 힌트가 비었는지 확인 가능.

## 핵심 설계 결정

### 헬퍼는 client/server 양쪽에서 import 가능한 일반 모듈

`'use server'` 마크 안 한 일반 .ts 파일이라 server action과 client
component 양쪽에서 같은 함수를 import해 호출. 검증 로직이 한 곳에만
존재 = drift 위험 0.

### 서버 검증은 그대로 유지

클라이언트 사전 검증은 UX 개선이고 보안 경계가 아님. 서버에서도 같은
검증을 다시 돌려서 (defense in depth) 직접 API 호출이나 클라이언트 우회
시도를 차단. 같은 헬퍼를 부르므로 일관성 자동.

### 라벨 맵으로 타입별 분기

`switch`나 `if` 체인 대신 `Record<HintType, string>` 사용 — 새 hint
타입 추가 시 TypeScript가 라벨 누락을 컴파일 타임에 잡아줌. PR C에서
edit page 화이트리스트 동기화를 빠뜨려 발생한 버그와 같은 종류의 실수
예방.

## 비밀번호 찾기 (`krkimys@gw1.kr`) — 코드 버그 아님

이메일 형식은 유효함. Supabase Auth는 보안상 미가입 이메일에도 success를
반환하기 때문에 (이메일 enumeration 방지) 사용자는 "발송됨" 화면을 보지만
실제로 메일이 안 갔을 수 있음. Dashboard → Auth → Users에서 등록 여부 및
`email_confirmed_at` 확인 권장. 본 PR은 이 부분 코드 변경 없음.

## 검증

- [x] `npm run lint` 통과
- [x] `npm run build` 통과 (TypeScript 포함)
- [ ] 수동 테스트:
  - image 힌트 추가만 하고 사진 안 올린 채로 저장 → `... 사진이(가) 비어 있어요.`
  - reveal 힌트 추가만 하고 chip 선택 안 함 → `... 공개할 글자이(가) 비어 있어요.`
  - text 힌트에 공백만 입력 → `... 텍스트 내용이(가) 비어 있어요.`
  - 정상 입력 → 저장 성공
  - 모바일에서 위 시나리오 동일 확인 (서버 round-trip 없이 즉시 메시지)
