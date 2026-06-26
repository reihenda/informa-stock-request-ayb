import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

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

// ── Border shorthands ────────────────────────────────────────────
const t = { style: 'thin' as const,   color: { argb: 'FF000000' } }
const h = { style: 'hair' as const,   color: { argb: 'FF000000' } }
const m = { style: 'medium' as const, color: { argb: 'FF000000' } }

const bAll  = { top: t, left: t, bottom: t, right: t }
const bR    = { right: t }
const bBot  = { bottom: t }
const bBotR = { bottom: t, right: t }
const bLR   = { left: t, right: t }
const bTR   = { top: t, right: t }
const bBLR  = { bottom: t, left: t, right: t }
const bBL   = { bottom: t, left: t }
const bTBot = { top: t, bottom: t }
const bHBot = { bottom: h }
const bLBot = { left: t, bottom: t }
const bMBot = { bottom: m }

// ── Fill helpers ─────────────────────────────────────────────────
const fillOrange = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFF950E' } }
const fillRed    = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFB84747' } }

// ── Cell setter ──────────────────────────────────────────────────
function set(
  ws: ExcelJS.Worksheet, r: number, c: number,
  value?: string | number | null,
  border?: Partial<ExcelJS.Borders>,
  font?: Partial<ExcelJS.Font>,
  fill?: ExcelJS.Fill,
  align?: Partial<ExcelJS.Alignment>,
) {
  const cell = ws.getCell(r, c)
  if (value != null) cell.value = value
  if (border)  cell.border    = border as ExcelJS.Borders
  if (font)    cell.font      = font as ExcelJS.Font
  if (fill)    cell.fill      = fill
  if (align)   cell.alignment = align as ExcelJS.Alignment
}

const F = 'Arial'
const bold = (s = 9): Partial<ExcelJS.Font> => ({ bold: true,  size: s, name: F })
const norm = (s = 9): Partial<ExcelJS.Font> => ({ bold: false, size: s, name: F })
const uBold = (s = 9): Partial<ExcelJS.Font> => ({ bold: true, size: s, name: F, underline: true })
const ctr: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' }
const lft: Partial<ExcelJS.Alignment> = { horizontal: 'left',   vertical: 'middle' }

// ODS column index → ExcelJS column number (both 1-based, same mapping)
// Col widths (inches * ~9 ≈ Excel character units):
// A=1(3.5) B=2(1.6) C=3(3.5) D=4(15.1) E=5(6.9) F=6(3.4)
// G=7(43.5) H=8(11.3) I=9(16.1) J=10(3.4) K=11(1.7)
// L=12(8.4) M=13(1.7) N=14(3.0) O=15(3.4) P=16(32.1) Q=17(2.1)

