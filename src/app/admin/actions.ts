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

  // Collect image hint paths first — the row CASCADE on delete drops the
  // hints rows but not the underlying Storage files, so we have to remove
  // them ourselves before losing the references.
  const { data: questionRows } = await supabase
    .from('questions')
    .select('id')
    .eq('quiz_set_id', quizSetId)
  const questionIds = questionRows?.map((q) => q.id) ?? []
  let imagePathsToRemove: string[] = []
  if (questionIds.length > 0) {
    const { data: hintRows } = await supabase
      .from('hints')
      .select('type, content')
      .in('question_id', questionIds)
    imagePathsToRemove = (hintRows ?? [])
      .filter((h) => h.type === 'image' || h.type === 'image_intro')
      .map((h) => h.content)
  }

  const { error } = await supabase.from('quiz_sets').delete().eq('id', quizSetId)
  if (error) return { error: '삭제에 실패했어요.' }

  if (imagePathsToRemove.length > 0) {
    // Best-effort cleanup; the user's delete intent already succeeded.
    await supabase.storage.from('hint-images').remove(imagePathsToRemove)
  }

  revalidatePath('/admin')
  return {}
}
