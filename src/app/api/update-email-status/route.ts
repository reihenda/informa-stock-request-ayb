import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

function isAuth(req: NextRequest): boolean {
  const staffToken  = req.cookies.get('staff_auth')?.value
  const managerToken = req.cookies.get('manager_auth')?.value
  // Boleh diakses oleh staff ATAU manager
  return (!!process.env.STAFF_TOKEN && staffToken === process.env.STAFF_TOKEN) ||
         (!!process.env.MANAGER_TOKEN && managerToken === process.env.MANAGER_TOKEN)
}

export async function POST(req: NextRequest) {
  if (!isAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rowNumber, emailStatus } = await req.json()

  if (!rowNumber || !['BELUM', 'SUDAH'].includes(emailStatus)) {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  }

  try {
    const sheets = await getSheets()

    // Update kolom M = emailStatus
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.REQUESTS}!M${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[emailStatus]] },
    })

    return NextResponse.json({ success: true, message: `Status email diubah ke ${emailStatus}` })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[update-email-status]', e?.message)
    return NextResponse.json({ error: 'Gagal mengupdate status email' }, { status: 500 })
  }
}
