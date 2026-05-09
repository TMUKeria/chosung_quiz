'use client'

import { useActionState } from 'react'
import { signupAction, type SignupActionState } from './actions'

const initialState: SignupActionState = { error: null }

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">이메일</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">비밀번호</span>
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
        {isPending ? '가입 중...' : '가입하기'}
      </button>
    </form>
  )
}
