'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginActionState = {
  error: string | null
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  redirect('/admin')
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return '이메일이나 비밀번호가 올바르지 않아요.'
  if (message.includes('Email not confirmed')) return '이메일 인증이 필요해요.'
  return '로그인에 실패했어요. 잠시 후 다시 시도해주세요.'
}
