'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SignupActionState = {
  error: string | null
}

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  redirect('/admin')
}

function translateAuthError(message: string): string {
  if (message.includes('already registered')) return '이미 가입된 이메일이에요.'
  if (message.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요.'
  if (message.includes('Invalid email')) return '이메일 형식이 올바르지 않아요.'
  return '가입에 실패했어요. 잠시 후 다시 시도해주세요.'
}
