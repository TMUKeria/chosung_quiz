'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { toChosung, splitHangulSyllables, hasJongsung } from '@/lib/utils/hangul'
import type {
  HintType,
  SaveQuizInput,
  SaveQuizResult,
} from './quiz-form-types'
import {
  deleteHintImageAction,
  uploadHintImageAction,
} from './hint-image-actions'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'
import { validateSaveQuizInput } from './validate-quiz-input'

const TOUR_STORAGE_KEY = 'chosung-quiz-create-tour-seen'

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="quiz-title"]',
    content: '먼저 퀴즈 세트의 제목을 입력하세요. 예: "음식 초성 퀴즈".',
    skipBeacon: true,
  },
  {
    target: '[data-tour="answer-input"]',
    content: '정답 단어를 입력하면 자동으로 초성 미리보기가 표시돼요.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="category-input"]',
    content:
      '카테고리는 선택입니다. 입력하면 퀴즈 풀기 화면에서 학생들에게 첫 힌트로 항상 보여요.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="add-hint"]',
    content: (
      <div className="text-left text-sm leading-relaxed">
        <p className="mb-2 font-semibold">힌트는 6종류예요 (정답이 「치킨」일 때):</p>
        <ul className="mb-3 space-y-1">
          <li>
            • <b>텍스트</b> — 직접 쓴 문장 힌트. 예: 「닭으로 만든 음식」
          </li>
          <li>
            • <b>이미지 (눌러서 공개)</b> — 사진 1장 업로드. 수업 중 버튼을
            누르면 학생 화면에 나타나요.
          </li>
          <li>
            • <b>이미지 (시작부터 공개)</b> — 사진 1장 업로드. 문제 시작과
            동시에 카테고리 옆에 항상 보여요. 카테고리처럼 도입용.
          </li>
          <li>
            • <b>받침</b> — 그 글자의 받침만 공개. 예: 「친」의 받침 「ㄴ」
          </li>
          <li>
            • <b>모음</b> — 자음+모음만 공개, 받침은 가림. 예: 「치」, 「키」
          </li>
          <li>
            • <b>글자 전체</b> — 그 글자 통째로 공개. 예: 「치」
          </li>
        </ul>
        <p>
          받침/모음/글자는 chip(글자 버튼)으로 어떤 글자를 공개할지 직접
          선택하세요. 한 힌트에 여러 글자를 고르면 퀴즈 풀기에서 클릭마다
          하나씩 차례로 공개돼요. 이미지는 5MB 이하 (JPG/PNG/WebP/GIF).
        </p>
      </div>
    ),
    skipBeacon: true,
  },
  {
    target: '[data-tour="add-question"]',
    content: '문제를 더 추가할 수 있어요. 한 퀴즈 세트에 여러 문제 가능.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="save"]',
    content: '저장하면 홈 화면에 카드가 추가되고, 퀴즈 풀기로 바로 진행할 수 있어요.',
    skipBeacon: true,
  },
]

const TOUR_LOCALE = {
  next: '다음',
  back: '이전',
  skip: '건너뛰기',
  last: '완료',
}

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
  image: '이미지 (눌러서 공개)',
  image_intro: '이미지 (시작부터 공개)',
  reveal_jongsung: '받침 공개',
  reveal_vowel: '모음 공개 (받침 가림)',
  reveal_syllable: '글자 전체 공개',
}

const REVEAL_TYPES: HintType[] = ['reveal_jongsung', 'reveal_vowel', 'reveal_syllable']
const IMAGE_TYPES: HintType[] = ['image', 'image_intro']

