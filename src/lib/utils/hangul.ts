const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const HANGUL_BASE = 0xac00
const HANGUL_LAST = 0xd7a3
const CHOSUNG_BLOCK = 588

export function toChosung(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code < HANGUL_BASE || code > HANGUL_LAST) return ch
      return CHOSUNG[Math.floor((code - HANGUL_BASE) / CHOSUNG_BLOCK)]
    })
    .join('')
}
