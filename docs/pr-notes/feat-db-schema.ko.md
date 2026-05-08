# feat: db schema for quiz sets, questions, hints with RLS

## 요약

초성 퀴즈의 핵심 데이터 모델을 만들었어요. 테이블 3개와 행 단위 보안(RLS) 정책 12개,
그리고 그 위에 TypeScript 타입을 자동 생성해서 Supabase 클라이언트에 연결했습니다.

## 변경 사항

### 1. SQL 마이그레이션 — `supabase/migrations/0001_initial_schema.sql`

- 테이블 3개:
  - **`quiz_sets`** — 선생님 한 명이 소유하는 퀴즈 세트
  - **`questions`** — 퀴즈 세트 안의 문제 (정답 단어 저장, 초성은 클라이언트에서 계산)
  - **`hints`** — 문제에 붙는 힌트 (`text` / `image` / `reveal_jamo` 중 하나, CHECK 제약)
- 외래키 + `on delete cascade` — 부모 삭제 시 자식 자동 삭제
- 복합 인덱스 2개 — 발표 모드의 hot path (`(quiz_set_id, order)`, `(question_id, order)`)
- 모든 테이블에 RLS 활성화 + 정책 12개 (각 테이블 4개씩 SELECT/INSERT/UPDATE/DELETE)

### 2. TypeScript 타입 자동 생성 — `src/lib/supabase/database.types.ts`

- Supabase MCP의 `generate_typescript_types` 도구로 생성
- 손으로 쓰지 않고 DB 스키마에서 자동 동기화 → 코드와 DB 어긋남 사고 방지

### 3. Supabase 클라이언트에 `Database` generic 적용

- `client.ts`, `server.ts`, `proxy.ts` 모두 업데이트
- 효과: `.from('quiz_sets').select('*')` 결과 타입 자동 추론, 오타는 컴파일 에러로 잡힘

## 핵심 설계 결정

### RLS 정책 = 부모 테이블을 통한 소유권 검증

`questions`, `hints`는 직접 `teacher_id` 컬럼을 갖지 않아요.
대신 정책에서 EXISTS 서브쿼리로 부모 테이블의 `teacher_id`를 확인:

```sql
create policy "questions owner can select"
    on public.questions for select
    using (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );
```

**이유**: `teacher_id`를 자식 테이블마다 중복 저장하면 정책 SQL은 단순해지지만,
소유자 변경 시 모든 자식 행을 갱신해야 해요. 정규화를 유지하는 쪽이 더 깔끔합니다.

### `enable row level security` ≠ "자동으로 안전"

RLS만 켜면 모든 접근이 차단(deny)돼요.
**정책(policy)이 화이트리스트로 통과시키는 부분만 허용됩니다.**
이걸 모르면 "테이블이 비어 보인다"는 흔한 함정에 빠질 수 있어요.

## 검증

- [x] `list_tables` — 테이블 3개, 모두 `rls_enabled: true`, FK/CHECK 제약 적용 확인
- [x] `get_advisors (security)` — 우리 마이그레이션 관련 경고 없음
  - 별도로 `public.rls_auto_enable()` 함수에 대한 SECURITY DEFINER 경고 2개 존재 →
    프로젝트 생성 시 켠 "Enable automatic RLS" 옵션이 자동 추가한 것. 별도 이슈로 추적.
- [x] `npx tsc --noEmit` — 타입 체크 통과

## 다음 작업

- `feat: teacher auth` — 인증 흐름 추가 후 이 RLS 정책이 실제 인증된 사용자로
  잘 작동하는지 통합 테스트
- `rls_auto_enable()` 함수의 EXECUTE 권한을 회수하거나 SECURITY INVOKER로
  바꿀지 별도 PR에서 결정
