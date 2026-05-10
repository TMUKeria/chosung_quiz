'use client'

import { useActionState } from 'react'
import {
  forgotPasswordAction,
  type ForgotPasswordActionState,
} from './actions'

const initialState: ForgotPasswordActionState = { error: null, success: false }

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  )

  if (state.success) {
    return (
      <div className="rounded bg-emerald-50 p-4 text-sm text-emerald-800" role="alert">
        <p className="font-medium">메일이 발송됐어요.</p>
        <p className="mt-1">
          입력하신 이메일에서 비밀번호 재설정 링크를 확인하세요. 메일이 안 오면
          스팸함도 확인해보세요.
        </p>
      </div>
    )
  }

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
        <span className="text-xs text-gray-500">
          가입할 때 사용한 이메일을 입력하세요.
        </span>
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
        {isPending ? '발송 중...' : '재설정 메일 받기'}
      </button>
    </form>
  )
}
