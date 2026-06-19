import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

function isAuth(req: NextRequest): boolean {
  const token = req.cookies.get('manager_auth')?.value
  return !!process.env.MANAGER_TOKEN && token === process.env.MANAGER_TOKEN
}

export async function POST(req: NextRequest) {
  if (!isAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rowNumber, newStatus, catatan } = await req.json()

  if (!rowNumber || !['APPROVED', 'REJECTED'].includes(newStatus)) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  try {
    const sheets = await getSheets()

    // Update H = status, I = catatan
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.REQUESTS}!H${rowNumber}:I${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newStatus, catatan || '']] },
    })

    // Jika APPROVED → set email_status = BELUM di kolom M
    if (newStatus === 'APPROVED') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REQUESTS}!M${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['BELUM']] },
      })
    }

    return NextResponse.json({ success: true, message: `Status diubah ke ${newStatus}` })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[update-request-status]', e?.message)
    return NextResponse.json({ error: 'Gagal mengupdate status' }, { status: 500 })
  }
}
