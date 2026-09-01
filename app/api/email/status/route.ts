import { NextResponse } from 'next/server'
import { resendConfig } from '@/lib/email/resend'

export async function GET() {
  const config = resendConfig()
  return NextResponse.json({ configured: config.configured, sender: config.sender }, { status: config.configured ? 200 : 503 })
}
