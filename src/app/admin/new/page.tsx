import Link from 'next/link'
import { NewQuizForm } from './form'

export default function NewQuizPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← 홈으로
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">퀴즈 만들기</h1>
      <NewQuizForm />
    </main>
  )
}