export async function POST(req: NextRequest) {
  const staffToken   = req.cookies.get('staff_auth')?.value
  const managerToken = req.cookies.get('manager_auth')?.value
  if (staffToken !== process.env.STAFF_TOKEN && managerToken !== process.env.MANAGER_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: SOFData = await req.json()
  const { sofNumber, date, planDate, supplyingSite, department,
          requestedBy, approvedBy, inputtedBy, items } = body

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Informa Stock Request System'
  const ws = wb.addWorksheet('Sheet1', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  // ── Column widths (exact from ODS) ────────────────────────────
  ws.columns = [
    { width: 3.5  }, // A col1  outer left margin
    { width: 1.6  }, // B col2  checkbox squares
    { width: 3.5  }, // C col3  article / text
    { width: 15.1 }, // D col4  label area
    { width: 6.9  }, // E col5  value area
    { width: 3.4  }, // F col6  narrow
    { width: 43.5 }, // G col7  DESCRIPTION content (huge)
    { width: 11.3 }, // H col8  STOCK ON HAND
    { width: 16.1 }, // I col9  QTY ORDER
    { width: 3.4  }, // J col10 narrow
    { width: 1.7  }, // K col11 very narrow
    { width: 8.4  }, // L col12 REASON start
    { width: 1.7  }, // M col13 narrow
    { width: 3.0  }, // N col14 narrow
    { width: 3.4  }, // O col15 narrow
    { width: 32.1 }, // P col16 right wide column
    { width: 2.1  }, // Q col17 outer right margin
  ]

  // ── Row 1: invisible border row ──────────────────────────────
  ws.getRow(1).height = 8

  // ── Row 2: KAWAN LAMA RETAIL ─────────────────────────────────
  set(ws, 2, 2, 'KAWAN LAMA RETAIL', undefined, bold(9))
  ws.getRow(2).height = 14

  // ── Row 3: STORE ORDER FORM (merged B3:L3) ───────────────────
  ws.mergeCells(3, 2, 3, 12)  // B3:L3
  set(ws, 3, 2, 'STORE ORDER FORM', bAll, bold(16), undefined, ctr)
  // Right panel top border: M3 + N3:Q3 merged
  set(ws, 3, 13, null, bTBot)
  ws.mergeCells(3, 14, 3, 17)  // N3:Q3
  set(ws, 3, 14, null, bTR)
  ws.getRow(3).height = 28

  // ── Row 4: □ ACE Hardware Indonesia ──────────────────────────
  set(ws, 4, 2, null, bAll)               // B4: checkbox square (empty = unchecked)
  ws.mergeCells(4, 3, 4, 5)               // C4:E4
  set(ws, 4, 3, 'ACE Hardware Indonesia', bR, norm(9), undefined, lft)
  ws.getRow(4).height = 13

  // ── Row 5: right-border only row ─────────────────────────────
  ws.mergeCells(5, 2, 5, 5)               // B5:E5
  set(ws, 5, 2, null, bR)
  ws.getRow(5).height = 5

  // ── Row 6: ■ Home Center Indonesia (red filled checkbox) ──────
  set(ws, 6, 2, null, bAll, undefined, fillRed)  // B6: red checkbox
  ws.mergeCells(6, 3, 6, 5)                       // C6:E5
  set(ws, 6, 3, 'Home Center Indonesia', bR, norm(9), undefined, lft)
  ws.getRow(6).height = 13

  // ── Row 7: right-border only row ─────────────────────────────
  ws.mergeCells(7, 2, 7, 5)
  set(ws, 7, 2, null, bR)
  ws.getRow(7).height = 5

  // ── Row 8: □ ________________________ ────────────────────────
  set(ws, 8, 2, null, bAll)               // B8: checkbox square
  ws.mergeCells(8, 3, 8, 4)               // C8:D8
  set(ws, 8, 3, '________________________', undefined, norm(9))
  set(ws, 8, 5, null, bR)                 // E8: right border
  ws.getRow(8).height = 13

  // ── Row 9: separator line ─────────────────────────────────────
  set(ws, 9, 2, null, bBot)
  ws.mergeCells(9, 3, 9, 5)
  set(ws, 9, 3, null, bBLR)
  ws.getRow(9).height = 6

  // ── Row 10: left/right margin borders ────────────────────────
  set(ws, 10, 2, null, { left: t })
  set(ws, 10, 17, null, { right: t })
  ws.getRow(10).height = 6

  // ── Row 11: Checkbox type row ─────────────────────────────────
  // □ Manual  □ Special  [■ orange] Store to Store  □ Consignment  □ ________
  set(ws, 11, 2,  null,              bAll,          norm(9))            // □
  set(ws, 11, 3,  'Manual',          undefined,     norm(9), undefined, lft)
  set(ws, 11, 5,  null,              bAll,          norm(9))            // □
  set(ws, 11, 6,  'Special',         undefined,     norm(9), undefined, lft)
  set(ws, 11, 7,  null,              bAll,          norm(9), fillOrange) // ■ orange
  set(ws, 11, 8,  'Store to Store',  undefined,     norm(9), undefined, lft)
  set(ws, 11, 9,  null,              bAll,          norm(9))            // □
  set(ws, 11, 10, 'Consigment',      undefined,     norm(9), undefined, lft)
  set(ws, 11, 14, null,              bAll,          norm(9))            // □
  set(ws, 11, 15, '____________________________', undefined, norm(8))
  set(ws, 11, 16, null,              bR)
  ws.getRow(11).height = 14

  // ── Row 12: left/right margin borders ────────────────────────
  set(ws, 12, 16, null, bR)
  ws.getRow(12).height = 6

  // ── Info rows 13-16: SITE / DATE / SUPPLYING SITE / DEPT ─────
  const infoFont = bold(9)
  const valFont  = norm(9)
  const valUBold: Partial<ExcelJS.Font> = { bold: true, size: 9, name: F, underline: true }

  // SITE row
  ws.mergeCells(13, 2, 13, 3); set(ws, 13, 2, 'SITE',           undefined, infoFont, undefined, lft)
  set(ws, 13, 4, ':',     undefined, valFont)
  ws.mergeCells(13, 5, 13, 7); set(ws, 13, 5, 'J432 ( IE AYB BEKASI )', { bottom: h }, valUBold, undefined, lft)
  ws.mergeCells(13, 8, 13, 11); set(ws, 13, 8, 'NO.',            undefined, infoFont, undefined, lft)
  set(ws, 13, 12, ':',    undefined, valFont)
  ws.mergeCells(13, 13, 13, 15); set(ws, 13, 13, sofNumber || '', { bottom: h }, uBold(9), undefined, lft)
  set(ws, 13, 16, null,   bR)
  ws.getRow(13).height = 14

  // DATE row
  ws.mergeCells(14, 2, 14, 3); set(ws, 14, 2, 'DATE',           undefined, infoFont, undefined, lft)
  set(ws, 14, 4, ':',     undefined, valFont)
  ws.mergeCells(14, 5, 14, 7); set(ws, 14, 5, date || '',       { bottom: h }, valFont, undefined, lft)
  ws.mergeCells(14, 8, 14, 11); set(ws, 14, 8, 'PLAN RECEIVED DATE', undefined, infoFont, undefined, lft)
  set(ws, 14, 12, ':',    undefined, valFont)
  ws.mergeCells(14, 13, 14, 15); set(ws, 14, 13, planDate || '', { bottom: h }, uBold(9), undefined, lft)
  set(ws, 14, 16, null,   bR)
  ws.getRow(14).height = 14

  // SUPPLYING SITE row
  ws.mergeCells(15, 2, 15, 3); set(ws, 15, 2, 'SUPPLYING SITE', undefined, infoFont, undefined, lft)
  set(ws, 15, 4, ':',     undefined, valFont)
  ws.mergeCells(15, 5, 15, 8); set(ws, 15, 5, supplyingSite || '', { bottom: h }, valFont, undefined, lft)
  set(ws, 15, 12, ':',    undefined, valFont)
  ws.mergeCells(15, 13, 15, 15); set(ws, 15, 13, '', { bottom: h }, valFont)
  set(ws, 15, 16, null,   bR)
  ws.getRow(15).height = 14

  // DEPARTMENT row
  ws.mergeCells(16, 2, 16, 3); set(ws, 16, 2, 'DEPARTMENT',     undefined, infoFont, undefined, lft)
  set(ws, 16, 4, ':',     undefined, valFont)
  ws.mergeCells(16, 5, 16, 7); set(ws, 16, 5, department || '', { bottom: h }, valFont, undefined, lft)
  set(ws, 16, 16, null,   bR)
  ws.getRow(16).height = 14

  // ── Row 17: gap before table ─────────────────────────────────
  set(ws, 17, 1,  null, { right: t })
  set(ws, 17, 16, null, bR)
  ws.getRow(17).height = 6

  // ── Row 18: Table header ──────────────────────────────────────
  const thFont = bold(9)
  set(ws, 18, 1,  null,               bAll)
  set(ws, 18, 2,  'NO',               bAll, thFont, undefined, ctr)
  set(ws, 18, 3,  'ARTICLE',          bAll, thFont, undefined, ctr)
  ws.mergeCells(18, 4, 18, 7)
  set(ws, 18, 4,  'DESCRIPTION',      bAll, thFont, undefined, ctr)
  set(ws, 18, 8,  'STOCK ON HAND',    bAll, thFont, undefined, ctr)
  ws.mergeCells(18, 9, 18, 11)
  set(ws, 18, 9,  'QTY ORDER',        bAll, thFont, undefined, ctr)
  ws.mergeCells(18, 12, 18, 15)
  set(ws, 18, 12, 'REASON',           bAll, thFont, undefined, ctr)
  set(ws, 18, 16, null, bLR, thFont)
  set(ws, 18, 17, null, bAll)
  ws.getRow(18).height = 18

  // ── Rows 19–29: Data (always 11 rows, like template) ─────────
  const MAX_ROWS = 11
  for (let i = 0; i < MAX_ROWS; i++) {
    const r   = 19 + i
    const item = items[i]
    const noFont   = bold(9)
    const artFont  = bAll
    const descFont: Partial<ExcelJS.Font> = item ? bold(9) : norm(9)
    const reasonFont: Partial<ExcelJS.Font> = item ? bold(9) : norm(9)

    set(ws, r, 1,  null,                          bAll)
    set(ws, r, 2,  i + 1,                         bAll, noFont, undefined, ctr)
    set(ws, r, 3,  item?.articleCode ?? '',        bAll, bold(9), undefined, ctr)
    ws.mergeCells(r, 4, r, 7)
    set(ws, r, 4,  item?.articleDesc ?? '',        bAll, descFont, undefined, lft)
    set(ws, r, 8,  item ? (Number(item.stockOnHand) || 0) : '', bAll, bold(9), undefined, ctr)
    ws.mergeCells(r, 9, r, 11)
    set(ws, r, 9,  item ? (Number(item.qtyApproved) || 0) : '', bAll, bold(9), undefined, ctr)
    ws.mergeCells(r, 12, r, 15)
    set(ws, r, 12, item ? 'STOCK' : '',            bAll, reasonFont, undefined, ctr)
    // Right border column
    const isLastData = (i === MAX_ROWS - 1)
    set(ws, r, 16, null, isLastData ? bAll : bLR)
    set(ws, r, 17, null, bAll)
    ws.getRow(r).height = 14
  }

  // ── Row 30: gap ───────────────────────────────────────────────
  set(ws, 30, 1,  null, { right: t })
  set(ws, 30, 16, null, bBotR)
  set(ws, 30, 17, null, bAll)
  ws.getRow(30).height = 8

  // ── Footer ────────────────────────────────────────────────────
  // Row 31: "Requested by," labels
  ws.mergeCells(31, 2, 31, 3); set(ws, 31, 2, null, bBL)  // left bottom border
  ws.mergeCells(31, 4, 31, 6); set(ws, 31, 4, 'Requested by,', undefined, norm(9), undefined, lft)
  ws.mergeCells(31, 9, 31, 11); set(ws, 31, 9, 'Approved by,', undefined, norm(9), undefined, lft)
  set(ws, 31, 12, null, { right: t })
  set(ws, 31, 16, 'Inputted by,', undefined, norm(9), undefined, lft)
  set(ws, 31, 17, null, bBotR)
  ws.getRow(31).height = 12

  // Row 32: Date lines
  ws.mergeCells(32, 2, 32, 4); set(ws, 32, 2, `Date : ${date ? date.replace(/\//g,'-') : ''}`, undefined, norm(9), undefined, lft)
  ws.mergeCells(32, 7, 32, 9); set(ws, 32, 7, `Date : ${date ? date.replace(/\//g,'-') : ''}`, undefined, norm(9), undefined, lft)
  set(ws, 32, 14, 'Date :', undefined, norm(9), undefined, lft)
  ws.getRow(32).height = 12

  // Row 33: Names (bold underline)
  ws.mergeCells(33, 2, 33, 4); set(ws, 33, 2, requestedBy || '', undefined, uBold(9), undefined, lft)
  ws.mergeCells(33, 7, 33, 8); set(ws, 33, 7, approvedBy || '',  undefined, uBold(9), undefined, lft)
  set(ws, 33, 14, inputtedBy || '', undefined, uBold(9), undefined, lft)
  ws.getRow(33).height = 14

  // Rows 34-35: blank spacing
  ws.getRow(34).height = 8
  ws.getRow(35).height = 8

  // Row 36: Role labels (with hairline top border)
  ws.mergeCells(36, 2, 36, 4); set(ws, 36, 2, 'Sales Executive',     { top: h }, norm(8), undefined, lft)
  set(ws, 36, 7,  'Store / Duty Manager', { top: h }, norm(8), undefined, lft)
  set(ws, 36, 14, 'Admin Store',           { top: h }, norm(8), undefined, lft)
  ws.getRow(36).height = 12

  // Rows 37-38: spacing
  ws.getRow(37).height = 8
  ws.getRow(38).height = 8

  // Row 39: Document code
  ws.mergeCells(39, 2, 39, 14)
  set(ws, 39, 2, 'AHI:F-6.1-01 (01) | HCI :F-S3.2-11 (00)', { bottom: t }, bold(8), undefined, lft)
  ws.getRow(39).height = 12

  // ── Generate xlsx buffer ──────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const safeName = (sofNumber || 'draft').replace(/[^a-zA-Z0-9]/g, '')
  const safeDate = (date || '').replace(/\//g, '')
  const filename  = `SOF_${safeDate}_${safeName}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
