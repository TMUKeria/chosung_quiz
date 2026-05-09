'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteQuizAction(quizSetId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('quiz_sets').delete().eq('id', quizSetId)
  if (error) return { error: '삭제에 실패했어요.' }
  revalidatePath('/admin')
  return {}
}
