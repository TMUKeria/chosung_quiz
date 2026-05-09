import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logoutAction } from './actions'
import { QuizCard } from './QuizCard'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: quizSets } = await supabase
    .from('quiz_sets')
    .select('id, title, created_at, questions(count)')
    .order('created_at', { ascending: false })

  const items =
    quizSets?.map((qs) => ({
      id: qs.id,
      title: qs.title,
      createdAt: qs.created_at,
      questionCount: qs.questions[0]?.count ?? 0,
    })) ?? []

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">초성 퀴즈</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </form>
      </header>

      {user?.email && (
        <p className="mb-6 text-sm text-gray-600">{user.email}님, 환영합니다.</p>
      )}

      <Link
        href="/admin/new"
        className="mb-6 block rounded bg-blue-600 px-6 py-4 text-center text-lg font-medium text-white hover:bg-blue-700"
      >
        + 새 퀴즈 만들기
      </Link>

      {items.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          아직 만든 퀴즈가 없어요. 위 버튼으로 첫 퀴즈를 만들어보세요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <QuizCard
              key={item.id}
              id={item.id}
              title={item.title}
              questionCount={item.questionCount}
              createdAt={item.createdAt}
            />
          ))}
        </div>
      )}
    </main>
  )
}
