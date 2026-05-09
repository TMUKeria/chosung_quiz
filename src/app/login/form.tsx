'use client'

import { useActionState } from 'react'
import { loginAction, type LoginActionState } from './actions'

const initialState: LoginActionState = { error: null }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

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
          autoComplete="current-password"
          className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
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
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
