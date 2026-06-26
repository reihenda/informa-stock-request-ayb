import { NextRequest, NextResponse } from 'next/server'
import {
  getSheets, withRetry,
  SPREADSHEET_ID, INVENTORY_SPREADSHEET_ID, SALES_SPREADSHEET_ID,
  SHEETS,
} from '@/lib/sheets'

export const dynamic = 'force-dynamic'

const PRIORITY_PARETO = new Set(['AA', 'AB', 'AC', 'BA', 'BB', 'CA'])

// Priority Pareto but allowed 0 AYB stock — sold made-to-order via DC Cikupa
const EXCLUDED_COMMODITIES = ['REFRIGERATOR AND FREEZER', 'WASHING MACHINE', 'LAUNDRY']

function isExcluded(commodity: string): boolean {
  const c = commodity.toUpperCase()
  return EXCLUDED_COMMODITIES.some(ex => c.includes(ex))
}

function parseNum(raw: string | undefined): number {
  if (!raw) return 0
  return parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0
}

export async function GET(req: NextRequest) {
  const managerToken = req.cookies.get('manager_auth')?.value
  if (managerToken !== process.env.MANAGER_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sheets = await getSheets()

    // All 5 sources in parallel
    const [paretoRes, masterRes, aybRes, cikupaRes, salesRes] = await Promise.all([
      // 1. PARETO tab: A=article code, B=pareto class
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SALES_SPREADSHEET_ID,
        range: 'PARETO!A2:B',
      })),
      // 2. Master article: A=code, B=desc, C=brand, D=dept, E=commodity
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.MASTER}!A3:E`,
      })),
      // 3. Inventory AYB: A=article, F=unrestricted
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY AYB!A3:F',
      })),
      // 4. Inventory Cikupa: same layout
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: INVENTORY_SPREADSHEET_ID,
        range: 'INVENTORY CIKUPA!A3:F',
      })),
      // 5. Sales 3 bulan terakhir: A=tanggal, B=comm, C=detail comm, D=article, E=desc, F=qty, G=ex ppn, H=inc ppn
      withRetry(() => sheets.spreadsheets.values.get({
        spreadsheetId: SALES_SPREADSHEET_ID,
        range: 'SALES 3 BULAN TERAKHIR!A2:H',
      })),
    ])

    const paretoRows = (paretoRes.data.values ?? []) as string[][]
    const masterRows = (masterRes.data.values ?? []) as string[][]
    const aybRows    = (aybRes.data.values    ?? []) as string[][]
    const cikupaRows = (cikupaRes.data.values ?? []) as string[][]
    const salesRows  = (salesRes.data.values  ?? []) as string[][]

    // Master article map: code → { desc, brand, dept, commodity }
    const masterMap = new Map<string, { desc: string; brand: string; dept: string; commodity: string }>()
    for (const row of masterRows) {
      const code = String(row[0] ?? '').trim()
      if (code) masterMap.set(code, {
        desc:      String(row[1] ?? ''),
        brand:     String(row[2] ?? ''),
        dept:      String(row[3] ?? ''),
        commodity: String(row[4] ?? ''),
      })
    }

    // Inventory stock maps: code → total unrestricted (col F = index 5)
    const buildStockMap = (rows: string[][]): Map<string, number> => {
      const m = new Map<string, number>()
      for (const row of rows) {
        const code = String(row[0] ?? '').trim()
        if (!code) continue
        m.set(code, (m.get(code) ?? 0) + (parseFloat(row[5] ?? '0') || 0))
      }
      return m
    }
    const aybMap    = buildStockMap(aybRows)
    const cikupaMap = buildStockMap(cikupaRows)

    // Sales map: article code (col D = index 3) → { soldQty, soldValue }
    // soldQty = SUM col F (index 5), soldValue = SUM col H (index 7) inc PPN
    const salesMap = new Map<string, { soldQty: number; soldValue: number }>()
    for (const row of salesRows) {
      const code = String(row[3] ?? '').trim()
      if (!code) continue
      const qty   = parseNum(row[5])
      const value = parseNum(row[7])
      const cur   = salesMap.get(code) ?? { soldQty: 0, soldValue: 0 }
      salesMap.set(code, { soldQty: cur.soldQty + qty, soldValue: cur.soldValue + value })
    }

    // Join all data on pareto rows
    const results = paretoRows
      .filter(row => row[0])
      .map(row => {
        const code    = String(row[0]).trim()
        const pareto  = String(row[1] ?? '').trim().toUpperCase()
        const master  = masterMap.get(code)
        const sales   = salesMap.get(code) ?? { soldQty: 0, soldValue: 0 }
        const aybStock    = aybMap.get(code) ?? 0
        const cikupaStock = cikupaMap.get(code) ?? 0
        const isPriority  = PRIORITY_PARETO.has(pareto)
        const excluded    = isExcluded(master?.commodity ?? '')
        const needsRestock = isPriority && !excluded && aybStock <= 0

        return {
          articleCode:  code,
          articleDesc:  master?.desc      ?? '',
          brand:        master?.brand     ?? '',
          dept:         master?.dept      ?? '',
          commodity:    master?.commodity ?? '',
          pareto,
          isPriority,
          isExcluded:   excluded,
          needsRestock,
          aybStock,
          cikupaStock,
          soldQty:      sales.soldQty,
          soldValue:    sales.soldValue,
        }
      })

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[get-pareto]', err)
    return NextResponse.json({ error: 'Gagal mengambil data Pareto' }, { status: 500 })
  }
}
