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

// ── Style constants ─────────────────────────────────────────────
const C_DARK_BLUE = 'FF1F4E79'
const C_MID_BLUE  = 'FF2E75B6'
const C_WHITE     = 'FFFFFFFF'
const C_LIGHT_ROW = 'FFF0F6FF'
const C_GRAY_LINE = 'FFAAAAAA'
const C_TEXT_DIM  = 'FF666666'

const thin = (argb = 'FF1F4E79') => ({ style: 'thin' as const, color: { argb } })
const med  = (argb = 'FF1F4E79') => ({ style: 'medium' as const, color: { argb } })

const tableBorder: Partial<ExcelJS.Borders> = {
  top: thin(), left: thin(), bottom: thin(), right: thin(),
}

function setInfo(
  ws: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: string,
  labelCol = 'B',
  colonCol = 'C',
  valueCol = 'D',
  mergeTo = 'G',
) {
  ws.getCell(`${labelCol}${row}`).value = label
  ws.getCell(`${labelCol}${row}`).font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell(`${colonCol}${row}`).value = ':'
  ws.getCell(`${colonCol}${row}`).font = { size: 9, name: 'Calibri' }
  ws.mergeCells(`${valueCol}${row}:${mergeTo}${row}`)
  ws.getCell(`${valueCol}${row}`).value = value
  ws.getCell(`${valueCol}${row}`).font = { size: 9, name: 'Calibri' }
  // Light bottom border under info rows
  ;[labelCol, colonCol, `${valueCol}:${mergeTo}`].forEach(c => {
    ws.getCell(`${c}${row}`).border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } }
  })
}

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
  const ws = wb.addWorksheet('Sheet1', { pageSetup: { paperSize: 9, orientation: 'landscape' } })

  // ── Column widths ───────────────────────────────────────────
  ws.columns = [
    { key: 'A', width: 2  },   // margin
    { key: 'B', width: 7  },   // NO
    { key: 'C', width: 16 },   // ARTICLE
    { key: 'D', width: 36 },   // DESCRIPTION
    { key: 'E', width: 15 },   // STOCK ON HAND
    { key: 'F', width: 12 },   // QTY ORDER
    { key: 'G', width: 10 },   // REASON
    { key: 'H', width: 18 },   // right info
    { key: 'I', width: 14 },
  ]

  // ── Row 2: Company banner ───────────────────────────────────
  ws.mergeCells('B2:I2')
  const banner = ws.getCell('B2')
  banner.value        = 'KAWAN LAMA RETAIL'
  banner.font         = { bold: true, size: 14, color: { argb: C_WHITE }, name: 'Calibri' }
  banner.fill         = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DARK_BLUE } }
  banner.alignment    = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(2).height = 26

  // ── Row 3: Form title ───────────────────────────────────────
  ws.mergeCells('B3:I3')
  const title = ws.getCell('B3')
  title.value       = 'STORE ORDER FORM'
  title.font        = { bold: true, size: 11, color: { argb: C_DARK_BLUE }, name: 'Calibri' }
  title.alignment   = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(3).height = 18

  // ── Rows 4-5: Store options (checkbox style) ────────────────
  ws.getCell('C4').value = '□  ACE Hardware Indonesia'
  ws.getCell('C4').font  = { size: 9, name: 'Calibri' }
  ws.getCell('C5').value = '□  Home Center Indonesia'
  ws.getCell('C5').font  = { size: 9, name: 'Calibri' }

  // ── Row 6: Separator ───────────────────────────────────────
  ws.mergeCells('B6:I6')
  ws.getCell('B6').border = { bottom: med() }
  ws.getRow(6).height = 6

  // ── Row 7: empty ───────────────────────────────────────────
  ws.getRow(7).height = 4

  // ── Row 8: SOF type checkboxes ─────────────────────────────
  const chkFont: Partial<ExcelJS.Font> = { size: 9, name: 'Calibri' }
  ;[['B', '□  Manual'], ['D', '□  Special'], ['F', '□  Store to Store'], ['H', '□  Consignment']]
    .forEach(([col, val]) => {
      ws.getCell(`${col}8`).value = val
      ws.getCell(`${col}8`).font  = chkFont
    })
  ws.getRow(8).height = 14

  ws.getRow(9).height = 6

  // ── Rows 10-13: Info fields ─────────────────────────────────
  // SITE + NO.
  ws.getCell('B10').value = 'SITE'; ws.getCell('B10').font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell('C10').value = ':'
  ws.mergeCells('D10:F10')
  ws.getCell('D10').value = 'J432 ( IE AYB BEKASI )'; ws.getCell('D10').font = { size: 9, name: 'Calibri' }
  ws.getCell('G10').value = 'NO.'; ws.getCell('G10').font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell('H10').value = ':'; ws.getCell('H10').font = { size: 9, name: 'Calibri' }
  ws.getCell('I10').value = sofNumber || ''; ws.getCell('I10').font = { size: 9, name: 'Calibri' }

  // DATE + PLAN RECEIVED DATE
  ws.getCell('B11').value = 'DATE'; ws.getCell('B11').font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell('C11').value = ':'
  ws.mergeCells('D11:F11')
  ws.getCell('D11').value = date || ''; ws.getCell('D11').font = { size: 9, name: 'Calibri' }
  ws.getCell('G11').value = 'PLAN RECEIVED DATE'; ws.getCell('G11').font = { bold: true, size: 8, name: 'Calibri' }
  ws.getCell('H11').value = ':'
  ws.getCell('I11').value = planDate || ''; ws.getCell('I11').font = { size: 9, name: 'Calibri' }

  // SUPPLYING SITE
  ws.getCell('B12').value = 'SUPPLYING SITE'; ws.getCell('B12').font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell('C12').value = ':'
  ws.mergeCells('D12:I12')
  ws.getCell('D12').value = supplyingSite || ''; ws.getCell('D12').font = { size: 9, name: 'Calibri' }

  // DEPARTMENT
  ws.getCell('B13').value = 'DEPARTMENT'; ws.getCell('B13').font = { bold: true, size: 9, name: 'Calibri' }
  ws.getCell('C13').value = ':'
  ws.mergeCells('D13:I13')
  ws.getCell('D13').value = department || ''; ws.getCell('D13').font = { size: 9, name: 'Calibri' }

  // Border box around info section
  for (let r = 10; r <= 13; r++) {
    ws.getRow(r).height = 15
    for (const c of ['B','C','D','E','F','G','H','I']) {
      const cell = ws.getCell(`${c}${r}`)
      cell.border = {
        top:    r === 10 ? thin() : undefined,
        bottom: r === 13 ? thin() : { style: 'hair', color: { argb: 'FFDDDDDD' } },
        left:   c === 'B' ? thin() : undefined,
        right:  c === 'I' ? thin() : undefined,
      }
    }
  }

  ws.getRow(14).height = 8

  // ── Row 15: Table header ────────────────────────────────────
  const TABLE_HEADER_ROW = 15
  const tableCols  = ['B', 'C', 'D', 'E', 'F', 'G'] as const
  const tableHeads = ['NO', 'ARTICLE', 'DESCRIPTION', 'STOCK ON HAND', 'QTY ORDER', 'REASON']
  tableHeads.forEach((h, i) => {
    const c = ws.getCell(`${tableCols[i]}${TABLE_HEADER_ROW}`)
    c.value     = h
    c.font      = { bold: true, size: 9, color: { argb: C_WHITE }, name: 'Calibri' }
    c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DARK_BLUE } }
    c.border    = tableBorder
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(TABLE_HEADER_ROW).height = 18

  // ── Data rows ───────────────────────────────────────────────
  const DATA_START = TABLE_HEADER_ROW + 1
  items.forEach((item, i) => {
    const rowNum = DATA_START + i
    const rowData: (string | number)[] = [
      i + 1,
      String(item.articleCode),
      String(item.articleDesc),
      Number(item.stockOnHand) || 0,
      Number(item.qtyApproved) || 0,
      'STOCK',
    ]
    const isAlt = i % 2 === 1
    rowData.forEach((val, j) => {
      const c = ws.getCell(`${tableCols[j]}${rowNum}`)
      c.value     = val
      c.border    = tableBorder
      c.font      = { size: 9, name: 'Calibri' }
      c.alignment = {
        vertical: 'middle',
        horizontal: j === 2 ? 'left' : 'center',
        wrapText: j === 2,
      }
      if (isAlt) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_LIGHT_ROW } }
    })
    ws.getRow(rowNum).height = 16
  })

  // Bottom border of last data row
  const lastDataRow = DATA_START + items.length - 1
  tableCols.forEach(c => {
    const cell = ws.getCell(`${c}${lastDataRow}`)
    cell.border = { ...cell.border, bottom: med() }
  })

  // ── Footer (signature section) ──────────────────────────────
  const footerRow = Math.max(lastDataRow + 5, DATA_START + 15)

  const sigCols:  string[] = ['B', 'E', 'H']
  const sigLabels: string[] = ['Requested by,', 'Approved by,', 'Inputted by,']
  const sigNames:  string[] = [requestedBy || '', approvedBy || '', inputtedBy || '']
  const sigRoles:  string[] = ['Sales Executive', 'Store / Duty Manager', 'Admin Store']

  sigCols.forEach((col, i) => {
    const r0 = footerRow
    ws.getCell(`${col}${r0}`).value    = sigLabels[i]
    ws.getCell(`${col}${r0}`).font     = { size: 9, name: 'Calibri' }

    ws.getCell(`${col}${r0 + 1}`).value = `Date : ${date || ''}`
    ws.getCell(`${col}${r0 + 1}`).font  = { size: 9, name: 'Calibri', color: { argb: C_TEXT_DIM } }

    // signature underline
    ws.getCell(`${col}${r0 + 4}`).value  = '___________________________'
    ws.getCell(`${col}${r0 + 4}`).font   = { size: 8, color: { argb: C_GRAY_LINE }, name: 'Calibri' }

    ws.getCell(`${col}${r0 + 5}`).value  = sigNames[i]
    ws.getCell(`${col}${r0 + 5}`).font   = { bold: true, size: 9, name: 'Calibri' }

    ws.getCell(`${col}${r0 + 6}`).value  = sigRoles[i]
    ws.getCell(`${col}${r0 + 6}`).font   = { italic: true, size: 8, color: { argb: C_TEXT_DIM }, name: 'Calibri' }
  })

  // Document code
  ws.getCell(`B${footerRow + 9}`).value  = 'AHI:F-6.1-01 (01) | HCI :F-S3.2-11 (00)'
  ws.getCell(`B${footerRow + 9}`).font   = { size: 7, color: { argb: C_GRAY_LINE }, name: 'Calibri' }

  // ── Generate ────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()

  const safeName = (sofNumber || 'draft').replace(/[^a-zA-Z0-9]/g, '')
  const safeDate = (date || '').replace(/\//g, '')
  const filename = `SOF_${safeDate}_${safeName}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
