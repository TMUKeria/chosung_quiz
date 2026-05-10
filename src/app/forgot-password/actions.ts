'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type ForgotPasswordActionState = {
  error: string | null
  success: boolean
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const email = formData.get('email')

  if (typeof email !== 'string' || !email.trim()) {
    return { error: '이메일을 입력해주세요.', success: false }
  }

  const headerList = await headers()
  const host = headerList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectTo = `${protocol}://${host}/auth/callback?next=/reset-password`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    return { error: '메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.', success: false }
  }

  return { error: null, success: true }
}
