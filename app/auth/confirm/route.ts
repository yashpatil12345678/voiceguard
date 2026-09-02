import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?message=incomplete_verification', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const message = /expired|invalid|used|code/i.test(error.message)
      ? 'expired_verification'
      : 'verification_failed'
    console.error('[v0] Supabase PKCE exchange failed', { code: error.code, message: error.message })
    return NextResponse.redirect(new URL(`/auth/error?message=${message}`, url.origin))
  }

  // The redirect removes the one-time code from the browser URL after the
  // server client has persisted the authenticated session in cookies.
  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
