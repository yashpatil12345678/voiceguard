'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, Filter, Play, Search, ShieldAlert, Square } from 'lucide-react'
import { AppShell, EmptyState } from './app-shell'
import { supabase } from '@/lib/supabase/client'
import { VoiceSessionController } from '@/components/voice-session-controller'
import { roleLabel, useIdentity } from '@/lib/use-identity'

const sections: Record<string, { title: string; table?: string; description: string }> = {
  sessions: { title: 'Call History', table: 'voice_sessions', description: 'Authenticated session records visible under the current Supabase policies.' },
  alerts: { title: 'Security Alerts', table: 'alerts', description: 'Alerts available to the current user or organization under RLS.' },
  verification: { title: 'Verification Center', table: 'verifications', description: 'Verification records available to the current user or organization.' },
  analytics: { title: 'Analytics', table: 'analysis_results', description: 'Analysis records available to the current user or organization.' },
  investigations: { title: 'Incidents / Risk Events', table: 'risk_events', description: 'Risk events available under the current authorization policies.' },
  users: { title: 'Organization Users', table: 'profiles', description: 'Profiles visible to the current organization administrator or policy.' },
  policies: { title: 'Risk Policies', table: 'risk_policies', description: 'Organization risk policies visible under the current RLS policies.' },
  reports: { title: 'Reports', table: 'reports', description: 'Reports available to the current user or organization.' },
  audit: { title: 'Audit Logs', table: 'audit_logs', description: 'Audit activity available under the current authorization policies.' },
  organizations: { title: 'Organizations', table: 'organizations', description: 'Organizations visible to authorized system administrators.' },
  integrations: { title: 'Integrations', description: 'No integration provider is connected in this phase.' },
  admin: { title: 'System Administration', description: 'Platform administration controls are pending their authorization model.' },
  monitoring: { title: 'Security Monitoring', table: 'audit_logs', description: 'Security activity available under the current authorization policies.' },
  model: { title: 'Model / AI Monitoring', description: 'AI model monitoring is pending implementation. No metrics are fabricated.' },
  settings: { title: 'System Settings', description: 'System settings are pending implementation.' },
  profile: { title: 'Profile', table: 'profiles', description: 'Your profile data is available according to Supabase RLS.' },
}

export function FoundationPage({ section }: { section: string }) {
  const config = sections[section] || { title: 'Dashboard', description: 'VoiceGuard workspace overview.' }
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(Boolean(config.table))
  const [error, setError] = useState('')
  const { identity, loading: identityLoading, error: identityError } = useIdentity()
  const filtered = useMemo(() => config.title.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || Boolean(config.table)), [config.title, config.table, filter, query])
  if (section === 'profile') return <AppShell title="My Profile"><div className="mx-auto max-w-3xl"><div className="mono-label text-primary">AUTHENTICATED IDENTITY</div><h2 className="mt-2 text-3xl font-semibold">My Profile</h2>{identityLoading ? <div className="card-surface mt-8 p-6 text-sm text-muted-foreground">Loading profile…</div> : identityError ? <EmptyState title="Unable to load profile" description={identityError} /> : identity && <div className="card-surface mt-8 grid gap-5 p-6 sm:grid-cols-2"><div><div className="mono-label">FULL NAME</div><p className="mt-2 text-lg">{identity.fullName}</p></div><div><div className="mono-label">EMAIL</div><p className="mt-2 text-lg">{identity.email}</p></div><div><div className="mono-label">ROLE</div><p className="mt-2 text-lg">{roleLabel(identity.role)}</p></div><div><div className="mono-label">ORGANIZATION</div><p className="mt-2 text-lg">{identity.organizationName ?? 'Not associated'}</p></div></div>}</div></AppShell>

  useEffect(() => {
    let active = true
    async function load() {
      if (!config.table) { setLoading(false); return }
      if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
      const { count: nextCount, error: queryError } = await supabase.from(config.table).select('id', { count: 'exact', head: true })
      if (!active) return
      if (queryError) setError('Unable to load data. Please try again.')
      else setCount(nextCount ?? 0)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [config.table])

  return <AppShell title={config.title}><div className="flex flex-col gap-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mono-label text-primary">SUPABASE WORKSPACE</div><h2 className="mt-2 text-3xl font-semibold">{config.title}</h2><p className="mt-2 text-sm text-muted-foreground">{config.description}</p></div><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/> Dashboard</Link></div>{config.table && <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 text-muted-foreground" size={16}/><span className="sr-only">Search {config.title}</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-sm" /></label><label className="flex items-center gap-2 rounded-md border border-input bg-card px-3 text-sm"><Filter size={15} className="text-muted-foreground"/><span className="sr-only">Filter</span><select value={filter} onChange={e => setFilter(e.target.value)} className="bg-transparent py-2.5 outline-none"><option>All</option><option>Available</option></select></label></div>}{loading ? <div className="card-surface flex min-h-64 items-center justify-center gap-3 p-8 text-sm text-muted-foreground"><Clock3 size={18}/>Loading data…</div> : error ? <EmptyState title="Unable to load data" description={error} /> : !config.table ? <EmptyState title="Coming in a future phase" description={config.description} /> : !filtered || count === 0 ? <EmptyState title="No data available yet" description="No records are visible for this workspace under the current Supabase policies." /> : <div className="card-surface p-6"><div className="mono-label">REAL RECORDS</div><div className="mt-3 text-4xl font-semibold">{count}</div><p className="mt-2 text-sm text-muted-foreground">Records returned by Supabase for this workspace.</p></div>}</div></AppShell>
}

function LegacyDashboardHome() { const [running, setRunning] = useState(false); const [message, setMessage] = useState(''); return <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="card-surface p-6"><div className="flex items-start justify-between"><div><div className="mono-label text-primary">LIVE VOICE ANALYSIS</div><h2 className="mt-3 text-2xl font-semibold">Ready when your pipeline is connected.</h2></div><ShieldAlert className="text-primary" size={22}/></div><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Start and stop controls are available for the future audio pipeline. No microphone access or analysis output is generated yet.</p>{message && <div role="status" className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">{message}</div>}<div className="mt-6 flex flex-wrap gap-3"><button onClick={() => { setRunning(true); setMessage('Voice analysis engine coming in the next implementation phase.'); }} disabled={running} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Play size={15}/> Start VoiceGuard</button><button onClick={() => { setRunning(false); setMessage('Session stopped. No analysis was performed.'); }} disabled={!running} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm disabled:opacity-50"><Square size={14}/> Stop</button></div></div><div className="card-surface p-6"><div className="mono-label">SECURITY ACTIONS</div><div className="mt-5 flex flex-col gap-3"><Link href="/verification" className="rounded-md border border-border p-4 text-sm hover:border-primary">Open verification center</Link><Link href="/alerts" className="rounded-md border border-border p-4 text-sm hover:border-primary">Review security alerts</Link><Link href="/profile" className="rounded-md border border-border p-4 text-sm hover:border-primary">View profile</Link></div></div></div> }

function DashboardHome() { return <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><VoiceSessionController /><div className="card-surface p-6"><div className="mono-label">SECURITY ACTIONS</div><div className="mt-5 flex flex-col gap-3"><Link href="/verification" className="rounded-md border border-border p-4 text-sm hover:border-primary">Open verification center</Link><Link href="/alerts" className="rounded-md border border-border p-4 text-sm hover:border-primary">Review security alerts</Link><Link href="/profile" className="rounded-md border border-border p-4 text-sm hover:border-primary">View profile</Link></div></div></div> }

export { DashboardHome }
