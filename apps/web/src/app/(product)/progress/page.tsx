import { redirect } from 'next/navigation'

export default function ProgressPage(): never {
  redirect('/library#reading-progress')
}
