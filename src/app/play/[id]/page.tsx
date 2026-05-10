import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayClient } from './PlayClient'

export default async function PlayQuizPage({
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

  const questions = [...quizSet.questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      answer: q.answer,
      category: q.category,
      hints: [...q.hints]
        .sort((a, b) => a.order - b.order)
        .map((h) => ({ type: h.type, content: h.content })),
    }))

  return <PlayClient title={quizSet.title} questions={questions} />
}
