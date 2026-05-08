# feat: db schema for quiz sets, questions, hints with RLS

## Summary

Initial data model for the chosung quiz: three tables with row-level security
policies, plus TypeScript types generated from the schema and wired into the
Supabase clients.

## Changes

### SQL migration — `supabase/migrations/0001_initial_schema.sql`

- Three tables:
  - **`quiz_sets`** — owned by one teacher.
  - **`questions`** — children of a quiz set, storing the full Hangul answer
    (chosung is computed client-side).
  - **`hints`** — children of a question; `type` constrained to
    `text` / `image` / `reveal_jamo` via CHECK.
- Foreign keys with `on delete cascade` so deleting a quiz set tears down its
  children atomically.
- Two composite indexes on `(parent_id, order)` for the presentation read path.
- RLS enabled on every table.
- Twelve policies (four per table) scoped to the owning teacher. Children
  inherit ownership through EXISTS subqueries against `quiz_sets`, keeping
  the schema normalized rather than denormalizing `teacher_id` onto every
  child row.

### Generated TypeScript types — `src/lib/supabase/database.types.ts`

- Produced via the Supabase MCP `generate_typescript_types` tool.
- Single source of truth: regenerate after every schema change instead of
  hand-maintaining types.

### `Database` generic wired into the clients

- `client.ts`, `server.ts`, `proxy.ts` now pass `<Database>` to the Supabase
  factory. Tables, columns, and Insert/Update shapes are fully typed;
  misspelled identifiers fail at compile time.

## Key design decisions

### RLS policies verify ownership through the parent table

`questions` and `hints` do not carry `teacher_id` directly. Their policies
use EXISTS subqueries against `quiz_sets`:

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

Denormalizing `teacher_id` onto every child would simplify the policy SQL
but force a multi-table update whenever ownership changes. Keeping the
schema normalized is the cleaner trade-off here.

### `enable row level security` ≠ "automatically safe"

Enabling RLS denies all access by default. Policies are the **whitelist**
that opens specific access back up. Forgetting this leads to the classic
trap where a table appears to be empty from the client's perspective.

## Test plan

- [x] `list_tables` — three tables, `rls_enabled: true` on all, FK and CHECK
      constraints applied.
- [x] `get_advisors (security)` — no findings against our migration.
      Two warnings on `public.rls_auto_enable()`, an auto-installed function
      from the project-level "Enable automatic RLS" option; tracked separately.
- [x] `npx tsc --noEmit` — passes.

## Follow-ups

- `feat: teacher auth` (next PR) — exercises these RLS policies end-to-end
  with a real authenticated session.
- Decide whether to `revoke execute` on `rls_auto_enable()` or switch it to
  `SECURITY INVOKER` based on the advisor warning.
