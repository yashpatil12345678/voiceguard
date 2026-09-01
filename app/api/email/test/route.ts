import { NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/email/resend'

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not available in production.' }, { status: 404 })
  const body = await request.json().catch(() => null) as { to?: unknown } | null
  const to = typeof body?.to === 'string' ? body.to.trim() : ''
  if (!/^\S+@\S+\.\S+$/.test(to)) return NextResponse.json({ error: 'A valid test recipient is required.' }, { status: 400 })
  const result = await sendTransactionalEmail({ to, subject: 'VoiceGuard email delivery test', html: '<p>This is a development-only Resend delivery test.</p>' })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ success: true, emailId: result.emailId })
}
