'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('Tikrinama sesija...')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else router.replace('/objektai')
    }).catch(() => setText('Nepavyko patikrinti prisijungimo.'))
  }, [router])

  return <main><div className="card">{text}</div></main>
}
