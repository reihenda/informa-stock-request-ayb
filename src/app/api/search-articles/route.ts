import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.MASTER}!A3:I`,
    })

    const rows = res.data.values || []

    const results = rows
      .filter(row => {
        const code = (row[0] || '').toString().toLowerCase()
        const desc = (row[1] || '').toString().toLowerCase()
        return code.includes(q) || desc.includes(q)
      })
      .slice(0, 8)
      .map(row => ({
        code:       row[0] || '',
        desc:       row[1] || '',
        department: row[2] || '',
        commodity:  row[3] || '',
        brand:      row[6] || '',
        hasDisplay: (row[7] || '').toLowerCase() === 'yes',
      }))

    return NextResponse.json({ results })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[search-articles]', e?.message)
    return NextResponse.json({ results: [] })
  }
}
