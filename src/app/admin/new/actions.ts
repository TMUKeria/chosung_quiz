'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type HintType = 'text' | 'reveal_jongsung' | 'reveal_vowel' | 'reveal_syllable'

export type SaveQuizInput = {
  title: string
  questions: {
    answer: string
    category: string | null
    hints: { type: HintType; content: string }[]
  }[]
}

export type SaveQuizResult = { error: string } | undefined

export async function saveQuizAction(input: SaveQuizInput): Promise<SaveQuizResult> {
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

  const { data: quizSet, error: quizSetError } = await supabase
    .from('quiz_sets')
    .insert({ teacher_id: user.id, title: input.title.trim() })
    .select()
    .single()
  if (quizSetError || !quizSet) return { error: '퀴즈 저장에 실패했어요.' }

  const questionsToInsert = input.questions.map((q, i) => ({
    quiz_set_id: quizSet.id,
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

  redirect('/admin')
}
