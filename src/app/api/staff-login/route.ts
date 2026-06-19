import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

async function getStaffPassword(): Promise<string | null> {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.CONFIG}!A2:B`,
    })
    const rows = res.data.values || []
    const row = rows.find(r => r[0]?.toString().trim() === 'STAFF_PASSWORD')
    return row?.[1]?.toString().trim() || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 })
  }

  const staffToken = process.env.STAFF_TOKEN
  if (!staffToken) {
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap' }, { status: 500 })
  }

  const correctPassword = await getStaffPassword()
  if (!correctPassword) {
    return NextResponse.json({ error: 'Password staff belum dikonfigurasi di sheet 5_Config' }, { status: 500 })
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('staff_auth', staffToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 jam
    path: '/',
  })
  return res
}
