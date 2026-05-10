const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const JONGSUNG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ',
  'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ',
  'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ',
  'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3
const CHOSUNG_BLOCK = 588
const JUNGSUNG_BLOCK = 28

export function toChosung(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code < HANGUL_BASE || code > HANGUL_LAST) return ch
      return CHOSUNG[Math.floor((code - HANGUL_BASE) / CHOSUNG_BLOCK)]
    })
    .join('')
}

export function countHangulSyllables(text: string): number {
  let count = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) count++
  }
  return count
}

export function splitHangulSyllables(text: string): string[] {
  const result: string[] = []
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) result.push(ch)
  }
  return result
}

export function hasJongsung(syllable: string): boolean {
  const code = syllable.charCodeAt(0)
  if (code < HANGUL_BASE || code > HANGUL_LAST) return false
  return (code - HANGUL_BASE) % JUNGSUNG_BLOCK !== 0
}

export function getJongsung(syllable: string): string | null {
  const code = syllable.charCodeAt(0)
  if (code < HANGUL_BASE || code > HANGUL_LAST) return null
  const jongIdx = (code - HANGUL_BASE) % JUNGSUNG_BLOCK
  if (jongIdx === 0) return null
  return JONGSUNG[jongIdx]
}

export function removeJongsung(syllable: string): string {
  const code = syllable.charCodeAt(0)
  if (code < HANGUL_BASE || code > HANGUL_LAST) return syllable
  const jongIdx = (code - HANGUL_BASE) % JUNGSUNG_BLOCK
  if (jongIdx === 0) return syllable
  return String.fromCharCode(code - jongIdx)
}
