# release: v1.0.2 — 가이드 자동 시작 + 힌트 다중 선택 / 셀 단위 공개

## 요약

v1.0.1 이후 UX 보강 두 가지.

1. **만들기 화면 가이드가 자동으로 시작**되도록. 이전엔 검은 beacon을 클릭해야
   spotlight가 떴어요.
2. **힌트 폼은 여러 글자 한 번에 선택, 풀기 화면은 글자별로 버튼이 분리**되어
   선생님이 원하는 글자만 콕 찍어 공개 가능.

## 변경 사항

### 1. 가이드 자동 시작 (`QuizForm.tsx`)

- 모든 Step에 `skipBeacon: true` 추가 — react-joyride v3에서 beacon을
  건너뛰고 즉시 tooltip이 보임.
- 보강 안전 장치로 `beaconComponent={() => null}` 도 같이.

### 2. 힌트 다중 글자 + 셀 단위 공개

**폼 (`QuizForm.tsx`)**
- chip 클릭 = toggle. 한 힌트에 여러 글자 선택 가능.
- `content`는 comma-separated (예: `"0,1"`). DB 스키마 변경 없음.
- `parseSelectedIndices()` helper 추가.

**풀기 (`PlayClient.tsx`)**
- 상태 모델: `revealedHints: Set<number>` → `revealedCells: Set<string>`.
  각 셀 키 = `"<hintIdx>:<syllableIdx>"` (텍스트는 `"<idx>:text"`).
- 한 힌트가 N개 글자를 가지면 풀기 화면에서 **N개 버튼으로 펼침**.
  - 예: 모음 힌트에 1, 2번째 둘 다 선택 → `[모음: 1번째]` `[모음: 2번째]`
- 각 버튼 독립 toggle (선생님이 원하는 글자만 골라 공개).
- `applyHintsToSyllables`가 `revealedCells`를 받아 각 셀별로 처리.

### 3. 가이드 텍스트 강화

힌트 추가 단계 안내에 "**chip을 눌러 직접 공개할 글자를 선택해야 힌트가
완성됩니다**" 명시.

### 4. 릴리스 메타
- `package.json` version `1.0.1` → `1.0.2`.

## 핵심 설계 결정

### 폼은 multi-select, 풀기는 per-cell

폼에서 글자 하나씩 별도 힌트로 만들면 같은 종류의 힌트가 줄지어 늘어남
(`[모음 1] [모음 2] [모음 3]` 같이 분리되어 저장됨). 폼에서는 "이 힌트는
어느 글자들"을 한 번에 정하는 게 자연스러움. 그래서 폼은 multi-select.

반면 풀기에서는 선생님이 학생 반응을 보면서 각 글자 공개 여부를 미세
조정해야 함. 그래서 풀기에서는 글자별로 버튼이 분리됨.

### Cell key는 string (`"hintIdx:syllableIdx"`)

복합 키를 `Set<string>`으로 다루는 게 `Map<number, Set<number>>`보다 단순.
membership 체크 / toggle / iteration 모두 명쾌.

### react-joyride v3의 `skipBeacon`

v2의 `disableBeacon` 옵션이 v3에서 `skipBeacon: boolean`으로 이름이 바뀌어
있었어요. 타입 정의에서 직접 찾아 확인하고 적용.

## 검증

- [x] `npx tsc --noEmit` 통과
- [x] `npm run lint` 통과
- [x] 수동 테스트:
  - 시크릿 창 / `/admin/new` 진입 시 가이드 자동 시작 (beacon 없음)
  - 폼에서 chip 다중 선택 / 해제 정상
  - 풀기 화면에서 한 힌트가 글자 수만큼 버튼으로 펼침
  - 각 버튼 독립 toggle (켜고 끄기)
  - 받침 없는 글자에 받침 힌트 추가 시도 → chip disabled 그대로

## 향후 작업

- 이미지 힌트 (Supabase Storage)
- AI 자동 퀴즈 생성 (Claude API)
- 모달 confirm
