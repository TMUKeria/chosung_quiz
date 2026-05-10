'use client'

import { useActionState } from 'react'
import {
  resetPasswordAction,
  type ResetPasswordActionState,
} from './actions'

const initialState: ResetPasswordActionState = { error: null }

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">새 비밀번호</span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">최소 6자 이상</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">새 비밀번호 확인</span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">위와 동일하게 다시 입력</span>
      </label>

      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}
