import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResetPasswordForm } from './form'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 메일 링크를 거치지 않고 직접 접근하면 세션이 없음 → /forgot-password로 안내
  if (!user) {
    redirect('/forgot-password?error=session_expired')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-bold">새 비밀번호 설정</h1>
      <p className="mb-6 text-sm text-gray-600">
        새로 사용할 비밀번호를 입력하세요.
      </p>
      <ResetPasswordForm />
    </main>
  )
}
