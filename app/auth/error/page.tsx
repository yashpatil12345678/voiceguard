import Link from 'next/link'

export default async function Page({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams
  const incomplete = message === 'incomplete_verification' || message === 'missing_code'
  const expired = message === 'expired_verification'
  const title = incomplete ? 'Verification link is incomplete' : expired ? 'Verification link has expired' : 'We could not verify this link'
  const body = incomplete
    ? 'The verification link did not include the required confirmation details. Please request a new verification email.'
    : expired
      ? 'This link has expired or has already been used. Please request a new verification email.'
      : 'The confirmation link could not be verified. Please request a new verification email and try again.'

  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="card-surface max-w-md p-8 text-center"><div className="mono-label text-danger">AUTHENTICATION ERROR</div><h1 className="mt-3 text-3xl font-semibold">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="inline-flex rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Request new email</Link><Link href="/login" className="inline-flex rounded-md border border-border px-4 py-3 text-sm font-semibold">Back to sign in</Link></div></div></main>
}
