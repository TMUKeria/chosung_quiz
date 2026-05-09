import Link from 'next/link'

export default function NewQuizPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2 text-xl font-bold">준비 중이에요</h1>
      <p className="mb-6 text-sm text-gray-600">
        퀴즈 만들기 폼은 다음 업데이트에서 추가됩니다.
      </p>
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        ← 홈으로
      </Link>
    </main>
  )
}
