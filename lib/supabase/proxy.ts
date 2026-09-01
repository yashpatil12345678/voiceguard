import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const protectedPath = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname === '/live-analysis' || ['/sessions','/alerts','/verification','/analytics','/investigations','/users','/policies','/reports','/integrations','/admin','/profile'].some(path => request.nextUrl.pathname.startsWith(path))
  if (!user && protectedPath) {
    const loginUrl = request.nextUrl.clone(); loginUrl.pathname = '/login'; loginUrl.searchParams.set('next', request.nextUrl.pathname); return NextResponse.redirect(loginUrl)
  }
  return response
}
