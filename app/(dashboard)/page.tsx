import { redirect } from 'next/navigation'

// Default dashboard route redirects to planner — the primary feature.
export default function DashboardPage() {
  redirect('/planner')
}
