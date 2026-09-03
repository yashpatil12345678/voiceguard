'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, ShieldAlert, ShieldCheck, Square, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { useIdentity } from '@/lib/use-identity'
import { predictVoice, type VoiceGuardPrediction } from '@/lib/voiceguard-ai'

type Status = 'idle' | 'starting' | 'recording' | 'analyzing' | 'result' | 'error'

function getMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function displayAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

export function VoiceSessionController() {
  const { user } = useAuth()
  const { identity, loading: identityLoading, error: identityError } = useIdentity()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [prediction, setPrediction] = useState<VoiceGuardPrediction | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<Date | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const stoppingRef = useRef(false)

  const release = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const updateSession = useCallback(async (fields: Record<string, unknown>) => {
    if (!supabase || !sessionIdRef.current) return null
    const { error } = await supabase.from('voice_sessions').update(fields).eq('session_id', sessionIdRef.current)
    return error
  }, [])

  const analyze = useCallback(async (audio: Blob) => {
    if (!audio.size) {
      setStatus('error'); setMessage('No audio was captured. Please try again.')
      await updateSession({ status: 'failed' }); return
    }
    setStatus('analyzing'); setMessage('VoiceGuard is analyzing the audio. The free-tier backend may take several seconds to wake and infer.')
    const controller = new AbortController(); abortRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 60000)
    try {
      const result = await predictVoice(audio, controller.signal)
      setPrediction(result)
      const endedAt = new Date()
      const startedAt = startedAtRef.current ?? endedAt
      const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
      setElapsed(durationSeconds)
      const error = await updateSession({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds, final_risk_score: result.risk_score, risk_level: result.risk_level, status: 'analyzed' })
      await supabase.from('verifications').insert({
  session_id: sessionIdRef.current,
  requested_by: user?.id,
  method: result.risk_level === 'CRITICAL' ? 'security_escalation' : 'risk_review',
  status: 'pending',
  requested_at: startedAt.toISOString(),
  completed_at: endedAt.toISOString(),
  result: result.risk_level,
  notes: `AASIST-L risk score: ${result.risk_score.toFixed(1)}. Security action: ${result.security_action}.`
})
      if (error) {
        console.error('[v0] VoiceGuard result persistence failed', { code: error.code, message: error.message })
        setStatus('error'); setMessage(`Analysis succeeded, but the result could not be saved: ${error.message}`); return
      }
      setStatus('result'); setMessage(`AASIST-L analysis complete: ${result.risk_level} risk.`)
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'VoiceGuard analysis failed.')
      await updateSession({ status: 'failed' })
    } finally {
      window.clearTimeout(timeout); abortRef.current = null; release()
    }
  }, [release, updateSession])

  const stop = useCallback(() => {
    if (stoppingRef.current) return
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    stoppingRef.current = true
    setMessage('Finishing the recording before analysis…')
    recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (!['idle', 'result', 'error'].includes(status)) return
    if (!user || !supabase) { setStatus('error'); setMessage('No authenticated Supabase user is available. Please sign in again.'); return }
    if (identityLoading) { setStatus('error'); setMessage('Your authenticated profile is still loading. Please try again.'); return }
    if (identityError) { setStatus('error'); setMessage(identityError); return }
    if (!identity?.organizationId) { setStatus('error'); setMessage('Your profile has no organization_id, so a VoiceGuard session cannot be created.'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setStatus('error'); setMessage('This browser does not support microphone recording.'); return }
    const mimeType = getMimeType()
    if (mimeType === null || (typeof MediaRecorder.isTypeSupported === 'function' && !mimeType && !MediaRecorder.isTypeSupported(''))) { setStatus('error'); setMessage('No supported browser recording format is available.'); return }

    setStatus('starting'); setMessage('Requesting microphone permission…'); setPrediction(null); chunksRef.current = []; stoppingRef.current = false
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch (error) {
      console.error('[v0] Microphone request failed', error)
      setStatus('error'); setMessage('Microphone permission was denied or no microphone is available.'); return
    }
    streamRef.current = stream
    const startedAt = new Date()
    const { data: created, error } = await supabase.from('voice_sessions').insert({ user_id: user.id, organization_id: identity.organizationId, started_at: startedAt.toISOString(), status: 'active', communication_channel: 'microphone' }).select('session_id').single()
    if (error || !created) {
      console.error('[v0] Voice session insert failed', { code: error?.code, message: error?.message })
      release(); setStatus('error'); setMessage(error?.message ? `Voice session could not be created: ${error.message}` : 'Voice session could not be created.'); return
    }
    sessionIdRef.current = created.session_id; startedAtRef.current = startedAt; setElapsed(0)
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
    recorder.onerror = () => { setStatus('error'); setMessage('The browser could not finish recording this audio segment.'); void updateSession({ status: 'failed' }); release() }
    recorder.onstop = () => {
      const type = chunksRef.current[0]?.type || mimeType || 'audio/webm'
      const audio = new Blob(chunksRef.current, { type })
      void analyze(audio)
    }
    recorderRef.current = recorder; recorder.start()
    setStatus('recording'); setMessage('Recording a short valid audio segment for near-live analysis…')
    window.setTimeout(() => { if (recorder.state === 'recording') stop() }, 6000)
  }, [analyze, identity, identityError, identityLoading, release, status, stop, updateSession, user])

  useEffect(() => {
    if (status !== 'recording' || !startedAtRef.current) return
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current!.getTime()) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => () => { abortRef.current?.abort(); streamRef.current?.getTracks().forEach((track) => track.stop()) }, [])

  const riskIcon = prediction?.risk_level === 'LOW' ? <ShieldCheck className="text-primary" size={22} /> : <TriangleAlert className="text-destructive" size={22} />
  const statusLabel = { idle: 'READY', starting: 'STARTING', recording: 'RECORDING', analyzing: 'ANALYZING', result: 'RESULT', error: 'ERROR' }[status]

  return <div className="card-surface p-6">
    <div className="flex items-start justify-between gap-4"><div><div className="mono-label text-primary">{statusLabel} · VOICEGUARD</div><h2 className="mt-3 text-2xl font-semibold">{status === 'analyzing' ? 'Analyzing your audio.' : status === 'recording' ? 'Monitoring your microphone.' : prediction ? 'VoiceGuard result.' : 'Start a real voice session.'}</h2></div><Mic className={status === 'recording' ? 'animate-pulse text-primary' : 'text-muted-foreground'} size={22} /></div>
    <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{status === 'recording' || status === 'analyzing' ? `Near-live capture · ${elapsed}s` : 'A short recording is sent to the deployed AASIST-L service only after you start.'}</p>
    {message && <div role="status" className={`mt-5 rounded-md border p-3 text-xs ${status === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}`}>{message}</div>}
    <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void start()} disabled={!['idle', 'result', 'error'].includes(status)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Mic size={15} /> Start VoiceGuard</button><button onClick={stop} disabled={status !== 'recording'} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm disabled:opacity-50"><Square size={14} /> Stop VoiceGuard</button></div>
    {prediction && <div className="mt-6 border-t border-border pt-5"><div className="flex items-center gap-2">{riskIcon}<span className="mono-label">REAL AASIST-L RESULT</span></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><div className="mono-label">RISK SCORE</div><p className="mt-1 text-3xl font-semibold">{prediction.risk_score.toFixed(1)}</p></div><div><div className="mono-label">RISK LEVEL</div><p className="mt-1 text-lg font-semibold">{prediction.risk_level}</p></div><div><div className="mono-label">SECURITY ACTION</div><p className="mt-1 text-lg font-semibold">{displayAction(prediction.security_action)}</p></div></div><div className="mt-5 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3"><span>Model: {prediction.model}</span><span>Audio: {prediction.duration_seconds.toFixed(2)}s</span><span>Inference: {prediction.inference_seconds.toFixed(2)}s</span></div><div className="mt-5 rounded-md border border-border bg-background/40 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={16} /> Why this call was flagged</div><p className="mt-2 text-xs leading-5 text-muted-foreground">The model returned a {prediction.risk_level.toLowerCase()} risk classification with a spoof score of {prediction.spoof_score.toFixed(3)}. This is a model signal, not a guarantee of fraud or caller intent.</p><p className="mt-3 text-xs font-medium text-primary">Recommended response: {displayAction(prediction.security_action)}.</p></div></div>}
  </div>
}
