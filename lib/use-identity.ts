'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'

export type Identity = {
  userId: string
  email: string
  fullName: string
  role: string
  organizationId: string | null
  organizationName: string | null
  organizationStatus: string | null
}

export function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function useIdentity() {
  const { user, loading: authLoading } = useAuth()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (authLoading) return
      if (!user || !supabase) { if (active) { setIdentity(null); setLoading(false) }; return }
      setLoading(true); setError('')
      const { data: profile, error: profileError } = await supabase.from('profiles').select('user_id, full_name, email, role, organization_id').eq('user_id', user.id).maybeSingle()
      if (profileError) { if (active) setError(`Profile lookup failed: ${profileError.message}`); setLoading(false); return }
      if (!profile) { if (active) setError('Your user profile could not be found. Please contact your administrator.'); setLoading(false); return }
      let organizationName: string | null = null
      let organizationStatus: string | null = null
      if (profile.organization_id) {
        const { data: organization, error: organizationError } = await supabase.from('organizations').select('id, name, status').eq('id', profile.organization_id).maybeSingle()
        if (organizationError) { if (active) setError(`Organization lookup failed: ${organizationError.message}`); setLoading(false); return }
        if (!organization) { if (active) setError('Your organization could not be found. Please contact your administrator.'); setLoading(false); return }
        organizationName = organization.name ?? null
        organizationStatus = organization.status ?? null
      }
      if (active) { setIdentity({ userId: user.id, email: profile.email ?? user.email ?? '', fullName: profile.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'VoiceGuard user', role: profile.role, organizationId: profile.organization_id, organizationName, organizationStatus }); setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [authLoading, user])

  return { identity, loading: authLoading || loading, error }
}
