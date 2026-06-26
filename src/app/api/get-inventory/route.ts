import { NextRequest, NextResponse } from 'next/server'
import { getSheets, withRetry, INVENTORY_SPREADSHEET_ID } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

interface StockTotal { unrestricted: number; blocked: number }

// Sum all rows matching the article code (multiple SLoc rows per article)
function sumRows(rows: string[][], articleCode: string): StockTotal {
  let unrestricted = 0
  let blocked = 0
  const target = String(articleCode).trim()
  for (const row of rows) {
    if (String(row[0] ?? '').trim() === target) {
      unrestricted += parseFloat(row[5] ?? '0') || 0  // col F: Unrestricted
      blocked      += parseFloat(row[6] ?? '0') || 0  // col G: Blocked
    }
  }
  return { unrestricted, blocked }
}

export async function GET(req: NextRequest) {
  const article = req.nextUrl.searchParams.get('article')?.trim()
  if (!article) return NextResponse.json({ error: 'Missing article' }, { status: 400 })

  try {
    const sheets = await getSheets()

    const [aybRes, cikupaRes] = await Promise.all([
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY AYB!A2:G',
      })),
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY CIKUPA!A2:G',
      })),
    ])

    const aybRows    = (aybRes.data.values    ?? []) as string[][]
    const cikupaRows = (cikupaRes.data.values ?? []) as string[][]

    return NextResponse.json({
      ayb:    sumRows(aybRows,    article),
      cikupa: sumRows(cikupaRows, article),
    })
  } catch (err) {
    console.error('[get-inventory]', err)
    return NextResponse.json({ error: 'Gagal mengambil data stok' }, { status: 500 })
  }
}
