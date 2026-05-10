import Link from 'next/link'
import { ForgotPasswordForm } from './form'

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-bold">비밀번호 재설정</h1>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </main>
  )
}
