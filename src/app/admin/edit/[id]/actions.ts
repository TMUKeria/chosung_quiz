'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SaveQuizInput, SaveQuizResult } from '../../quiz-form-types'

export async function updateQuizAction(
  quizSetId: string,
  input: SaveQuizInput,
): Promise<SaveQuizResult> {
  if (!input.title.trim()) return { error: '퀴즈 제목을 입력해주세요.' }
  if (input.questions.length === 0) return { error: '문제를 1개 이상 추가해주세요.' }
  for (const q of input.questions) {
    if (!q.answer.trim()) return { error: '모든 문제의 정답을 입력해주세요.' }
    for (const h of q.hints) {
      if (!h.content.trim()) return { error: '모든 힌트의 내용을 입력해주세요.' }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요해요.' }

  const { error: titleError } = await supabase
    .from('quiz_sets')
    .update({ title: input.title.trim() })
    .eq('id', quizSetId)
  if (titleError) return { error: '퀴즈 저장에 실패했어요.' }

  // delete-and-replace: 기존 문제/힌트를 모두 지우고 새로 INSERT.
  // questions 삭제 시 hints는 ON DELETE CASCADE로 함께 정리됨.
  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('quiz_set_id', quizSetId)
  if (deleteError) return { error: '기존 문제 삭제에 실패했어요.' }

  const questionsToInsert = input.questions.map((q, i) => ({
    quiz_set_id: quizSetId,
    answer: q.answer.trim(),
    category: q.category?.trim() || null,
    order: i + 1,
  }))
  const { data: insertedQuestions, error: questionsError } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select()
  if (questionsError || !insertedQuestions) return { error: '문제 저장에 실패했어요.' }

  const hintsToInsert: {
    question_id: string
    type: string
    content: string
    order: number
  }[] = []

  insertedQuestions.forEach((insertedQuestion, qIdx) => {
    const formQuestion = input.questions[qIdx]
    formQuestion.hints.forEach((h, hIdx) => {
      hintsToInsert.push({
        question_id: insertedQuestion.id,
        type: h.type,
        content: h.content.trim(),
        order: hIdx + 1,
      })
    })
  })

  if (hintsToInsert.length > 0) {
    const { error: hintsError } = await supabase.from('hints').insert(hintsToInsert)
    if (hintsError) return { error: '힌트 저장에 실패했어요.' }
  }

  revalidatePath('/admin')
  redirect('/admin')
}
