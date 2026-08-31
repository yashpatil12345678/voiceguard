'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'

const roles = ['Frontline User / Employee', 'Security Analyst', 'Organization Admin', 'System Admin']

export function AuthForm({ signup = false, reset = false }: { signup?: boolean; reset?: boolean }) {
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [role, setRole] = useState('')
  const [pending, setPending] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors([]); setMessage('')
    const data = new FormData(event.currentTarget)
    const nextErrors: string[] = []
    if (!String(data.get('email') || '').includes('@')) nextErrors.push('Enter a valid email address.')
    if (!reset && String(data.get('password') || '').length < 8) nextErrors.push('Password must be at least 8 characters.')
    if (signup && data.get('password') !== data.get('confirm')) nextErrors.push('Passwords must match.')
    if (signup && !role) nextErrors.push('Select an intended platform role.')
    if (nextErrors.length) { setErrors(nextErrors); return }
    setPending(true)
    window.setTimeout(() => { setPending(false); setMessage('Validation passed. This frontend is ready for Supabase Auth integration; no account action was performed.') }, 450)
  }
  const title = reset ? 'Reset access' : signup ? 'Join VoiceGuard' : 'Welcome back'
  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12"><div className="w-full max-w-md"><Link href="/" className="mb-10 flex items-center justify-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg border border-primary/50 bg-primary/10 text-primary"><ShieldCheck size={19}/></span><span className="font-mono text-sm font-bold tracking-[0.18em]">VOICEGUARD</span></Link><div className="card-surface p-7 md:p-9"><Link href={reset ? '/login' : '/'} className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={14}/> Back</Link><div className="mono-label text-primary">{reset ? 'ACCOUNT RECOVERY' : signup ? 'CREATE ACCOUNT' : 'SECURE ACCESS'}</div><h1 className="mt-3 text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{reset ? 'Password reset will be connected to Supabase Auth in Phase 2.' : signup ? 'Create your frontend profile. Authentication connects in Phase 2.' : 'Sign in interface foundation. No authentication is active in this phase.'}</p>{errors.length > 0 && <div role="alert" className="mt-5 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger"><ul className="flex flex-col gap-1">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}{message && <div role="status" className="mt-5 rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-primary">{message}</div>}<form className="mt-7 flex flex-col gap-5" onSubmit={submit} noValidate>{signup && <label className="flex flex-col gap-2 text-sm">Full name<input name="name" required className="rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></label>}<label className="flex flex-col gap-2 text-sm">Email<input name="email" required type="email" className="rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></label>{!reset && <><label className="flex flex-col gap-2 text-sm">Password<input name="password" required minLength={8} type="password" className="rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></label>{signup && <label className="flex flex-col gap-2 text-sm">Confirm password<input name="confirm" required minLength={8} type="password" className="rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></label>}</>}{signup && <fieldset className="flex flex-col gap-2"><legend className="text-sm">Intended role</legend><div className="grid gap-2">{roles.map(item => <label key={item} className={`cursor-pointer rounded-md border px-3 py-2.5 text-xs ${role === item ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}><input type="radio" name="role" value={item} checked={role === item} onChange={event => setRole(event.target.value)} className="sr-only" />{item}</label>)}</div></fieldset>}{!signup && !reset && <Link href="/forgot-password" className="-mt-2 text-xs text-primary hover:underline">Forgot password?</Link>}<button type="submit" disabled={pending} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60">{pending ? 'Validating…' : reset ? 'Validate reset request' : signup ? 'Validate profile' : 'Validate login'} <ArrowRight size={15}/></button></form><p className="mt-6 text-center text-xs text-muted-foreground">{signup ? 'Already have access?' : 'Need an account?'} <Link href={signup ? '/login' : '/signup'} className="text-primary hover:underline">{signup ? 'Log in' : 'Sign up'}</Link></p></div></div></main>
}
