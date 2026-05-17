export type HintType =
  | 'text'
  | 'image'
  | 'image_intro'
  | 'reveal_jongsung'
  | 'reveal_vowel'
  | 'reveal_syllable'

export type QuizInputHint = {
  type: HintType
  content: string
}

export type QuizInputQuestion = {
  answer: string
  category: string | null
  hints: QuizInputHint[]
}

export type SaveQuizInput = {
  title: string
  questions: QuizInputQuestion[]
}

export type SaveQuizResult = { error: string } | undefined
