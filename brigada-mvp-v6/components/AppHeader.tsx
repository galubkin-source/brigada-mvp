'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AppHeader({ title }: { title: string }) {
  const router = useRouter()
  async function logout() {
    await createClient().auth.signOut()
    router.replace('/login')
  }
  return <div className="row" style={{marginBottom:16}}><strong>{title}</strong><button className="btn secondary" onClick={logout}>Atsijungti</button></div>
}
