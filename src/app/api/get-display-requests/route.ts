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
          article.category,
          qty,
          'PENDING',
          '',
        ]],
      },
    })

    return NextResponse.json({ success: true, message: 'Pengajuan display berhasil dikirim.' })
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal menyimpan pengajuan display' }, { status: 500 })
  }
}
