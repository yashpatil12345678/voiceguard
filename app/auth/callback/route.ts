import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/auth/error?message=missing_code', url.origin))
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/auth/error?message=invalid_link', url.origin))
  return NextResponse.redirect(new URL('/auth/verified', url.origin))
}
