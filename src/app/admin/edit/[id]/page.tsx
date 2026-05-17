import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuizForm } from '../../QuizForm'
import type { HintType } from '../../quiz-form-types'
import { updateQuizAction } from './actions'

// Whitelist of hint types the form can render. Keep this in sync with the
// HintType union — leaving a type out makes the edit page silently drop those
// rows from initialData, which then orphan-cleans the matching Storage files
// on the next save.
const VALID_HINT_TYPES_FOR_FORM: HintType[] = [
  'text',
  'image',
  'image_intro',
  'reveal_jongsung',
  'reveal_vowel',
  'reveal_syllable',
]

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quizSet, error } = await supabase
    .from('quiz_sets')
    .select(
      'id, title, questions(answer, category, order, hints(type, content, order))',
    )
    .eq('id', id)
    .single()

  if (error || !quizSet) notFound()

  const initialData = {
    title: quizSet.title,
    questions: [...quizSet.questions]
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        answer: q.answer,
        category: q.category,
        hints: [...q.hints]
          .filter((h): h is typeof h & { type: HintType } =>
            VALID_HINT_TYPES_FOR_FORM.includes(h.type as HintType),
          )
          .sort((a, b) => a.order - b.order)
          .map((h) => ({ type: h.type as HintType, content: h.content })),
      })),
  }

  const onSave = updateQuizAction.bind(null, id)

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">퀴즈 수정</h1>
      <QuizForm mode="edit" initialData={initialData} onSave={onSave} />
    </main>
  )
}
