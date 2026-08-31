'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Menu, ShieldCheck, X } from 'lucide-react'

const nav = [
  ['About', '/about'],
  ['How It Works', '/how-it-works'],
  ['Features', '/features'],
  ['Solutions', '/solutions/banking'],
  ['Security & Privacy', '/security'],
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="container flex min-h-18 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-lg border border-primary/50 bg-primary/10 text-primary"><ShieldCheck size={19} /></span>
          <span className="font-mono text-sm font-bold tracking-[0.18em]">VOICEGUARD</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {nav.map(([label, href]) => <Link key={href} href={href} className="text-xs text-muted-foreground transition hover:text-foreground">{label}</Link>)}
          <Link href="/login" className="text-xs text-muted-foreground transition hover:text-foreground">Login</Link>
          <Link href="/signup" className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/85">Sign up <ArrowRight size={14} /></Link>
        </nav>
        <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="container flex flex-col gap-1 border-t border-border py-4 lg:hidden" aria-label="Mobile navigation">
        {nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</Link>)}
        <div className="flex gap-3 border-t border-border pt-3"><Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-muted-foreground">Login</Link><Link href="/signup" onClick={() => setOpen(false)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign up</Link></div>
      </nav>}
    </header>
  )
}

export function Footer() { return <footer className="border-t border-border bg-card/30"><div className="container flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between"><div><div className="font-mono text-sm font-bold tracking-[0.18em]">VOICEGUARD</div><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Trust Every Voice. Verify Every Call. An AI-powered voice-security platform designed for high-risk communication.</p></div><div className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">{[['Home','/'],['About','/about'],['How It Works','/how-it-works'],['Features','/features'],['Solutions','/solutions/banking'],['Security','/security'],['Login','/login'],['Signup','/signup']].map(([l,h]) => <Link key={h} href={h} className="hover:text-foreground">{l}</Link>)}</div><p className="text-xs text-muted-foreground">© 2026 VoiceGuard. Frontend foundation.</p></div></footer> }

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) { return <div className="max-w-2xl"><div className="mono-label mb-4 text-primary">{eyebrow}</div><h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h2>{children && <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">{children}</p>}</div> }
export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3">{children}<ArrowRight size={16} /></Link> }
export function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) { const cls = { LOW: 'text-safe border-safe/40 bg-safe/10', MEDIUM: 'text-warning border-warning/40 bg-warning/10', HIGH: 'text-danger border-danger/40 bg-danger/10', CRITICAL: 'text-critical border-critical/40 bg-critical/10' }[level]; return <span className={`rounded-full border px-2 py-1 font-mono text-[10px] tracking-widest ${cls}`}>{level}</span> }
export function ProductPreview({ children }: { children: React.ReactNode }) { return <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-3"><span className="mono-label text-primary">PRODUCT PREVIEW</span><span className="font-mono text-[10px] text-muted-foreground">PHASE 1 FOUNDATION</span></div>{children}</div> }
export function SignalLine({ label, value, color = 'bg-primary' }: { label: string; value: string; color?: string }) { return <div className="flex items-center gap-3"><span className="w-32 text-xs text-muted-foreground">{label}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full w-2/3 rounded-full ${color}`} /></div><span className="w-16 text-right font-mono text-[11px] text-muted-foreground">{value}</span></div> }
export function Chevron() { return null }
