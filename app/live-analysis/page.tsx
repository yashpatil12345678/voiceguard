import { AppShell } from '@/components/app-shell'
import { VoiceSessionController } from '@/components/voice-session-controller'

export default function Page() {
  return <AppShell title="Live Voice Analysis"><div className="mx-auto max-w-5xl"><div className="mono-label text-primary">REAL-TIME VOICE SESSION</div><h1 className="mt-2 text-3xl font-semibold">VoiceGuard</h1><p className="mt-2 text-sm text-muted-foreground">Capture a short microphone segment for near-live AASIST-L analysis. Results come from the VoiceGuard AI service.</p><div className="mt-8"><VoiceSessionController /></div></div></AppShell>
}