function parseSelectedIndices(content: string): Set<number> {
  if (!content) return new Set()
  return new Set(
    content
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n)),
  )
}

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
  const [runTour, setRunTour] = useState(false)

  useEffect(() => {
    if (mode !== 'create') return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRunTour(true)
  }, [mode])

  const handleTourCallback = (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
      setRunTour(false)
    }
  }

  const startTour = () => setRunTour(true)

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
    const payload = {
      title,
      questions: questions.map((q) => ({
        answer: q.answer,
        category: q.category.trim() || null,
        hints: q.hints.map((h) => ({ type: h.type, content: h.content })),
      })),
    }
    // Pre-check on the client so mobile users get an instant message that
    // names the exact problem/hint instead of waiting for a server round-trip
    // with a generic error.
    const clientError = validateSaveQuizInput(payload)
    if (clientError) {
      setError(clientError)
      return
    }
    setIsDirty(false)
    startTransition(async () => {
      const result = await onSave(payload)
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
      <Joyride
        steps={TOUR_STEPS}
        run={runTour}
        continuous
        locale={TOUR_LOCALE}
        onEvent={handleTourCallback}
        beaconComponent={() => null}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-gray-500 hover:underline"
        >
          ← 홈으로
        </button>
        <button
          type="button"
          onClick={startTour}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
        >
          사용 가이드
        </button>
      </div>

      <label
        data-tour="quiz-title"
        className="flex flex-col gap-1 text-sm"
      >
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
        data-tour="add-question"
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
        data-tour="save"
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

      <div data-tour="answer-input" className="mb-3 flex flex-col gap-1 text-sm">
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

      <div data-tour="category-input" className="mb-3 flex flex-col gap-1 text-sm">
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
          data-tour="add-hint"
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
  const isImage = IMAGE_TYPES.includes(hint.type)

  const handleTypeChange = (nextType: HintType) => {
    // Switching away from an image hint leaves its file orphaned in Storage
    // until the user explicitly saves — we let the orphan-cleanup pass on save
    // handle it rather than racing a delete here (the new type's content is ''
    // and the saved set won't reference the old path).
    onUpdate({ type: nextType, content: '' })
  }

  return (
    <div className="rounded border border-gray-200 p-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-6 text-gray-500">{index + 1}.</span>
        <select
          value={hint.type}
          onChange={(e) => handleTypeChange(e.target.value as HintType)}
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

        {isImage && (
          <ImageHintEditor hint={hint} onUpdate={onUpdate} />
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
          <span className="text-xs text-gray-500">
            공개할 글자 (여러 개 선택 가능):
          </span>
          {syllables.map((sy, i) => {
            const selectedIndices = parseSelectedIndices(hint.content)
            const isSelected = selectedIndices.has(i)
            const disabled = hint.type === 'reveal_jongsung' && !hasJongsung(sy)
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = new Set(selectedIndices)
                  if (next.has(i)) next.delete(i)
                  else next.add(i)
                  const sorted = [...next].sort((a, b) => a - b).join(',')
                  onUpdate({ content: sorted })
                }}
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

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function ImageHintEditor({
  hint,
  onUpdate,
}: {
  hint: Hint
  onUpdate: (patch: Partial<Hint>) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When the hint already has a stored path (e.g. edit mode), fetch a short-
  // lived signed URL so the thumbnail can render. RLS guarantees we only get
  // URLs for files in the current teacher's folder.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!hint.content) {
        setPreviewUrl(null)
        return
      }
      // Skip if previewUrl was just set optimistically from a local File
      // (blob: URLs are handled by the upload flow, not this effect).
      if (previewUrl?.startsWith('blob:')) return
      const supabase = createBrowserSupabase()
      const { data, error: signErr } = await supabase.storage
        .from('hint-images')
        .createSignedUrl(hint.content, 3600)
      if (cancelled) return
      if (signErr || !data) {
        setPreviewUrl(null)
        return
      }
      setPreviewUrl(data.signedUrl)
    }
    load()
    return () => {
      cancelled = true
    }
    // previewUrl intentionally omitted: only the stored path drives loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint.content])

  const handleFile = async (file: File) => {
    setError(null)
    setIsBusy(true)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadHintImageAction(fd)
      if (!res.ok) {
        setError(res.error)
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(hint.content ? null : null)
        return
      }
      const previousPath = hint.content
      onUpdate({ content: res.path })
      if (previousPath && previousPath !== res.path) {
        // Best-effort orphan cleanup; failures aren't user-actionable.
        deleteHintImageAction(previousPath).catch(() => {})
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleClear = async () => {
    const previousPath = hint.content
    onUpdate({ content: '' })
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (previousPath) {
      await deleteHintImageAction(previousPath).catch(() => {})
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="힌트 이미지 미리보기"
              className="h-14 w-14 rounded border border-gray-200 object-cover"
            />
            <label className="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
              {isBusy ? '업로드 중...' : '다른 사진'}
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                disabled={isBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
            >
              사진 삭제
            </button>
          </>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-gray-400 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
            {isBusy
              ? '업로드 중...'
              : '+ 사진 선택 (5MB 이하 · JPG/PNG/WebP/GIF)'}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="hidden"
              disabled={isBusy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
