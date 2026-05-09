import { QuizForm } from '../QuizForm'
import { saveQuizAction } from './actions'

export default function NewQuizPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">퀴즈 만들기</h1>
      <QuizForm mode="create" onSave={saveQuizAction} />
    </main>
  )
}
