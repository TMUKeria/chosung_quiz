'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toChosung, splitHangulSyllables, hasJongsung } from '@/lib/utils/hangul'
import type {
  HintType,
  SaveQuizInput,
  SaveQuizResult,
} from './quiz-form-types'

type Hint = {
  id: string
  type: HintType
  content: string
}

type Question = {
  id: string
  answer: string
  category: string
  hints: Hint[]
}

type InitialData = {
  title: string
  questions: {
    answer: string
    category: string | null
    hints: { type: HintType; content: string }[]
  }[]
}

export type QuizFormProps = {
  mode: 'create' | 'edit'
  initialData?: InitialData
  onSave: (input: SaveQuizInput) => Promise<SaveQuizResult>
}

const HINT_TYPE_LABELS: Record<HintType, string> = {
  text: '텍스트',
  reveal_jongsung: '받침 공개',
  reveal_vowel: '모음 공개 (받침 가림)',
  reveal_syllable: '글자 전체 공개',
}

const REVEAL_TYPES: HintType[] = ['reveal_jongsung', 'reveal_vowel', 'reveal_syllable']

const newHint = (): Hint => ({ id: crypto.randomUUID(), type: 'text', content: '' })

const newQuestion = (): Question => ({
  id: crypto.randomUUID(),
  answer: '',
  category: '',
  hints: [],
})

function buildInitialState(initial?: InitialData): {
  title: string
  questions: Question[]
} {
  if (!initial) {
    return { title: '', questions: [newQuestion()] }
  }
  return {
    title: initial.title,
    questions: initial.questions.map((q) => ({
      id: crypto.randomUUID(),
      answer: q.answer,
      category: q.category ?? '',
      hints: q.hints.map((h) => ({
        id: crypto.randomUUID(),
        type: h.type,
        content: h.content,
      })),
    })),
  }
}

const LEAVE_WARNING = '변경사항이 저장되지 않았어요. 정말 나가시겠어요?'

