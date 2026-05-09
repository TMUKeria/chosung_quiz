import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logoutAction } from './actions'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <header className="mb-8 flex items-center justify-between">
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
        <p className="mb-8 text-sm text-gray-600">{user.email}님, 환영합니다.</p>
      )}

      <Link
        href="/admin/new"
        className="rounded bg-blue-600 px-6 py-5 text-center text-lg font-medium text-white hover:bg-blue-700"
      >
        퀴즈 만들기!
      </Link>
    </main>
  )
}
