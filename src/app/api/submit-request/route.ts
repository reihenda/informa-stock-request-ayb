import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { article, qty, avgSales, approvedQty, status, salesName } = await req.json()

    const sheets = await getSheets()
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    const alasan =
      status === 'HOLD'
        ? `Qty melebihi avg penjualan — dibatasi ke ${approvedQty} unit`
        : ''

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.REQUESTS}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp,
          salesName,
          article.code,
          article.desc,
          qty,
          avgSales,
          approvedQty,
          status,
          alasan,
          '',             // catatan (kosong, bisa diisi manager)
          article.brand || '',
          article.category || '',
        ]],
      },
    })

    return NextResponse.json({ success: true, message: 'Request berhasil disimpan.' })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[submit-request]', e?.message)
    return NextResponse.json({ error: 'Gagal menyimpan request. Coba lagi.' }, { status: 500 })
  }
}
