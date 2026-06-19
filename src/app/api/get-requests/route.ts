import { NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS, withRetry } from '@/lib/sheets'

export async function GET() {
  try {
    const sheets = await getSheets()

    const [reqRes, dispRes] = await Promise.all([
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REQUESTS}!A3:M`,
      })),
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.DISPLAY}!A3:H`,
      })),
    ])

    const VALID_STATUS = ['APPROVED', 'HOLD', 'REJECTED']

    const requests = (reqRes.data.values || [])
      .map((r, i) => ({
        timestamp:   r[0] || '',
        salesName:   r[1] || '',
        articleCode: r[2] || '',
        articleDesc: r[3] || '',
        qtyRequest:  r[4] || '',
        avgSales:    r[5] || '',
        qtyApproved: r[6] || '',
        status:      r[7] || '',
        alasan:      r[8] || '',
        catatan:     r[9] || '',
        brand:       r[10] || '',
        category:    r[11] || '',
        emailStatus: r[12] || '',   // kolom M: BELUM / SUDAH
        _rowNumber:  i + 3,
      }))
      .filter(r => r.timestamp && r.salesName && VALID_STATUS.includes(r.status))
      .reverse()

    const displayRequests = (dispRes.data.values || []).map((r) => ({
      timestamp:      r[0] || '',
      salesName:      r[1] || '',
      articleCode:    r[2] || '',
      articleDesc:    r[3] || '',
      category:       r[4] || '',
      qtyRequest:     r[5] || '',
      status:         r[6] || '',
      catatanManager: r[7] || '',
    })).reverse()

    return NextResponse.json({ requests, displayRequests })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[get-requests]', e?.message)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
