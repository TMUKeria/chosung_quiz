'use server'

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'hint-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export type UploadHintImageResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export async function uploadHintImageAction(
  formData: FormData,
): Promise<UploadHintImageResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: '파일이 없어요.' }
  if (file.size === 0) return { ok: false, error: '빈 파일이에요.' }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: '5MB 이하 이미지만 올릴 수 있어요.' }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: 'JPG / PNG / WebP / GIF 만 가능해요.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요.' }

  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return { ok: false, error: '업로드에 실패했어요.' }

  return { ok: true, path }
}

export type DeleteHintImageResult = { ok: true } | { ok: false; error: string }

export async function deleteHintImageAction(
  path: string,
): Promise<DeleteHintImageResult> {
  if (!path) return { ok: false, error: '경로가 비어 있어요.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요.' }

  // Storage RLS will block paths outside the user's own folder, but we
  // double-check here to fail fast with a clearer message.
  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false, error: '권한이 없는 파일이에요.' }
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return { ok: false, error: '삭제에 실패했어요.' }
  return { ok: true }
}