export function QuizForm({ mode, initialData, onSave }: QuizFormProps) {
  const router = useRouter()
  const init = buildInitialState(initialData)
  const [title, setTitleState] = useState(init.title)
  const [questions, setQuestions] = useState<Question[]>(init.questions)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  const setTitle = (next: string) => {
    setTitleState(next)
    setIsDirty(true)
  }

  const addQuestion = () => {
    setQuestions((qs) => [...qs, newQuestion()])
    setIsDirty(true)
  }

  const removeQuestion = (qid: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== qid))
    setIsDirty(true)
  }

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)))
    setIsDirty(true)
  }

  const addHint = (qid: string) => {
    const q = questions.find((x) => x.id === qid)
    if (!q) return
    updateQuestion(qid, { hints: [...q.hints, newHint()] })
  }

  const removeHint = (qid: string, hid: string) => {
    const q = questions.find((x) => x.id === qid)
    if (!q) return
    updateQuestion(qid, { hints: q.hints.filter((h) => h.id !== hid) })
  }

  const updateHint = (qid: string, hid: string, patch: Partial<Hint>) => {
    const q = questions.find((x) => x.id === qid)
    if (!q) return
    updateQuestion(qid, {
      hints: q.hints.map((h) => (h.id === hid ? { ...h, ...patch } : h)),
    })
  }

  const moveHint = (qid: string, hid: string, dir: -1 | 1) => {
    const q = questions.find((x) => x.id === qid)
    if (!q) return
    const idx = q.hints.findIndex((h) => h.id === hid)
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= q.hints.length) return
    const next = [...q.hints]
    ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
    updateQuestion(qid, { hints: next })
  }

  const handleBack = () => {
    if (isDirty && !confirm(LEAVE_WARNING)) return
    router.push('/admin')
  }

  const handleSave = () => {
    setError(null)
    setIsDirty(false)
    startTransition(async () => {
      const result = await onSave({
        title,
        questions: questions.map((q) => ({
          answer: q.answer,
          category: q.category.trim() || null,
          hints: q.hints.map((h) => ({ type: h.type, content: h.content })),
        })),
      })
      if (result?.error) {
        setError(result.error)
        setIsDirty(true)
      }
    })
  }

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const submitLabel = mode === 'edit' ? '수정 저장' : '저장'
  const submitPendingLabel = mode === 'edit' ? '저장 중...' : '저장 중...'

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleBack}
        className="self-start text-sm text-gray-500 hover:underline"
      >
        ← 홈으로
      </button>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">퀴즈 제목</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 음식 초성 퀴즈"
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      {questions.map((q, qIdx) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={qIdx}
          canRemove={questions.length > 1}
          onUpdate={(patch) => updateQuestion(q.id, patch)}
          onRemove={() => removeQuestion(q.id)}
          onAddHint={() => addHint(q.id)}
          onUpdateHint={(hid, patch) => updateHint(q.id, hid, patch)}
          onRemoveHint={(hid) => removeHint(q.id, hid)}
          onMoveHint={(hid, dir) => moveHint(q.id, hid, dir)}
        />
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="rounded border border-dashed border-gray-400 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        + 문제 추가
      </button>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? submitPendingLabel : submitLabel}
      </button>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  canRemove,
  onUpdate,
  onRemove,
  onAddHint,
  onUpdateHint,
  onRemoveHint,
  onMoveHint,
}: {
  question: Question
  index: number
  canRemove: boolean
  onUpdate: (patch: Partial<Question>) => void
  onRemove: () => void
  onAddHint: () => void
  onUpdateHint: (hid: string, patch: Partial<Hint>) => void
  onRemoveHint: (hid: string) => void
  onMoveHint: (hid: string, dir: -1 | 1) => void
}) {
  const syllables = splitHangulSyllables(question.answer)

  return (
    <div className="rounded border border-gray-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium">문제 {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:underline"
          >
            삭제
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">정답</span>
        <input
          type="text"
          value={question.answer}
          onChange={(e) => onUpdate({ answer: e.target.value })}
          placeholder="예: 치킨"
          className="rounded border border-gray-300 px-3 py-2"
        />
        {question.answer && (
          <p className="text-xs text-gray-500">
            초성 미리보기:{' '}
            <span className="font-mono">{toChosung(question.answer)}</span>
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">카테고리 (선택)</span>
        <input
          type="text"
          value={question.category}
          onChange={(e) => onUpdate({ category: e.target.value })}
          placeholder="예: 음식"
          className="rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">힌트</span>
        {question.hints.map((h, hIdx) => (
          <HintRow
            key={h.id}
            hint={h}
            index={hIdx}
            total={question.hints.length}
            syllables={syllables}
            onUpdate={(patch) => onUpdateHint(h.id, patch)}
            onRemove={() => onRemoveHint(h.id)}
            onMoveUp={() => onMoveHint(h.id, -1)}
            onMoveDown={() => onMoveHint(h.id, 1)}
          />
        ))}
        <button
          type="button"
          onClick={onAddHint}
          className="self-start rounded border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          + 힌트 추가
        </button>
      </div>
    </div>
  )
}

function HintRow({
  hint,
  index,
  total,
  syllables,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  hint: Hint
  index: number
  total: number
  syllables: string[]
  onUpdate: (patch: Partial<Hint>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const isReveal = REVEAL_TYPES.includes(hint.type)

  return (
    <div className="rounded border border-gray-200 p-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-6 text-gray-500">{index + 1}.</span>
        <select
          value={hint.type}
          onChange={(e) =>
            onUpdate({ type: e.target.value as HintType, content: '' })
          }
          className="rounded border border-gray-300 px-2 py-1"
        >
          {(Object.keys(HINT_TYPE_LABELS) as HintType[]).map((t) => (
            <option key={t} value={t}>
              {HINT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {hint.type === 'text' && (
          <input
            type="text"
            value={hint.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="예: 닭으로 만든 음식"
            className="flex-1 rounded border border-gray-300 px-2 py-1"
          />
        )}

        {isReveal && syllables.length === 0 && (
          <span className="flex-1 text-xs text-gray-500">
            정답을 먼저 입력하세요.
          </span>
        )}

        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
          aria-label="위로 이동"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-30"
          aria-label="아래로 이동"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          aria-label="삭제"
        >
          ✕
        </button>
      </div>

      {isReveal && syllables.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
          <span className="text-xs text-gray-500">공개할 글자:</span>
          {syllables.map((sy, i) => {
            const isSelected = hint.content === String(i)
            const disabled = hint.type === 'reveal_jongsung' && !hasJongsung(sy)
            return (
              <button
                key={i}
                type="button"
                onClick={() => onUpdate({ content: String(i) })}
                disabled={disabled}
                title={disabled ? '받침이 없어 선택할 수 없어요' : undefined}
                className={[
                  'rounded border px-2 py-1 text-sm',
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50',
                  disabled ? 'cursor-not-allowed opacity-30' : '',
                ].join(' ')}
              >
                {sy}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
