'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  toChosung,
  splitHangulSyllables,
  getJongsung,
  removeJongsung,
} from '@/lib/utils/hangul'

type Hint = { type: string; content: string }
type Question = {
  answer: string
  category: string | null
  hints: Hint[]
}

type SyllableLevel = 'chosung' | 'vowel' | 'full'
type SyllableState = {
  level: SyllableLevel
  showJongsung: boolean
}

const REVEAL_TYPES = new Set(['reveal_jongsung', 'reveal_vowel', 'reveal_syllable'])

function applyHintsToSyllables(
  syllableCount: number,
  hints: Hint[],
  revealed: Set<number>,
): SyllableState[] {
  const states: SyllableState[] = Array.from({ length: syllableCount }, () => ({
    level: 'chosung',
    showJongsung: false,
  }))
  for (let i = 0; i < hints.length; i++) {
    if (!revealed.has(i)) continue
    const h = hints[i]
    if (!REVEAL_TYPES.has(h.type)) continue
    const idx = parseInt(h.content, 10)
    if (Number.isNaN(idx) || idx < 0 || idx >= states.length) continue
    if (h.type === 'reveal_jongsung') {
      states[idx].showJongsung = true
    } else if (h.type === 'reveal_vowel') {
      if (states[idx].level === 'chosung') states[idx].level = 'vowel'
    } else if (h.type === 'reveal_syllable') {
      states[idx].level = 'full'
    }
  }
  return states
}

function renderSyllable(
  syllable: string,
  state: SyllableState,
): { top: string; bottom: string | null } {
  let top: string
  if (state.level === 'chosung') {
    top = toChosung(syllable)
  } else if (state.level === 'vowel') {
    top = removeJongsung(syllable)
  } else {
    top = syllable
  }

  let bottom: string | null = null
  if (state.showJongsung && state.level !== 'full') {
    bottom = getJongsung(syllable)
  }

  return { top, bottom }
}

function hintLabel(hint: Hint): string {
  if (hint.type === 'text') return '텍스트 힌트'
  const idx = parseInt(hint.content, 10)
  if (hint.type === 'reveal_jongsung') return `받침: ${idx + 1}번째`
  if (hint.type === 'reveal_vowel') return `모음: ${idx + 1}번째`
  if (hint.type === 'reveal_syllable') return `글자: ${idx + 1}번째`
  return hint.type
}

export function PlayClient({
  title,
  questions,
}: {
  title: string
  questions: Question[]
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set())
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const current = questions[currentIdx]

  const resetQuestionState = () => {
    setRevealedHints(new Set())
    setShowAnswer(false)
  }

  const goToNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setIsComplete(true)
      return
    }
    setCurrentIdx(currentIdx + 1)
    resetQuestionState()
  }

  const goToPrev = () => {
    if (currentIdx === 0) return
    setCurrentIdx(currentIdx - 1)
    resetQuestionState()
  }

  const toggleHint = (i: number) => {
    setRevealedHints((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const restartQuiz = () => {
    setCurrentIdx(0)
    resetQuestionState()
    setIsComplete(false)
  }

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  if (isComplete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-6 text-center text-black">
        <div className="text-5xl font-extrabold sm:text-7xl">
          🎉 다 풀었어요!
        </div>
        <p className="text-xl text-gray-600 sm:text-2xl">
          수고하셨어요. 다시 풀어볼까요?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={restartQuiz}
            className="rounded bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700"
          >
            다시 풀기
          </button>
          <Link
            href="/admin"
            className="rounded border border-gray-300 px-6 py-3 text-lg text-gray-700 hover:bg-gray-50"
          >
            홈으로
          </Link>
        </div>
      </main>
    )
  }

  if (!current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-gray-700">이 퀴즈에는 문제가 없어요.</p>
      </main>
    )
  }

  const syllables = splitHangulSyllables(current.answer)
  const syllableStates = applyHintsToSyllables(
    syllables.length,
    current.hints,
    revealedHints,
  )

  const textHintsToShow = current.hints
    .map((h, i) => ({ hint: h, idx: i }))
    .filter(({ hint, idx }) => hint.type === 'text' && revealedHints.has(idx))
    .map(({ hint }) => hint.content)

  return (
    <main className="flex min-h-screen flex-col bg-white p-6 text-black">
      <header className="mb-6 flex items-center justify-between text-sm">
        <Link href="/admin" className="text-gray-600 hover:underline">
          ← 홈으로
        </Link>
        <span className="text-gray-600">
          <span className="font-medium">{title}</span> · 문제 {currentIdx + 1} /{' '}
          {questions.length}
        </span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        {current.category && (
          <p className="text-3xl text-gray-600 sm:text-4xl">
            카테고리: <span className="font-semibold">{current.category}</span>
          </p>
        )}

        {showAnswer ? (
          <div className="text-7xl font-extrabold tracking-widest sm:text-9xl">
            {current.answer}
          </div>
        ) : (
          <SyllableDisplay
            answer={current.answer}
            syllables={syllables}
            states={syllableStates}
          />
        )}

        {textHintsToShow.length > 0 && (
          <ul className="mt-2 flex flex-col gap-3 text-2xl text-gray-800 sm:text-3xl">
            {textHintsToShow.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </section>

      {current.hints.length > 0 && (
        <section className="mb-3 flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            힌트 (눌러서 공개)
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {current.hints.map((h, i) => {
              const active = revealedHints.has(i)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleHint(i)}
                  disabled={showAnswer}
                  className={[
                    'rounded border px-3 py-2 text-sm transition disabled:opacity-30',
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {hintLabel(h)}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentIdx === 0}
          className="rounded border border-gray-300 px-4 py-3 text-base hover:bg-gray-50 disabled:opacity-30"
        >
          ← 이전 문제
        </button>
        <button
          type="button"
          onClick={() => setShowAnswer(true)}
          disabled={showAnswer}
          className="rounded bg-emerald-600 px-5 py-3 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-30"
        >
          정답 보기
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="rounded border border-gray-300 px-4 py-3 text-base hover:bg-gray-50"
        >
          {currentIdx + 1 >= questions.length ? '완료' : '다음 문제 →'}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="ml-auto rounded border border-gray-300 px-4 py-3 text-base hover:bg-gray-50"
        >
          {isFullscreen ? '풀스크린 끄기' : '풀스크린'}
        </button>
      </footer>
    </main>
  )
}

function SyllableDisplay({
  answer,
  syllables,
  states,
}: {
  answer: string
  syllables: string[]
  states: SyllableState[]
}) {
  let syllableIdx = 0
  type Cell = { top: string; bottom: string | null; isSpace: boolean }
  const cells: Cell[] = []

  for (const ch of answer) {
    const code = ch.charCodeAt(0)
    const isHangul = code >= 0xac00 && code <= 0xd7a3
    if (isHangul && syllableIdx < syllables.length) {
      const state = states[syllableIdx]
      const rendered = renderSyllable(ch, state)
      cells.push({ top: rendered.top, bottom: rendered.bottom, isSpace: false })
      syllableIdx++
    } else if (ch === ' ') {
      cells.push({ top: '  ', bottom: null, isSpace: true })
    } else {
      cells.push({ top: ch, bottom: null, isSpace: false })
    }
  }

  const reserveJongsungRow = cells.some((c) => c.bottom)

  return (
    <div className="flex items-end justify-center gap-3 text-7xl font-extrabold tracking-wider sm:gap-4 sm:text-9xl">
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col items-center">
          <span>{c.top}</span>
          {reserveJongsungRow && (
            <span className="mt-1 text-4xl text-gray-700 sm:text-6xl">
              {c.bottom ?? ' '}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
