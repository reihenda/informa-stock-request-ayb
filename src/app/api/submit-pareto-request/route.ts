import { NextRequest, NextResponse } from 'next/server'
import { getSheets, withRetry, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const managerToken = req.cookies.get('manager_auth')?.value
  if (managerToken !== process.env.MANAGER_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { articleCode, articleDesc, brand, commodity, qty, managerName } = await req.json()

    if (!articleCode || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const sheets = await getSheets()
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    const requester = managerName?.trim() || 'Manager'

    await withRetry(() => sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.REQUESTS}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp,
          requester,
          articleCode,
          articleDesc,
          qty,
          '',           // avgSales — tidak dipakai untuk pareto request
          qty,          // qtyApproved = sama dengan qty (auto-approve)
          'APPROVED',
          '',           // alasan
          'Request dari halaman Pareto oleh Manager',
          brand || '',
          commodity || '',
        ]],
      },
    }))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[submit-pareto-request]', err)
    return NextResponse.json({ error: 'Gagal menyimpan request' }, { status: 500 })
  }
}
