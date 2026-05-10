'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { deleteQuizAction } from './actions'

type QuizCardProps = {
  id: string
  title: string
  questionCount: number
  createdAt: string
}

export function QuizCard({ id, title, questionCount, createdAt }: QuizCardProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`"${title}" 퀴즈를 삭제할까요? 되돌릴 수 없어요.`)) return
    startTransition(async () => {
      const result = await deleteQuizAction(id)
      if (result.error) alert(result.error)
    })
  }

  const dateLabel = new Date(createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="flex flex-col gap-3 rounded border border-gray-300 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-gray-500">
          문제 {questionCount}개 · {dateLabel}
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/play/${id}`}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          퀴즈 풀기
        </Link>
        <Link
          href={`/admin/edit/${id}`}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          수정
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isPending ? '삭제 중...' : '삭제'}
        </button>
      </div>
    </article>
  )
}
