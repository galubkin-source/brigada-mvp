'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'

type Point = { id:string; title:string; status:string; notes:string|null; latitude:number|null; longitude:number|null; created_at:string; work_type_text:string|null }
type Project = { id:string; name:string }

export default function ProjectPage() {
  const { projectId } = useParams<{projectId:string}>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [project, setProject] = useState<Project|null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [workTypeText, setWorkTypeText] = useState('')
  const [status, setStatus] = useState('naujas')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState<number|null>(null)
  const [lng, setLng] = useState<number|null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return router.replace('/login')
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from('projects').select('id,name').eq('id', projectId).single(),
      supabase.from('work_points').select('id,title,status,notes,latitude,longitude,created_at,work_type_text').eq('project_id', projectId).order('created_at',{ascending:false})
    ])
    setProject(p)
    setPoints((w ?? []) as Point[])
  }

  useEffect(() => {
    load()
    const channel = supabase.channel(`project-${projectId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'work_points', filter:`project_id=eq.${projectId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  function getGps() {
    setMessage('')
    if (!navigator.geolocation) return setMessage('Šis telefonas nepalaiko GPS per naršyklę.')
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setMessage('GPS vieta nustatyta.') },
      () => setMessage('Nepavyko gauti GPS. Patikrink vietos leidimą naršyklei.'),
      { enableHighAccuracy:true, timeout:15000 }
    )
  }

  async function createPoint(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setMessage('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setSaving(false); return router.replace('/login') }
    const { data: point, error } = await supabase.from('work_points').insert({
      project_id: projectId,
      title,
      work_type_text: workTypeText.trim() || null,
      status,
      notes: notes || null,
      latitude:lat,
      longitude:lng,
      created_by:auth.user.id,
      updated_by:auth.user.id
    }).select('id').single()
    if (error || !point) { setSaving(false); return setMessage(`Klaida: ${error?.message ?? 'įrašas nesukurtas'}`) }

    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'_')
      const path = `${projectId}/${point.id}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from('work-photos').upload(path, file, { upsert:false })
      if (up.error) { setSaving(false); return setMessage(`Darbo taškas sukurtas, bet viena nuotrauka neįkelta: ${up.error.message}`) }
      const photo = await supabase.from('work_point_photos').insert({ work_point_id:point.id, storage_path:path, uploaded_by:auth.user.id })
      if (photo.error) { setSaving(false); return setMessage(`Nuotrauka įkelta, bet neįrašyta DB: ${photo.error.message}`) }
    }

    setTitle(''); setWorkTypeText(''); setNotes(''); setLat(null); setLng(null); setFiles([]); setStatus('naujas'); setShowForm(false); setSaving(false)
    setMessage('Darbo taškas sukurtas.')
    await load()
  }

  const statusLabel = (value:string) => ({naujas:'Naujas',vykdoma:'Vykdoma',baigta:'Baigta',problema:'Problema'}[value] ?? value)

  return <main>
    <AppHeader title={project?.name ?? 'Objektas'} />
    <div className="row"><h1>{project?.name ?? 'Objektas'}</h1><button className="btn" onClick={()=>setShowForm(v=>!v)}>+ Naujas</button></div>
    {message && <div className="card">{message}</div>}
    {showForm && <form className="card stack" onSubmit={createPoint}>
      <h2>Naujas darbo taškas</h2>
      <div className="field"><label>Pavadinimas</label><input required placeholder="Pvz. Iešmas Nr. 12" value={title} onChange={e=>setTitle(e.target.value)} /></div>
      <div className="field"><label>Darbo tipas</label><input type="text" inputMode="text" autoComplete="off" placeholder="Įrašyk darbo tipą, pvz. Spintos surinkimas" value={workTypeText} onChange={e=>setWorkTypeText(e.target.value)} /></div>
      <div className="field"><label>Būsena</label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="naujas">Naujas</option><option value="vykdoma">Vykdoma</option><option value="baigta">Baigta</option><option value="problema">Problema</option></select></div>
      <div className="field"><label>Pastaba</label><textarea placeholder="Kas padaryta / ką reikia padaryti" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div className="field"><label>Nuotraukos</label><input type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files ?? []))} />{files.length>0 && <div className="muted">Pasirinkta: {files.length}</div>}</div>
      <button type="button" className="btn secondary" onClick={getGps}>Nustatyti GPS</button>
      {lat && lng && <div className="muted">GPS: {lat.toFixed(6)}, {lng.toFixed(6)}</div>}
      <button className="btn" disabled={saving}>{saving ? 'Saugoma...' : 'Išsaugoti'}</button>
    </form>}

    <div className="stack">
      {points.length===0 && <div className="card">Darbo taškų dar nėra.</div>}
      {points.map(p => <Link key={p.id} href={`/darbo-taskai/${p.id}`} className="card">
        <div className="row"><h2>{p.title}</h2><span className="badge">{statusLabel(p.status)}</span></div>
        {p.work_type_text && <div className="muted">{p.work_type_text}</div>}
        {p.notes && <div>{p.notes}</div>}
        <div className="muted" style={{marginTop:8}}>{new Date(p.created_at).toLocaleString('lt-LT')}</div>
      </Link>)}
    </div>
  </main>
}
