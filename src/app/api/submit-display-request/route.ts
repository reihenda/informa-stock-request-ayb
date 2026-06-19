import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { article, qty, salesName } = await req.json()

    const sheets = await getSheets()
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.DISPLAY}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp,
          salesName,
          article.code,
          article.desc,
          article.category || '',
          qty,
          'PENDING',
          '',  // catatan manager
        ]],
      },
    })

    return NextResponse.json({ success: true, message: 'Pengajuan display berhasil dikirim.' })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[submit-display-request]', e?.message)
    return NextResponse.json({ error: 'Gagal menyimpan pengajuan display. Coba lagi.' }, { status: 500 })
  }
}
