import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/auth/error?message=incomplete_verification', url.origin))
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[v0] Supabase PKCE exchange failed', { code: error.code, message: error.message })
    return NextResponse.redirect(new URL('/auth/error?message=expired_verification', url.origin))
  }
  return NextResponse.redirect(new URL('/dashboard', url.origin))
}
