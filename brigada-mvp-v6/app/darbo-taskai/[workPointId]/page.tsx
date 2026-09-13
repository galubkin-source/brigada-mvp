'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'

type Point = { id:string; project_id:string; title:string; work_type_text:string|null; status:string; notes:string|null; latitude:number|null; longitude:number|null; created_at:string; updated_at:string }
type Photo = { id:string; storage_path:string; created_at:string; url?:string }
type Change = { id:string; action:string; changed_at:string; old_data:any; new_data:any }

export default function WorkPointPage() {
  const { workPointId } = useParams<{workPointId:string}>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [point, setPoint] = useState<Point|null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('naujas')
  const [workTypeText, setWorkTypeText] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return router.replace('/login')
    const [{ data:p }, { data:ph }, { data:ch }] = await Promise.all([
      supabase.from('work_points').select('*').eq('id',workPointId).single(),
      supabase.from('work_point_photos').select('id,storage_path,created_at').eq('work_point_id',workPointId).order('created_at'),
      supabase.from('work_point_changes').select('id,action,changed_at,old_data,new_data').eq('work_point_id',workPointId).order('changed_at',{ascending:false}).limit(20)
    ])
    if (!p) return
    setPoint(p); setTitle(p.title); setNotes(p.notes ?? ''); setStatus(p.status); setWorkTypeText(p.work_type_text ?? '')
    const signed = await Promise.all((ph ?? []).map(async photo => {
      const { data } = await supabase.storage.from('work-photos').createSignedUrl(photo.storage_path, 3600)
      return { ...photo, url:data?.signedUrl }
    }))
    setPhotos(signed); setChanges(ch ?? [])
  }

  useEffect(()=>{ load() },[workPointId])

  async function save(e: FormEvent) {
    e.preventDefault(); setMessage('')
    const { data:auth } = await supabase.auth.getUser()
    if (!auth.user) return router.replace('/login')
    const { error } = await supabase.from('work_points').update({ title, notes:notes||null, status, work_type_text:workTypeText.trim()||null, updated_by:auth.user.id }).eq('id',workPointId)
    if (error) return setMessage(`Klaida: ${error.message}`)
    setMessage('Pakeitimai išsaugoti.'); await load()
  }

  if (!point) return <main><div className="card">Kraunama...</div></main>
  const maps = point.latitude && point.longitude ? `https://www.google.com/maps?q=${point.latitude},${point.longitude}` : null

  return <main>
    <AppHeader title="Darbo taškas" />
    <Link href={`/objektai/${point.project_id}`} className="muted">← Grįžti į objektą</Link>
    <h1>{point.title}</h1>
    {maps && <a className="btn secondary" style={{marginBottom:12}} href={maps} target="_blank" rel="noreferrer">Atidaryti Google Maps</a>}

    <form className="card stack" onSubmit={save}>
      <h2>Redaguoti</h2>
      <div className="field"><label>Pavadinimas</label><input required value={title} onChange={e=>setTitle(e.target.value)} /></div>
      <div className="field"><label>Darbo tipas</label><input type="text" inputMode="text" autoComplete="off" placeholder="Įrašyk darbo tipą, pvz. Spintos surinkimas" value={workTypeText} onChange={e=>setWorkTypeText(e.target.value)} /></div>
      <div className="field"><label>Būsena</label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="naujas">Naujas</option><option value="vykdoma">Vykdoma</option><option value="baigta">Baigta</option><option value="problema">Problema</option></select></div>
      <div className="field"><label>Pastaba</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <button className="btn">Išsaugoti pakeitimus</button>
      {message && <div>{message}</div>}
    </form>

    <div className="card stack"><h2>Nuotraukos</h2>{photos.length===0 && <div className="muted">Nuotraukų nėra.</div>}{photos.map(p=>p.url && <img key={p.id} className="photo" src={p.url} alt="Darbo taško nuotrauka" />)}</div>

    <div className="card stack"><h2>Pakeitimų istorija</h2>{changes.length===0 && <div className="muted">Pakeitimų istorijos dar nėra.</div>}{changes.map(c=><div key={c.id} style={{borderTop:'1px solid #eee',paddingTop:10}}><strong>{c.action}</strong><div className="muted">{new Date(c.changed_at).toLocaleString('lt-LT')}</div></div>)}</div>
  </main>
}
