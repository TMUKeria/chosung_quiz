'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ResetPasswordActionState = {
  error: string | null
}

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')

  if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
    return { error: '비밀번호를 입력해주세요.' }
  }

  if (password.length < 6) {
    return { error: '비밀번호는 6자 이상이어야 해요.' }
  }

  if (password !== confirmPassword) {
    return { error: '비밀번호가 일치하지 않아요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: '비밀번호 변경에 실패했어요. 재설정 메일을 다시 받아주세요.' }
  }

  redirect('/admin')
}
