'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  toChosung,
  splitHangulSyllables,
  getJongsung,
  removeJongsung,
} from '@/lib/utils/hangul'

type Hint = { type: string; content: string; imageUrl?: string | null }
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

const FONT_SIZE_STORAGE_KEY = 'chosung-quiz-play-font-size'
const FONT_SIZE_DEFAULT = 8 // rem (≈ Tailwind text-9xl)
const FONT_SIZE_MIN = 4
const FONT_SIZE_MAX = 25
const FONT_SIZE_STEP = 0.5
const JONGSUNG_SIZE_RATIO = 0.5

function parseIndices(content: string): number[] {
  if (!content) return []
  return content
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

function applyHintsToSyllables(
  syllableCount: number,
  hints: Hint[],
  revealedCells: Set<string>,
): SyllableState[] {
  const states: SyllableState[] = Array.from({ length: syllableCount }, () => ({
    level: 'chosung',
    showJongsung: false,
  }))
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i]
    if (!REVEAL_TYPES.has(h.type)) continue
    for (const idx of parseIndices(h.content)) {
      if (!revealedCells.has(`${i}:${idx}`)) continue
      if (idx < 0 || idx >= states.length) continue
      if (h.type === 'reveal_jongsung') {
        states[idx].showJongsung = true
      } else if (h.type === 'reveal_vowel') {
        if (states[idx].level === 'chosung') states[idx].level = 'vowel'
      } else if (h.type === 'reveal_syllable') {
        states[idx].level = 'full'
      }
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

export function PlayClient({
  title,
  questions,
}: {
  title: string
  questions: Question[]
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  // 각 (힌트, 글자) 셀이 공개됐는지 추적. 키 = "hintIdx:syllableIdx" 또는 "hintIdx:text".
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set())
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    if (!stored) return
    const parsed = parseFloat(stored)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontSize(clamped)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSize))
  }, [fontSize])

  const current = questions[currentIdx]

  const resetQuestionState = () => {
    setRevealedCells(new Set())
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

  const toggleCell = (cellKey: string) => {
    setRevealedCells((prev) => {
      const next = new Set(prev)
      if (next.has(cellKey)) next.delete(cellKey)
      else next.add(cellKey)
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
    revealedCells,
  )

  const textHintsToShow = current.hints
    .map((h, i) => ({ hint: h, idx: i }))
    .filter(
      ({ hint, idx }) => hint.type === 'text' && revealedCells.has(`${idx}:text`),
    )
    .map(({ hint }) => hint.content)

  // Images shown above the answer glyphs: image_intro is always pinned;
  // image becomes visible only after the teacher clicks its reveal button.
  // Preserve the hint authoring order so a teacher who interleaves the two
  // sees the layout they designed.
  const topImageUrls = current.hints
    .map((h, i) => ({ hint: h, idx: i }))
    .filter(({ hint, idx }) => {
      if (!hint.imageUrl) return false
      if (hint.type === 'image_intro') return true
      if (hint.type === 'image') return revealedCells.has(`${idx}:image`)
      return false
    })
    .map(({ hint }) => hint.imageUrl as string)

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

        {topImageUrls.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {topImageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`힌트 이미지 ${i + 1}`}
                className="max-h-[35vh] max-w-[45vw] rounded border border-gray-200 object-contain"
              />
            ))}
          </div>
        )}

        {showAnswer ? (
          <div
            className="font-extrabold tracking-widest"
            style={{ fontSize: `${fontSize}rem`, lineHeight: 1.1 }}
          >
            {current.answer}
          </div>
        ) : (
          <SyllableDisplay
            answer={current.answer}
            syllables={syllables}
            states={syllableStates}
            fontSize={fontSize}
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
            {current.hints.flatMap((h, i) => {
              if (h.type === 'text') {
                const cellKey = `${i}:text`
                const active = revealedCells.has(cellKey)
                return [
                  <button
                    key={cellKey}
                    type="button"
                    onClick={() => toggleCell(cellKey)}
                    disabled={showAnswer}
                    className={[
                      'rounded border px-3 py-2 text-sm transition disabled:opacity-30',
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    텍스트 힌트
                  </button>,
                ]
              }
              if (h.type === 'image') {
                const cellKey = `${i}:image`
                const active = revealedCells.has(cellKey)
                return [
                  <button
                    key={cellKey}
                    type="button"
                    onClick={() => toggleCell(cellKey)}
                    disabled={showAnswer}
                    className={[
                      'rounded border px-3 py-2 text-sm transition disabled:opacity-30',
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    이미지 힌트
                  </button>,
                ]
              }
              // image_intro is auto-displayed above; no reveal button needed.
              if (h.type === 'image_intro') return []
              const typeLabel =
                h.type === 'reveal_jongsung'
                  ? '받침'
                  : h.type === 'reveal_vowel'
                    ? '모음'
                    : '글자'
              return parseIndices(h.content).map((idx) => {
                const cellKey = `${i}:${idx}`
                const active = revealedCells.has(cellKey)
                return (
                  <button
                    key={cellKey}
                    type="button"
                    onClick={() => toggleCell(cellKey)}
                    disabled={showAnswer}
                    className={[
                      'rounded border px-3 py-2 text-sm transition disabled:opacity-30',
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {typeLabel}: {idx + 1}번째
                  </button>
                )
              })
            })}
          </div>
        </section>
      )}

      <section className="mb-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600">
        <label htmlFor="font-size-slider" className="font-medium">
          글자 크기
        </label>
        <input
          id="font-size-slider"
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={FONT_SIZE_STEP}
          value={fontSize}
          onChange={(e) => setFontSize(parseFloat(e.target.value))}
          className="w-48"
          aria-label="정답 글자 크기 조정"
        />
        <span className="w-16 text-right font-mono tabular-nums">
          {fontSize.toFixed(1)} rem
        </span>
        <button
          type="button"
          onClick={() => setFontSize(FONT_SIZE_DEFAULT)}
          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
        >
          기본값
        </button>
      </section>

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
  fontSize,
}: {
  answer: string
  syllables: string[]
  states: SyllableState[]
  fontSize: number
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
    <div
      className="flex flex-wrap items-end justify-center gap-3 font-extrabold tracking-wider sm:gap-4"
      style={{ fontSize: `${fontSize}rem`, lineHeight: 1.1 }}
    >
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col items-center">
          <span>{c.top}</span>
          {reserveJongsungRow && (
            <span
              className="mt-1 text-gray-700"
              style={{ fontSize: `${fontSize * JONGSUNG_SIZE_RATIO}rem`, lineHeight: 1 }}
            >
              {c.bottom ?? ' '}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
