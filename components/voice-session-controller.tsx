'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'

type Status = 'idle' | 'starting' | 'active' | 'stopping' | 'completed' | 'error'

function getMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function VoiceSessionController() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<Date | null>(null)

  const release = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stop = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (status !== 'active' || !sessionId || !supabase) return
    setStatus('stopping')
    const endedAt = new Date()
    const started = startedAtRef.current ?? endedAt
    const duration = Math.max(0, Math.round((endedAt.getTime() - started.getTime()) / 1000))
    release()
    const { error } = await supabase.from('voice_sessions').update({ ended_at: endedAt.toISOString(), duration_seconds: duration, status: 'completed' }).eq('id', sessionId)
    if (error) { setStatus('error'); setMessage('Unable to complete the voice session. Please try again.'); return }
    setElapsed(duration)
    setStatus('completed')
    setMessage('VoiceGuard session completed. No AI analysis was performed.')
    sessionIdRef.current = null
  }, [release, status])

  const start = useCallback(async () => {
    if (!['idle', 'completed', 'error'].includes(status)) return
    if (!user || !supabase) { setStatus('error'); setMessage('Please sign in before starting VoiceGuard.'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setStatus('error'); setMessage('This browser does not support microphone recording.'); return }
    const mimeType = getMimeType()
    if (mimeType === null) { setStatus('error'); setMessage('This browser does not support microphone recording.'); return }
    setStatus('starting'); setMessage('Requesting microphone permission…')
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { setStatus('error'); setMessage('Microphone permission is required to start VoiceGuard.'); return }
    streamRef.current = stream
    const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('id', user.id).maybeSingle()
    if (profileError) { release(); setStatus('error'); setMessage('Unable to load your organization profile.'); return }
    const now = new Date()
    const { data: created, error } = await supabase.from('voice_sessions').insert({ user_id: user.id, organization_id: profile?.organization_id ?? null, started_at: now.toISOString(), status: 'active', communication_channel: 'microphone' }).select('id').single()
    if (error || !created) { release(); setStatus('error'); setMessage('Unable to create a VoiceGuard session. Please try again.'); return }
    sessionIdRef.current = created.id; startedAtRef.current = now; setStartedAt(now); setElapsed(0); setStatus('active'); setMessage('Microphone active. Audio chunks are prepared for future analysis.')
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (event) => { if (event.data.size > 0) void event.data }
    recorder.onerror = () => { setMessage('Microphone recording encountered an error. Stopping safely.'); void stop() }
    recorder.start(5000)
    recorderRef.current = recorder
  }, [release, status, stop, user])

  useEffect(() => { if (status !== 'active' || !startedAt) return; const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000); return () => window.clearInterval(timer) }, [startedAt, status])
  useEffect(() => () => release(), [release])
  const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return <div className="card-surface p-6"><div className="flex items-start justify-between"><div><div className="mono-label text-primary">{status === 'active' ? 'VOICEGUARD ACTIVE' : 'LIVE VOICE ANALYSIS'}</div><h2 className="mt-3 text-2xl font-semibold">{status === 'active' ? 'Listening to your microphone.' : 'Start a real voice session.'}</h2></div><Mic className={status === 'active' ? 'animate-pulse text-primary' : 'text-muted-foreground'} size={22} /></div><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{status === 'active' ? `Recording / listening · ${format(elapsed)} · started ${startedAt?.toLocaleTimeString()}` : 'Microphone access begins only when you explicitly start VoiceGuard.'}</p>{message && <div role="status" className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">{message}</div>}<div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void start()} disabled={status === 'starting' || status === 'active' || status === 'stopping'} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Mic size={15} /> Start VoiceGuard</button><button onClick={() => void stop()} disabled={status !== 'active'} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm disabled:opacity-50"><Square size={14} /> Stop VoiceGuard</button></div>{status === 'active' && <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">AI analysis will appear here in a future implementation phase. No risk score or detection result is generated.</div>}</div>
}
