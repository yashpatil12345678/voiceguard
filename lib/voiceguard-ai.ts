export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SecurityAction = 'MONITOR' | 'WARN' | 'VERIFY' | 'PREVENT' | 'PREVENT + ESCALATE'

export type VoiceGuardPrediction = {
  model: string
  sample_rate: number
  input_samples: number
  duration_seconds: number
  bona_fide_score: number
  spoof_score: number
  risk_score: number
  risk_level: RiskLevel
  security_action: SecurityAction | string
  inference_seconds: number
}

const AI_URL = (process.env.NEXT_PUBLIC_VOICEGUARD_AI_URL ?? 'https://voiceguard-ai-53ow.onrender.com').replace(/\/$/, '')

export async function predictVoice(audio: Blob, signal?: AbortSignal): Promise<VoiceGuardPrediction> {
  if (!audio.size) throw new Error('The recording was empty. Please try again.')
  const form = new FormData()
  form.append('file', audio, `voiceguard-${Date.now()}.webm`)
  let response: Response
  try {
    response = await fetch(`${AI_URL}/predict`, { method: 'POST', body: form, signal })
  } catch {
    throw new Error('VoiceGuard AI is unavailable or still waking up. Please try again.')
  }
  if (!response.ok) {
    if (response.status === 400) throw new Error('The audio format was not accepted. Please record another segment.')
    if (response.status >= 500) throw new Error('VoiceGuard AI is temporarily unavailable. Please try again.')
    throw new Error(`VoiceGuard AI request failed (HTTP ${response.status}).`)
  }
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('risk_score' in result) || !('risk_level' in result)) throw new Error('VoiceGuard AI returned an invalid response.')
  return result as VoiceGuardPrediction
}
