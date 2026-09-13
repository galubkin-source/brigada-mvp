'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'

type Project = { id:string; name:string; description:string|null }

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return router.replace('/login')
    const { data, error } = await supabase.from('projects').select('id,name,description').order('name')
    if (error) setError(error.message)
    else { setError(''); setProjects(data ?? []) }
  }

  useEffect(() => { load() }, [router])

  async function createProject(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('create_project_for_me', {
      p_name: name.trim(),
      p_description: description.trim() || null
    })
    if (error) { setSaving(false); return setError(error.message) }
    setName(''); setDescription(''); setShowForm(false); setSaving(false)
    await load()
    const projectId = Array.isArray(data) ? data[0]?.id : data?.id
    if (projectId) router.push(`/objektai/${projectId}`)
  }

  return <main>
    <AppHeader title="Objektai" />
    <div className="row"><h1>Objektai</h1><button className="btn" onClick={()=>setShowForm(v=>!v)}>+ Naujas objektas</button></div>
    {showForm && <form className="card stack" onSubmit={createProject}>
      <h2>Naujas objektas</h2>
      <div className="field"><label>Pavadinimas</label><input required placeholder="Pvz. Palemonas" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div className="field"><label>Pastaba (nebūtina)</label><input placeholder="Trumpas objekto aprašymas" value={description} onChange={e=>setDescription(e.target.value)} /></div>
      <button className="btn" disabled={saving}>{saving ? 'Saugoma...' : 'Sukurti objektą'}</button>
    </form>}
    {error && <div className="card error">{error}</div>}
    {projects.length === 0 && !error && <div className="card">Nėra priskirtų objektų.</div>}
    {projects.map(p => <Link key={p.id} href={`/objektai/${p.id}`} className="card" style={{display:'block'}}>
      <h2>{p.name}</h2><div className="muted">{p.description || 'Darbo objektas'}</div>
    </Link>)}
  </main>
}
