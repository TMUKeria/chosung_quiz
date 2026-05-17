# feat: 이미지 힌트 (눌러서 공개 + 시작부터 공개)

## 요약

문제마다 사진을 힌트로 붙일 수 있게. 같은 "이미지"라도 두 가지 흐름이
필요해서 타입을 둘로 나눔.

- `image` — 텍스트/받침/모음 힌트처럼 **선생님이 reveal 버튼을 눌렀을 때**
  학생 화면에 나타남.
- `image_intro` — 카테고리처럼 **문제 시작과 동시에 항상 보임**.
  reveal 버튼 없음.

저장 위치는 Supabase Storage `hint-images` 버킷 (private, 5MB 제한,
JPG/PNG/WebP/GIF). 학생 화면에선 짧은 수명의 signed URL로 그림.

3개 PR로 분할된 큰 작업의 마지막 (PR A: #10, PR B: #11 머지됨).

## DB / Storage 변경 (`supabase/migrations/0004_image_intro_hint_and_storage.sql`)

> **이 마이그레이션은 사용자가 Supabase Dashboard SQL Editor에서 직접 실행** 했음.

세 가지:
1. `hints.type` CHECK 확장 — `image_intro` 추가 (`image`는 v1부터 허용 중이었지만 폼이 노출 안 했음)
2. Storage 버킷 `hint-images` 생성 — private, 5MB 제한, 4가지 image MIME
3. `storage.objects` RLS 정책 3개 (SELECT/INSERT/DELETE) — 객체 키의 첫 폴더 segment가 `auth.uid()`와 일치하는 경우에만 허용

객체 키 컨벤션: `{auth.uid()}/{uuid}.{ext}` — RLS가 첫 segment만 보므로 폴더 구조는 더 깊게 가도 작동, 단순함을 우선해 평탄하게 유지.

## 코드 변경

### Server actions

#### 신규 [hint-image-actions.ts](src/app/admin/hint-image-actions.ts)
- `uploadHintImageAction(FormData)` — 크기/MIME/확장자 검증 후 `{user.id}/{uuid}.{ext}`로 업로드, path 반환
- `deleteHintImageAction(path)` — RLS + 본인 폴더 prefix 이중 검증 후 삭제

#### [admin/actions.ts](src/app/admin/actions.ts) (퀴즈 삭제)
- 퀴즈 삭제 전에 그 안의 모든 `image`/`image_intro` 힌트 path를 수집
- `quiz_sets` 삭제 후 Storage 파일도 일괄 정리 (best-effort)
- RDB는 ON DELETE CASCADE로 hints까지 사라지지만 Storage는 자동 정리 안 되므로 필수

#### [admin/edit/[id]/actions.ts](src/app/admin/edit/[id]/actions.ts) (퀴즈 수정)
- delete-and-replace 직전에 기존 image path 스냅샷
- 저장 후 새 hints에 포함 안 된 path만 Storage에서 정리

### 폼 UI [QuizForm.tsx](src/app/admin/QuizForm.tsx)

- `HINT_TYPE_LABELS`에 `image` / `image_intro` 추가 (한국어 라벨 명확화)
- 새 `ImageHintEditor` 컴포넌트:
  - 파일 선택 → `URL.createObjectURL`로 즉시 썸네일 미리보기
  - 백그라운드에서 server action 업로드 → 성공 시 hint.content를 path로 갱신
  - **사진 교체 시 이전 path 즉시 삭제** (orphan 최소화)
  - 편집 모드 진입 시 클라이언트에서 `createSignedUrl(3600)`로 썸네일 로드 (RLS가 본인 것만 보장)
- 가이드 튜어 단계도 6종으로 보강 (이미지 2종 설명 + 5MB 제한 안내)

### 풀기 화면

#### [play/[id]/page.tsx](src/app/play/[id]/page.tsx)
- 모든 image path를 한 번에 모아 `createSignedUrls` (한 번의 round-trip)
- 6시간 TTL — 한 수업 안에서 만료되지 않으면서, 링크 유출 시 다음 날 자동 만료
- PlayClient에 `hint.imageUrl`로 전달

#### [play/[id]/PlayClient.tsx](src/app/play/[id]/PlayClient.tsx)
- **image_intro**: 카테고리 아래·정답 글자 위에 자동 표시 (`max-h-[35vh] max-w-[45vw] object-contain`)
- **image (reveal형)**: 정답 글자 아래 텍스트 힌트 영역과 같은 위치에 reveal 후 표시
- 힌트 버튼 영역에 "이미지 힌트" 버튼 추가 (`image` 타입만). `image_intro`는 reveal 버튼 안 만듦

## 핵심 설계 결정

### 왜 타입을 두 개로 나눴나

사용자 요구가 "버튼 눌러 공개 + 처음부터 공개" 두 흐름. 한 타입에
`is_pinned boolean`을 더하는 일반화도 고민했지만, 다른 reveal 힌트에까지
"시작부터" 옵션을 줄 계획이 없어서 일반화는 과함. **새 enum 값 하나
추가가 가장 단순**.

### 한 힌트 = 한 이미지

음절 reveal 힌트는 한 row에 여러 인덱스를 담지만, 이미지는 row 1개에
파일 1장 매핑이 자연스러움. 여러 장 = 힌트 여러 개 추가로 해결. 학생
화면에서도 reveal 버튼이 사진과 1:1로 대응돼서 직관적.

### Server Action 업로드 (클라이언트 직접 호출 X)

RLS만 믿고 클라이언트에서 직접 Supabase JS의 `upload`를 호출해도 안전은
같지만, **검증과 키 생성 로직을 서버 한 곳에 모음으로써** 추후 정책
변경 시 코드 한 군데만 보면 됨. 클라이언트는 path 결정에 관여하지 않음.

### Storage RLS는 첫 폴더 segment 검증

`(storage.foldername(name))[1] = auth.uid()::text` 패턴은 Supabase 표준
관례. teacher_id별 폴더 분리로 다른 선생님 파일 노출 차단. 키 생성도
서버에서 `${user.id}/...`로 강제.

### Private 버킷 + signed URL

공개 버킷이면 path만 알면 누구나 다운로드 가능 → 링크 공유 사고 위험.
private + 6시간 TTL signed URL은 다음 수업까지 만료되니 보안 측면에서
안전. 학생 화면이 SSR이라 서버에서 한 번에 batch sign.

### Orphan 정리는 save/delete 경계에서만

폼에서 사진을 다른 사진으로 바꿀 때, 그리고 image 힌트를 통째로 지운
뒤 저장할 때 — 이 두 순간에 이전 path를 Storage에서 정리. 정확하진
않지만 (창 닫기 등 안 잡힘) 일상적인 사용 흐름에선 충분. 완벽한 cron
정리는 v2에서.

### `e.returnValue = ''`는 deprecation hint

[QuizForm.tsx:281](src/app/admin/QuizForm.tsx#L281)에 IDE가
`'returnValue'은(는) 사용되지 않습니다` 힌트를 띄우지만 PR A 이전부터
있던 코드이고, 모던 브라우저는 `e.preventDefault()`만으로도 leave 경고를
띄움. 이번 PR에선 안 건드림.

## 검증

- [x] `npm run lint` 통과
- [x] `npm run build` 통과 (TypeScript 포함)
- [ ] **마이그레이션 적용 필수**: `0004_image_intro_hint_and_storage.sql`을 Dashboard에서 실행
- [ ] 수동 테스트 권장:
  - 만들기 폼에서 image / image_intro 힌트 추가 → 사진 업로드 → 썸네일 표시
  - 다른 사진으로 교체 → 이전 path가 Storage Explorer에서 사라지는지
  - 사진 삭제 → 즉시 비어있는 상태로
  - 저장 → 풀기 화면에서 image_intro는 카테고리 아래 자동 표시, image는 reveal 버튼 누르면 정답 아래 표시
  - 수정 모드 진입 시 기존 사진 썸네일 정상 로드
  - 퀴즈 삭제 시 Storage 파일도 함께 사라지는지

## 향후 작업

- 주기적 orphan cleanup cron (Supabase Edge Function)
- 한 힌트당 여러 이미지 (필요 시)
- 이미지 클라이언트 압축 (모바일 사진 5MB 자주 초과)
