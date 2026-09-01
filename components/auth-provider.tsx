'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

type AuthContextValue = { user: User | null; session: Session | null; loading: boolean }
const AuthContext = createContext<AuthContextValue>({ user: null, session: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return () => { active = false } }
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false) } })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setLoading(false) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const value = useMemo(() => ({ session, user: session?.user ?? null, loading }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
