import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

interface SOFItem {
  articleCode: string
  articleDesc: string
  qtyApproved: string | number
  stockOnHand: string | number
}

interface SOFData {
  sofNumber: string
  date: string
  planDate: string
  supplyingSite: string
  department: string
  requestedBy: string
  approvedBy: string
  inputtedBy: string
  items: SOFItem[]
}

function s(ws: XLSX.WorkSheet, r: number, c: number, v: string | number) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's' }
}

export async function POST(req: NextRequest) {
  const staffToken = req.cookies.get('staff_auth')?.value
  const managerToken = req.cookies.get('manager_auth')?.value
  const validStaff = staffToken && staffToken === process.env.STAFF_TOKEN
  const validManager = managerToken && managerToken === process.env.MANAGER_TOKEN
  if (!validStaff && !validManager) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data: SOFData = await req.json()
  const { sofNumber, date, planDate, supplyingSite, department, requestedBy, approvedBy, inputtedBy, items } = data

  const ws: XLSX.WorkSheet = {}

  // ── Header branding ────────────────────────────────────────
  s(ws, 1, 1, 'KAWAN LAMA RETAIL')
  s(ws, 2, 1, 'STORE ORDER FORM')
  s(ws, 3, 2, 'ACE Hardware Indonesia')
  s(ws, 5, 2, 'Home Center Indonesia')
  s(ws, 7, 2, '________________________')

  // ── Type row (Manual / Special / Store to Store / Consignment) ──
  s(ws, 10, 2, 'Manual')
  s(ws, 10, 4, 'Special')
  s(ws, 10, 6, 'Store to Store')
  s(ws, 10, 8, 'Consignment')
  s(ws, 10, 13, '____________________________')

  // ── Info rows ──────────────────────────────────────────────
  s(ws, 12, 1, 'SITE');          s(ws, 12, 2, ':'); s(ws, 12, 3, 'J432 ( IE AYB BEKASI )')
  s(ws, 12, 4, 'NO.');           s(ws, 12, 5, ':'); s(ws, 12, 6, sofNumber || '')
  s(ws, 13, 1, 'DATE');          s(ws, 13, 2, ':'); s(ws, 13, 3, date || '')
  s(ws, 13, 4, 'PLAN RECEIVED DATE'); s(ws, 13, 5, ':'); s(ws, 13, 6, planDate || '')
  s(ws, 14, 1, 'SUPPLYING SITE'); s(ws, 14, 2, ':'); s(ws, 14, 3, supplyingSite || '')
  s(ws, 15, 1, 'DEPARTMENT');    s(ws, 15, 2, ':'); s(ws, 15, 3, department || '')

  // ── Table header ───────────────────────────────────────────
  s(ws, 17, 1, 'NO')
  s(ws, 17, 2, 'ARTICLE')
  s(ws, 17, 3, 'DESCRIPTION')
  s(ws, 17, 4, 'STOCK ON HAND')
  s(ws, 17, 5, 'QTY ORDER')
  s(ws, 17, 6, 'REASON')

  // ── Data rows ──────────────────────────────────────────────
  items.forEach((item, i) => {
    const r = 18 + i
    s(ws, r, 1, i + 1)
    s(ws, r, 2, String(item.articleCode))
    s(ws, r, 3, String(item.articleDesc))
    s(ws, r, 4, Number(item.stockOnHand) || 0)
    s(ws, r, 5, Number(item.qtyApproved) || 0)
    s(ws, r, 6, 'STOCK')
  })

  // ── Footer (signature section) ─────────────────────────────
  const footerRow = Math.max(30, 18 + items.length + 4)
  const dateLabel = date ? `Date : ${date.replace(/\//g, '-')}` : 'Date :'

  s(ws, footerRow,     2, 'Requested by,')
  s(ws, footerRow,     5, 'Approved by,')
  s(ws, footerRow,    10, 'Inputted by,')
  s(ws, footerRow + 1, 1, dateLabel)
  s(ws, footerRow + 1, 4, dateLabel)
  s(ws, footerRow + 1, 10, 'Date :')
  s(ws, footerRow + 2, 1, requestedBy || '')
  s(ws, footerRow + 2, 4, approvedBy || '')
  s(ws, footerRow + 2, 10, inputtedBy || '')
  s(ws, footerRow + 5, 1, 'Sales Executive')
  s(ws, footerRow + 5, 4, 'Store / Duty Manager')
  s(ws, footerRow + 5, 10, 'Admin Store')
  s(ws, footerRow + 8, 1, 'AHI:F-6.1-01 (01) | HCI :F-S3.2-11 (00)')

  // ── Sheet range ────────────────────────────────────────────
  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: footerRow + 8, c: 13 })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const raw = XLSX.write(wb, { type: 'buffer', bookType: 'ods' }) as Uint8Array
  const buf = Buffer.from(raw)

  const safeName = (sofNumber || 'draft').replace(/[^a-zA-Z0-9]/g, '')
  const safeDate = (date || '').replace(/\//g, '')
  const filename = `SOF_${safeDate}_${safeName}.ods`

  return new NextResponse(buf.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.oasis.opendocument.spreadsheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
