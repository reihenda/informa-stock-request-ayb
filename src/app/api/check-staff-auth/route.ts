import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('staff_auth')?.value
  const staffToken = process.env.STAFF_TOKEN

  if (!staffToken || token !== staffToken) {
    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({ authenticated: true })
}
