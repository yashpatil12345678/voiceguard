import 'server-only'
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM_EMAIL

export function resendConfig() {
  return { configured: Boolean(apiKey && from), sender: from ?? null }
}

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  if (!apiKey || !from) {
    console.error('[v0] Resend request failed: missing server email configuration')
    return { ok: false as const, error: 'Email delivery is not configured.' }
  }

  console.log('[v0] Resend request started')
  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({ from, to: [input.to], subject: input.subject, html: input.html })
  if (error || !data?.id) {
    console.error('[v0] Resend request failed', { name: error?.name, message: error?.message })
    return { ok: false as const, error: 'Email delivery failed.' }
  }

  console.log('[v0] Resend request accepted', { emailId: data.id })
  return { ok: true as const, emailId: data.id }
}
