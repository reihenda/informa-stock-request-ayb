import { NextRequest, NextResponse } from 'next/server'
import {
  getSheets, withRetry,
  SPREADSHEET_ID, INVENTORY_SPREADSHEET_ID, SALES_SPREADSHEET_ID,
  SHEETS,
} from '@/lib/sheets'

export const dynamic = 'force-dynamic'

const PRIORITY_PARETO = new Set(['AA', 'AB', 'AC', 'BA', 'BB', 'CA'])

// Articles with these commodities are priority Pareto but allowed to have 0 AYB stock
// (sold made-to-order via Cikupa, not stocked at store)
const EXCLUDED_COMMODITIES = ['REFRIGERATOR AND FREEZER', 'WASHING MACHINE', 'LAUNDRY']

function isExcluded(commodity: string): boolean {
  const c = commodity.toUpperCase()
  return EXCLUDED_COMMODITIES.some(ex => c.includes(ex))
}

export async function GET(req: NextRequest) {
  const managerToken = req.cookies.get('manager_auth')?.value
  if (managerToken !== process.env.MANAGER_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sheets = await getSheets()

    // Read all 4 sources in parallel
    const [paretoRes, masterRes, aybRes, cikupaRes] = await Promise.all([
      // 1. PARETO tab: col A = Article code, col B = Pareto class
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SALES_SPREADSHEET_ID,
        range: 'PARETO!A2:B',
      })),
      // 2. Master article: A=code, B=desc, C=brand, D=dept, E=commodity, F=avgSales
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.MASTER}!A3:F`,
      })),
      // 3. Inventory AYB: A=article, F=unrestricted (col index 5)
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY AYB!A3:F',
      })),
      // 4. Inventory Cikupa: same layout
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY CIKUPA!A3:F',
      })),
    ])

    const paretoRows = (paretoRes.data.values  ?? []) as string[][]
    const masterRows = (masterRes.data.values  ?? []) as string[][]
    const aybRows    = (aybRes.data.values     ?? []) as string[][]
    const cikupaRows = (cikupaRes.data.values  ?? []) as string[][]

    // Build lookup maps
    const masterMap = new Map<string, { desc: string; brand: string; commodity: string }>()
    for (const row of masterRows) {
      const code = String(row[0] ?? '').trim()
      if (code) masterMap.set(code, {
        desc:      String(row[1] ?? ''),
        brand:     String(row[2] ?? ''),
        commodity: String(row[4] ?? ''),
      })
    }

    const buildStockMap = (rows: string[][]): Map<string, number> => {
      const m = new Map<string, number>()
      for (const row of rows) {
        const code = String(row[0] ?? '').trim()
        if (!code) continue
        const val = parseFloat(row[5] ?? '0') || 0
        m.set(code, (m.get(code) ?? 0) + val)
      }
      return m
    }
    const aybMap    = buildStockMap(aybRows)
    const cikupaMap = buildStockMap(cikupaRows)

    // Join pareto rows
    const results = paretoRows
      .filter(row => row[0])
      .map(row => {
        const code      = String(row[0]).trim()
        const pareto    = String(row[1] ?? '').trim().toUpperCase()
        const master    = masterMap.get(code)
        const aybStock  = aybMap.get(code) ?? 0
        const cikupaStock = cikupaMap.get(code) ?? 0
        const isPriority  = PRIORITY_PARETO.has(pareto)
        const excluded    = isExcluded(master?.commodity ?? '')
        const needsRestock = isPriority && !excluded && aybStock <= 0

        return {
          articleCode:   code,
          articleDesc:   master?.desc      ?? '',
          brand:         master?.brand     ?? '',
          commodity:     master?.commodity ?? '',
          pareto,
          isPriority,
          isExcluded:    excluded,
          needsRestock,
          aybStock,
          cikupaStock,
        }
      })

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[get-pareto]', err)
    return NextResponse.json({ error: 'Gagal mengambil data Pareto' }, { status: 500 })
  }
}
