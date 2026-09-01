import { createClient } from '@/lib/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const allowedTypes = new Set<EmailOtpType>(['email', 'signup', 'invite', 'recovery', 'email_change'])

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  if (!tokenHash || !type || !allowedTypes.has(type as EmailOtpType)) {
    return NextResponse.redirect(new URL('/auth/error?message=incomplete_verification', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  })

  if (error) {
    const message = /expired|invalid|used|token/i.test(error.message)
      ? 'expired_verification'
      : 'verification_failed'
    console.error('[v0] Supabase verification failed', { code: error.code, message: error.message })
    return NextResponse.redirect(new URL(`/auth/error?message=${message}`, url.origin))
  }

  // The redirect removes token_hash and type from the browser URL while the
  // server Supabase client persists the verified session in auth cookies.
  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
