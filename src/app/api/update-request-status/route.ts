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

  const { rowNumber, newStatus, catatan, qtyApproved } = await req.json()

  if (!rowNumber || !['APPROVED', 'REJECTED'].includes(newStatus)) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  try {
    const sheets = await getSheets()

    if (newStatus === 'APPROVED') {
      // Update G = qtyApproved, H = status, I = '' (clear alasan)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REQUESTS}!G${rowNumber}:I${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[qtyApproved ?? '', 'APPROVED', '']] },
      })
      // Set email_status = BELUM di kolom M
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REQUESTS}!M${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['BELUM']] },
      })
    } else {
      // REJECTED: update H = status, I = alasan penolakan
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REQUESTS}!H${rowNumber}:I${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['REJECTED', catatan || '']] },
      })
    }

    return NextResponse.json({ success: true, message: `Status diubah ke ${newStatus}` })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[update-request-status]', e?.message)
    return NextResponse.json({ error: 'Gagal mengupdate status' }, { status: 500 })
  }
}
