import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char)
}

export async function POST(request: Request) {
  let body: { email?: unknown; fullName?: unknown; userId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!accessToken) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 })
  const supabase = createSupabaseClient(url, anonKey)
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !user?.email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const email = user.email
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : String(user.user_metadata?.full_name || 'VoiceGuard user').slice(0, 120)
  const userId = user.id
  if (!fullName || !/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Invalid account email request.' }, { status: 400 })
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.error('[v0] Account email skipped: RESEND_API_KEY is missing'); return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 }) }
  const from = process.env.RESEND_FROM_EMAIL || 'VoiceGuard <onboarding@resend.dev>'
  console.log('[v0] Account-created email request started')
  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({ from, to: [email], subject: 'Your VoiceGuard account has been created', html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your VoiceGuard account has been successfully created.</p><p>You can now sign in to VoiceGuard using your registered email address and password.</p><p>Thank you,<br>VoiceGuard<br>Trust Every Voice. Verify Every Call.</p>` }, { idempotencyKey: `account-created/${userId}` })
  if (error) { console.error('[v0] Account-created email request failed', { message: error.message, name: error.name }); return NextResponse.json({ error: 'Email delivery failed.' }, { status: 502 }) }
  console.log('[v0] Account-created email request accepted')
  return NextResponse.json({ success: true, emailId: data?.id })
}
