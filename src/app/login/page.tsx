import Link from 'next/link'
import { LoginForm } from './form'

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-gray-600">
        처음 오셨나요?{' '}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          회원가입
        </Link>
      </p>
    </main>
  )
}
