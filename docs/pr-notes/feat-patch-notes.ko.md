# feat: 인앱 패치노트 (안읽음 표시 + 자동 팝업)

## 요약

선생님이 "이번에 뭐가 바뀌었는지" 앱 안에서 바로 확인할 수 있는
패치노트(변경 내역) 기능. 새 버전이 나오면 첫 방문 시 자동으로 모달이
뜨고, 헤더 버튼에 빨간 점으로 안읽음을 표시한다.

게임의 "업데이트 노트"처럼, 사용자가 새 기능/버그 수정을 놓치지 않도록
하는 게 목적.

## 변경 사항

### 1. changelog 데이터 — 단일 진실 공급원 ([changelog.ts](src/lib/changelog.ts))

- `CHANGELOG` 배열에 버전별 변경 내역을 최신순으로 보관.
- 각 항목: `version` · `date` · `title?` · `changes[]` (`type: 'feat' | 'fix'` + 한국어 설명).
- `LATEST_VERSION` = `CHANGELOG[0].version` — "안읽음" 판단 기준값.
- 앞으로 새 버전을 낼 때 **이 파일 맨 위에 한 항목만 추가**하면 끝.

### 2. PatchNotesButton ([PatchNotesButton.tsx](src/app/admin/PatchNotesButton.tsx))

- admin 헤더에 "업데이트" 버튼 + 안읽음 빨간 점.
- 마운트 시 `localStorage`의 마지막 본 버전과 `LATEST_VERSION` 비교
  → 다르면 모달 자동 오픈 + 빨간 점 표시.
- 닫으면 최신 버전을 "읽음"으로 기록(localStorage) → 빨간 점 제거.
- 접근성: `role="dialog"` · `aria-modal` · ESC 닫기 · 포커스 트랩 · 닫을 때 트리거로 포커스 복귀.
- `feat`(신규) / `fix`(수정) 배지로 항목 구분.

### 3. admin 헤더 연결 ([admin/page.tsx](src/app/admin/page.tsx))

- 로그아웃 버튼 왼쪽에 `<PatchNotesButton />` 배치.

### 4. 버전 정리 (`package.json` → `1.1.0`)

- 1.0.2 이후 머지됐지만 버전에 안 잡혀 있던 기능(사진 힌트, 글자 크기
  슬라이더, 가이드 개선)을 패치노트와 함께 v1.1.0으로 묶음.
- Semantic Versioning: 새 기능 → MINOR(가운데) 숫자 ↑.

## 핵심 설계 결정

### changelog를 코드(DB 아님)에 둔 이유

선생님 한 명이 쓰는 도구라 변경 내역은 개발자가 배포할 때 정하는 값.
DB 테이블/마이그레이션 없이 버전 관리되는 `.ts` 파일에 두면 git 히스토리와
일치하고, 새 버전 추가가 한 줄로 끝난다.

### "읽음" 기록은 effect가 아니라 닫기 핸들러에서

`localStorage.setItem`을 effect로 두면 `react-hooks/set-state-in-effect`
경고 + 불필요한 렌더. 닫기 시점에 한 번만 기록하면 의미("다 봤다")도
명확하고 lint도 깨끗.

### localStorage 접근은 useEffect 안에서만

서버 렌더링엔 `localStorage`가 없으므로 마운트 후에만 접근(기존
PlayClient의 폰트 크기 저장 패턴과 동일). 서버/클라 첫 렌더 불일치(hydration
mismatch) 방지.

## 검증

- [x] `npm run lint` 통과
- [x] `npm run build` 통과 (TypeScript 포함)
- [ ] 수동 테스트:
  - 새 브라우저/시크릿 → admin 진입 시 패치노트 자동 오픈 + 빨간 점
  - 모달 닫기 → 빨간 점 사라짐, 새로고침해도 자동 오픈 안 됨
  - "업데이트" 버튼 다시 클릭 → 모달 정상 오픈
  - ESC / 바깥 클릭으로 닫힘, Tab이 모달 안에서만 순환

## 참고

이 PR은 PR #13(힌트 검증 메시지)와 독립적이라 `origin/main`에서 분기.
두 작업이 섞이지 않아 리뷰/롤백이 쉽다.
