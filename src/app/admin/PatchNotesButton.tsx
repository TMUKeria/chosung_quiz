'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CHANGELOG, LATEST_VERSION } from '@/lib/changelog'

// 어느 버전까지 봤는지 브라우저에 기억해 두는 칸 이름.
const STORAGE_KEY = 'chosung_quiz:lastSeenVersion'

const TYPE_BADGE: Record<'feat' | 'fix', { label: string; className: string }> = {
  feat: { label: '신규', className: 'bg-blue-100 text-blue-700' },
  fix: { label: '수정', className: 'bg-amber-100 text-amber-700' },
}

export function PatchNotesButton() {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  // 모달을 닫을 때 포커스를 돌려줄 버튼.
  const triggerRef = useRef<HTMLButtonElement>(null)

  // 마운트 시: 마지막으로 본 버전과 최신 버전을 비교 → 새 게 있으면 자동으로 펼침.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let lastSeen: string | null = null
    try {
      lastSeen = localStorage.getItem(STORAGE_KEY)
    } catch {
      // localStorage 차단 환경(시크릿 모드 등) — 조용히 무시.
    }
    if (lastSeen !== LATEST_VERSION) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setHasUnread(true)
      setOpen(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [])

  // 닫을 때 = 다 봤다고 간주 → 최신 버전을 "읽음"으로 기록하고 빨간 점 제거.
  const close = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, LATEST_VERSION)
    } catch {
      // 무시
    }
    setHasUnread(false)
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  // ESC 닫기 + 포커스 트랩(Tab이 모달 밖으로 못 나가게).
  useEffect(() => {
    if (!open) return
    const node = dialogRef.current
    node?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const focusables = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
        aria-label="업데이트 소식 보기"
      >
        업데이트
        {hasUnread && (
          <span
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="patch-notes-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl outline-none"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="patch-notes-title" className="text-lg font-bold">
                업데이트 소식
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {CHANGELOG.map((release) => (
                <section key={release.version}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h3 className="font-semibold text-gray-900">
                      v{release.version}
                    </h3>
                    <span className="text-xs text-gray-400">{release.date}</span>
                  </div>
                  {release.title && (
                    <p className="mb-2 text-sm text-gray-600">{release.title}</p>
                  )}
                  <ul className="flex flex-col gap-1.5">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span
                          className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_BADGE[change.type].className}`}
                        >
                          {TYPE_BADGE[change.type].label}
                        </span>
                        <span className="text-gray-700">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
