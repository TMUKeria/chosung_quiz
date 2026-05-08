-- =============================================================================
-- Migration: 0001_initial_schema
-- Purpose:   Create the core schema for chosung_quiz (quiz_sets, questions,
--            hints), enable RLS on every table, and add per-table policies so
--            teachers can only read/write their own data.
-- =============================================================================


-- =============================================================================
-- TABLES
-- =============================================================================

-- A quiz set owned by one teacher.
create table public.quiz_sets (
    id          uuid        primary key default gen_random_uuid(),
    teacher_id  uuid        not null references auth.users (id) on delete cascade,
    title       text        not null,
    created_at  timestamptz not null default now()
);

-- Each question belongs to exactly one quiz set.
-- "answer" stores the full Hangul word; the chosung is computed client-side.
-- "order" is the display position within the quiz set (1-based, but not enforced).
create table public.questions (
    id           uuid        primary key default gen_random_uuid(),
    quiz_set_id  uuid        not null references public.quiz_sets (id) on delete cascade,
    answer       text        not null,
    "order"      integer     not null,
    created_at   timestamptz not null default now()
);

-- Hints attached to a question. type controls how the UI renders content.
create table public.hints (
    id           uuid        primary key default gen_random_uuid(),
    question_id  uuid        not null references public.questions (id) on delete cascade,
    type         text        not null check (type in ('text', 'image', 'reveal_jamo')),
    content      text        not null,
    "order"      integer     not null,
    created_at   timestamptz not null default now()
);


-- =============================================================================
-- INDEXES
-- =============================================================================
-- Fetching a quiz set's questions, ordered, is the hot path during presentation.
create index questions_quiz_set_id_order_idx on public.questions (quiz_set_id, "order");
create index hints_question_id_order_idx     on public.hints     (question_id, "order");


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Enabling RLS without policies = deny all. Policies below open up just enough
-- access for a teacher to manage their own quiz sets and the rows that hang
-- off them (questions, hints).

alter table public.quiz_sets enable row level security;
alter table public.questions enable row level security;
alter table public.hints     enable row level security;


-- ---- quiz_sets: direct ownership check ---------------------------------------

create policy "quiz_sets owner can select"
    on public.quiz_sets for select
    using (auth.uid() = teacher_id);

create policy "quiz_sets owner can insert"
    on public.quiz_sets for insert
    with check (auth.uid() = teacher_id);

create policy "quiz_sets owner can update"
    on public.quiz_sets for update
    using (auth.uid() = teacher_id)
    with check (auth.uid() = teacher_id);

create policy "quiz_sets owner can delete"
    on public.quiz_sets for delete
    using (auth.uid() = teacher_id);


-- ---- questions: ownership inherited via quiz_sets ----------------------------

create policy "questions owner can select"
    on public.questions for select
    using (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "questions owner can insert"
    on public.questions for insert
    with check (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "questions owner can update"
    on public.questions for update
    using (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "questions owner can delete"
    on public.questions for delete
    using (
        exists (
            select 1 from public.quiz_sets
            where quiz_sets.id = questions.quiz_set_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );


-- ---- hints: ownership inherited via questions -> quiz_sets -------------------

create policy "hints owner can select"
    on public.hints for select
    using (
        exists (
            select 1 from public.questions
            join public.quiz_sets on quiz_sets.id = questions.quiz_set_id
            where questions.id = hints.question_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "hints owner can insert"
    on public.hints for insert
    with check (
        exists (
            select 1 from public.questions
            join public.quiz_sets on quiz_sets.id = questions.quiz_set_id
            where questions.id = hints.question_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "hints owner can update"
    on public.hints for update
    using (
        exists (
            select 1 from public.questions
            join public.quiz_sets on quiz_sets.id = questions.quiz_set_id
            where questions.id = hints.question_id
              and quiz_sets.teacher_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.questions
            join public.quiz_sets on quiz_sets.id = questions.quiz_set_id
            where questions.id = hints.question_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );

create policy "hints owner can delete"
    on public.hints for delete
    using (
        exists (
            select 1 from public.questions
            join public.quiz_sets on quiz_sets.id = questions.quiz_set_id
            where questions.id = hints.question_id
              and quiz_sets.teacher_id = auth.uid()
        )
    );
