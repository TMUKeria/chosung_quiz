import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayClient } from './PlayClient'

// Signed URLs for image hints last long enough to cover a class session
// without forcing a refresh, but short enough that a leaked link expires
// before the next day.
const IMAGE_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60

export default async function PlayQuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quizSet, error } = await supabase
    .from('quiz_sets')
    .select(
      'id, title, questions(answer, category, order, hints(type, content, order))',
    )
    .eq('id', id)
    .single()

  if (error || !quizSet) notFound()

  // Collect every image hint path so we can batch-sign them in one round-trip
  // instead of per-hint. createSignedUrls preserves order and returns null
  // signedUrl for any path it couldn't sign (e.g. file missing).
  const imagePaths = quizSet.questions
    .flatMap((q) => q.hints)
    .filter((h) => h.type === 'image' || h.type === 'image_intro')
    .map((h) => h.content)

  const signedUrlByPath = new Map<string, string>()
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('hint-images')
      .createSignedUrls(imagePaths, IMAGE_SIGNED_URL_TTL_SECONDS)
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path) {
        signedUrlByPath.set(entry.path, entry.signedUrl)
      }
    }
  }

  const questions = [...quizSet.questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      answer: q.answer,
      category: q.category,
      hints: [...q.hints]
        .sort((a, b) => a.order - b.order)
        .map((h) => ({
          type: h.type,
          content: h.content,
          imageUrl:
            h.type === 'image' || h.type === 'image_intro'
              ? (signedUrlByPath.get(h.content) ?? null)
              : null,
        })),
    }))

  return <PlayClient title={quizSet.title} questions={questions} />
}
