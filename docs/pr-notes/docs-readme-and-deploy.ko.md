# docs: README + demo link + screenshots

## 요약

v1 마무리 PR. Vercel 배포 후 데모 링크와 스크린샷 4장을 README에 통합하고,
포트폴리오 readers를 위해 영어/한국어 README 두 가지로 분리.

## 변경 사항

### `README.md` (영어, 메인)
- 기존 한국어 README를 영어로 재작성
- 데모 링크: https://chosung-quiz-three.vercel.app
- 스크린샷 4장 삽입
- 아키텍처 하이라이트 5개: RLS, 한글 유니코드, 마이그레이션 누적,
  폼 일반화, 패턴 C 받침 표시
- 로컬 실행 + Supabase 설정 가이드
- 향후 계획

### `README.ko.md` (한국어, 새로 추가)
- 메인 README와 같은 구조 + 한국어
- 포트폴리오 어필 포인트 5가지 별도 섹션
- 영어 README와 toggle 링크 (`Read in English →`)

### `docs/screenshots/`
- 4장 캡처: 로그인 / 관리자 목록 / 만들기 폼 / 풀기 화면 (받침 분리 표시)

## 검증

- [x] Vercel 배포 정상 (https://chosung-quiz-three.vercel.app)
- [x] 배포 사이트에서 회원가입 → 만들기 → 풀기 흐름 정상
- [x] README 두 파일 상호 toggle 링크 작동
- [x] 스크린샷 4장 README에서 정상 표시

## v1 완성 상태

| PR | 내용 | 상태 |
|---|---|---|
| #1 | scaffold | ✅ |
| #2 | db schema + RLS | ✅ |
| #3 | teacher auth | ✅ |
| #4 | quiz creation form | ✅ |
| #5 | quiz list / edit / delete | ✅ |
| #6 | play mode + guide + rename | ✅ |
| **#7** | **README + demo + screenshots** | **이 PR** |

v1의 핵심 흐름이 모두 작동하는 상태로 마무리.

## 향후 작업

- 이미지 힌트 (Supabase Storage)
- AI 자동 퀴즈 생성 (Claude API)
- 모달 기반 confirm 정교화
- 운영 단계 보안 (Confirm email + 캡차)
