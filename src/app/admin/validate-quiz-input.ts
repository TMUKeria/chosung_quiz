import type { HintType, SaveQuizInput } from './quiz-form-types'

// Human-friendly label for the *missing* piece of each hint type, used in the
// "비어 있어요" error so teachers know what to fill in.
const EMPTY_LABEL_BY_TYPE: Record<HintType, string> = {
  text: '텍스트 내용',
  image: '사진',
  image_intro: '사진',
  reveal_jongsung: '공개할 글자',
  reveal_vowel: '공개할 글자',
  reveal_syllable: '공개할 글자',
}

// Returns null when the input is savable, otherwise a Korean error message
// pinpointing which question + hint is empty and *what* is missing.
// Used by both server actions (save / update) and the form's pre-submit check.
export function validateSaveQuizInput(input: SaveQuizInput): string | null {
  if (!input.title.trim()) return '퀴즈 제목을 입력해주세요.'
  if (input.questions.length === 0) return '문제를 1개 이상 추가해주세요.'

  for (let qi = 0; qi < input.questions.length; qi++) {
    const q = input.questions[qi]
    if (!q.answer.trim()) {
      return `문제 ${qi + 1}의 정답을 입력해주세요.`
    }
    for (let hi = 0; hi < q.hints.length; hi++) {
      const h = q.hints[hi]
      if (!h.content.trim()) {
        const what = EMPTY_LABEL_BY_TYPE[h.type] ?? '내용'
        return `문제 ${qi + 1}의 ${hi + 1}번째 힌트 — ${what}이(가) 비어 있어요.`
      }
    }
  }

  return null
}
