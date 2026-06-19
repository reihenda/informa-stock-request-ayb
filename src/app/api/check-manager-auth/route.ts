import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('manager_auth')?.value
  const managerToken = process.env.MANAGER_TOKEN

  if (!managerToken || token !== managerToken) {
    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({ authenticated: true })
}
