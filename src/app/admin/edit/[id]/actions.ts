'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SaveQuizInput, SaveQuizResult } from '../../quiz-form-types'
import { validateSaveQuizInput } from '../../validate-quiz-input'

export async function updateQuizAction(
  quizSetId: string,
  input: SaveQuizInput,
): Promise<SaveQuizResult> {
  const validationError = validateSaveQuizInput(input)
  if (validationError) return { error: validationError }

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

  // Capture existing image hint paths so we can clean up the ones that are
  // dropped or replaced in this save. The play screen would still load via
  // signed URLs if we skipped this, but the files would orphan in Storage.
  const { data: existingQuestionRows } = await supabase
    .from('questions')
    .select('id')
    .eq('quiz_set_id', quizSetId)
  const existingQuestionIds = existingQuestionRows?.map((q) => q.id) ?? []
  let existingImagePaths: string[] = []
  if (existingQuestionIds.length > 0) {
    const { data: existingHintRows } = await supabase
      .from('hints')
      .select('type, content')
      .in('question_id', existingQuestionIds)
    existingImagePaths = (existingHintRows ?? [])
      .filter((h) => h.type === 'image' || h.type === 'image_intro')
      .map((h) => h.content)
  }

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

  // Clean up Storage files that were removed or replaced. Best-effort: a
  // failure here doesn't roll back the save (the save itself was committed
  // and is what the user cares about).
  const keptImagePaths = new Set(
    hintsToInsert
      .filter((h) => h.type === 'image' || h.type === 'image_intro')
      .map((h) => h.content),
  )
  const orphanPaths = existingImagePaths.filter((p) => !keptImagePaths.has(p))
  if (orphanPaths.length > 0) {
    await supabase.storage.from('hint-images').remove(orphanPaths)
  }

  revalidatePath('/admin')
  redirect('/admin')
}
