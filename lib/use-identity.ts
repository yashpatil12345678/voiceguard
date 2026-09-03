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
      if (profileError) {
        console.error('[v0] Profile lookup failed', { code: profileError.code, message: profileError.message })
        if (active) setError(profileError.code === '42501' ? 'Your authenticated account is not permitted to read its profile.' : `Profile lookup failed: ${profileError.message}`)
        setLoading(false); return
      }
      if (!profile) { if (active) setError(`No profile exists for authenticated user ${user.id}. Complete profile provisioning before using VoiceGuard.`); setLoading(false); return }
      if (!profile.role) { if (active) setError('Your profile exists, but it has no application role.'); setLoading(false); return }
      let organizationName: string | null = null
      let organizationStatus: string | null = null
      if (profile.organization_id) {
        const { data: organization, error: organizationError } = await supabase.from('organizations').select('organization_id, organization_name, status').eq('organization_id', profile.organization_id).maybeSingle()
        if (organizationError) {
          console.error('[v0] Organization lookup failed', { code: organizationError.code, message: organizationError.message, organizationId: profile.organization_id })
          if (active) setError(organizationError.code === '42501' ? 'Your profile references an organization, but your account is not permitted to read it.' : `Organization lookup failed: ${organizationError.message}`)
          setLoading(false); return
        }
        if (!organization) { if (active) setError(`Profile organization ${profile.organization_id} does not exist.`); setLoading(false); return }
        organizationName = organization.organization_name ?? null
        organizationStatus = organization.status ?? null
      }
      if (active) { setIdentity({ userId: user.id, email: profile.email ?? user.email ?? '', fullName: profile.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'VoiceGuard user', role: profile.role, organizationId: profile.organization_id, organizationName, organizationStatus }); setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [authLoading, user])

  return { identity, loading: authLoading || loading, error }
}
