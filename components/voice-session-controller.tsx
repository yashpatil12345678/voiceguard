'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { useIdentity } from '@/lib/use-identity'
import { predictVoice, type VoiceGuardPrediction } from '@/lib/voiceguard-ai'

type Status = 'idle' | 'starting' | 'active' | 'processing' | 'stopping' | 'completed' | 'error'

function getMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function actionLabel(action: string) { return action.replace(/_/g, ' ') }

export function VoiceSessionController() {
  const { user } = useAuth()
  const { identity, loading: identityLoading, error: identityError } = useIdentity()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [prediction, setPrediction] = useState<VoiceGuardPrediction | null>(null)
  const [actionState, setActionState] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const release = useCallback(() => {
    abortRef.current?.abort(); abortRef.current = null
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const persist = useCallback(async (fields: Record<string, unknown>) => {
    if (!supabase || !sessionIdRef.current) return
    const { error } = await supabase.from('voice_sessions').update(fields).eq('session_id', sessionIdRef.current)
    if (error) console.error('[v0] voice session update failed', error)
  }, [])

  const stop = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId || !supabase || !['active', 'processing'].includes(status)) return
    setStatus('stopping')
    const endedAt = new Date(); const started = startedAtRef.current ?? endedAt
    const duration = Math.max(0, Math.round((endedAt.getTime() - started.getTime()) / 1000))
    release()
    await persist({ ended_at: endedAt.toISOString(), duration_seconds: duration, status: 'completed' })
    setElapsed(duration); setStatus('completed'); setMessage(prediction ? 'VoiceGuard session completed and saved.' : 'Session stopped before analysis completed.'); sessionIdRef.current = null
  }, [persist, prediction, release, status])

  const analyze = useCallback(async () => {
    if (!chunksRef.current.length) { setStatus('error'); setMessage('No audio was captured. Please try again.'); await persist({ status: 'failed' }); return }
    setStatus('processing'); setMessage('VoiceGuard is analyzing the audio. Render may take a few seconds to wake up.')
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
    const controller = new AbortController(); abortRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 45000)
    try {
      const result = await predictVoice(blob, controller.signal); setPrediction(result); setMessage(`AASIST-L analysis complete: ${result.risk_level} risk.`)
      await persist({ final_risk_score: result.risk_score, risk_level: result.risk_level, status: 'analyzed' })
      setStatus('active')
    } catch (error) { setStatus('active'); setMessage(error instanceof Error ? error.message : 'VoiceGuard analysis failed.') }
    finally { window.clearTimeout(timeout); abortRef.current = null }
  }, [persist])

  const start = useCallback(async () => {
    if (!['idle', 'completed', 'error'].includes(status)) return
    if (!user || !supabase) { setStatus('error'); setMessage('Please sign in before starting VoiceGuard.'); return }
    if (identityLoading) { setStatus('error'); setMessage('Loading your profile and organization. Please try again.'); return }
    if (identityError) { setStatus('error'); setMessage(identityError); return }
    if (!identity?.organizationId) { setStatus('error'); setMessage('Your account is not associated with an organization.'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setStatus('error'); setMessage('This browser does not support microphone recording.'); return }
    const mimeType = getMimeType(); if (mimeType === null) { setStatus('error'); setMessage('This browser does not support microphone recording.'); return }
    setStatus('starting'); setMessage('Requesting microphone permission…'); setPrediction(null); chunksRef.current = []
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { setStatus('error'); setMessage('Microphone permission was denied or unavailable.'); return }
    streamRef.current = stream; const now = new Date()
    const { data: created, error } = await supabase.from('voice_sessions').insert({ user_id: identity.userId, organization_id: identity.organizationId, started_at: now.toISOString(), status: 'active', communication_channel: 'microphone' }).select('session_id').single()
    if (error || !created) { release(); setStatus('error'); setMessage(error?.message ? `Unable to create VoiceGuard session: ${error.message}` : 'Unable to create a VoiceGuard session.'); return }
    sessionIdRef.current = created.session_id; startedAtRef.current = now; setStartedAt(now); setElapsed(0); setStatus('active'); setMessage('Microphone active. Capturing a short segment for near-live analysis.')
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
    recorder.onerror = () => { setMessage('Microphone recording encountered an error.'); void stop() }
    recorder.onstop = () => { if (chunksRef.current.length) void analyze() }
    recorder.start(5000); recorderRef.current = recorder
    window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, 6000)
  }, [analyze, identity, identityError, identityLoading, release, status, stop, user])

  useEffect(() => { if (!['active', 'processing'].includes(status) || !startedAt) return; const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000); return () => window.clearInterval(timer) }, [startedAt, status])
  useEffect(() => () => release(), [release])
  const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  const riskIcon = prediction?.risk_level === 'LOW' ? <ShieldCheck className="text-primary" size={20} /> : <TriangleAlert className="text-destructive" size={20} />

  return <div className="card-surface p-6"><div className="flex items-start justify-between"><div><div className="mono-label text-primary">{status === 'active' || status === 'processing' ? 'VOICEGUARD ACTIVE' : 'LIVE / NEAR-LIVE ANALYSIS'}</div><h2 className="mt-3 text-2xl font-semibold">{status === 'processing' ? 'Analyzing your audio.' : status === 'active' ? 'Monitoring your microphone.' : 'Start a real voice session.'}</h2></div><Mic className={status === 'active' ? 'animate-pulse text-primary' : 'text-muted-foreground'} size={22} /></div><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{status === 'active' || status === 'processing' ? `Recording / listening · ${format(elapsed)}` : 'Microphone access begins only when you explicitly start VoiceGuard.'}</p>{message && <div role="status" className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">{message}</div>}<div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void start()} disabled={['starting', 'active', 'processing', 'stopping'].includes(status)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Mic size={15} /> Start VoiceGuard</button><button onClick={() => void stop()} disabled={!['active', 'processing'].includes(status)} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm disabled:opacity-50"><Square size={14} /> Stop VoiceGuard</button></div>{prediction && <div className="mt-6 border-t border-border pt-5"><div className="flex items-center gap-2">{riskIcon}<span className="mono-label">REAL AASIST-L RESULT</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><div className="mono-label">RISK SCORE</div><p className="mt-1 text-2xl font-semibold">{prediction.risk_score.toFixed(1)}</p></div><div><div className="mono-label">RISK LEVEL</div><p className="mt-1 text-lg font-semibold">{prediction.risk_level}</p></div><div><div className="mono-label">ACTION</div><p className="mt-1 text-lg font-semibold">{actionLabel(prediction.security_action)}</p></div></div><div className="mt-5 rounded-md border border-border p-4"><p className="font-semibold">Why This Call Was Flagged</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The model returned a spoof score of {prediction.spoof_score.toFixed(3)}. This is model output, not a claim of certainty or a complete explanation of caller intent.</p><p className="mt-2 text-xs text-muted-foreground">Model: {prediction.model} · Audio: {prediction.duration_seconds.toFixed(2)}s · Inference: {prediction.inference_seconds.toFixed(2)}s</p></div><div className="mt-4 flex flex-wrap gap-2">{prediction.security_action.includes('VERIFY') || prediction.security_action === 'VERIFY' ? <><button onClick={() => setActionState('Trusted callback requested for this session.')} className="rounded-md border border-primary px-3 py-2 text-xs">Trusted Callback</button><button onClick={() => setActionState('MFA verification requested for this session.')} className="rounded-md border border-primary px-3 py-2 text-xs">MFA Verification</button></> : prediction.security_action.includes('PREVENT') ? <button onClick={() => setActionState('Sensitive action paused and escalation requested.')} className="rounded-md border border-destructive px-3 py-2 text-xs">Pause & Escalate</button> : <button onClick={() => setActionState('Monitoring acknowledged for this session.')} className="rounded-md border border-border px-3 py-2 text-xs">Acknowledge Monitoring</button>}</div>{actionState && <p role="status" className="mt-3 text-xs text-primary">{actionState}</p>}</div>}</div>
}
