'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Prisijungti nepavyko. Patikrink el. paštą ir slaptažodį.')
    router.replace('/objektai')
  }

  return <main>
    <h1>Brigados darbai</h1>
    <form className="card stack" onSubmit={submit}>
      <div><h2>Prisijungimas</h2><div className="muted">Testinė MVP versija</div></div>
      <div className="field"><label>El. paštas</label><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="field"><label>Slaptažodis</label><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      {error && <div className="error">{error}</div>}
      <button className="btn" disabled={loading}>{loading ? 'Jungiamasi...' : 'Prisijungti'}</button>
    </form>
  </main>
}
