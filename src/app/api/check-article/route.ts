import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS, withRetry } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { articleCode, articleDesc, qty, salesName } = await req.json()

    if (!articleCode && !articleDesc) {
      return NextResponse.json({ error: 'Article code atau description wajib diisi' }, { status: 400 })
    }
    if (!qty || qty <= 0) {
      return NextResponse.json({ error: 'Qty harus lebih dari 0' }, { status: 400 })
    }

    const sheets = await getSheets()

    // ── 1. Ambil data Master Article ──────────────────────
    // A=ArticleNumber, B=Description, C=Brand, D=Department, E=Commodity, F=AvgSales3Bln
    const masterRes = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.MASTER}!A3:F`,
    }))

    const masterRows = masterRes.data.values || []

    const article = masterRows.find((row) => {
      const code = (row[0] || '').toString().toLowerCase()
      const desc = (row[1] || '').toString().toLowerCase()
      return (
        code === articleCode?.toLowerCase() ||
        (articleDesc && desc.includes(articleDesc.toLowerCase()))
      )
    })

    if (!article) {
      return NextResponse.json({
        status: 'NOT_FOUND',
        message: `Artikel "${articleCode || articleDesc}" tidak ditemukan di master data.`,
      })
    }

    const artCode       = article[0] || ''
    const artDesc       = article[1] || ''
    const brand         = article[2] || ''
    const department    = article[3] || ''
    const commodity     = article[4] || ''
    const avgSalesSheet = parseFloat(article[5] || '0') || 0

    const category = commodity || department

    // ── 2. Hitung avg penjualan dari Sales Data sheet ──────
    const salesRes = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.SALES}!A3:E`,
    }))

    const salesRows = salesRes.data.values || []
    const articleSales = salesRows
      .filter((row) => row[0]?.toString().toLowerCase() === artCode.toLowerCase())
      .map((row) => parseInt(row[4]) || 0)

    const last3 = articleSales.slice(-3)
    const avgSales = last3.length > 0
      ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length)
      : avgSalesSheet

    // ── 3. Tentukan status ─────────────────────────────────
    const qtyNum = parseInt(qty)
    const isHold = qtyNum > avgSales
    const approvedQty = isHold ? avgSales : qtyNum

    return NextResponse.json({
      status: isHold ? 'HOLD' : 'APPROVED',
      article: { code: artCode, desc: artDesc, category, brand, department },
      qty: qtyNum,
      avgSales,
      approvedQty,
      salesName,
      message: isHold
        ? `Qty request (${qtyNum}) melebihi rata-rata penjualan (${avgSales}). Qty di-hold menjadi ${approvedQty} unit.`
        : `Request disetujui. Qty ${approvedQty} unit dapat diproses.`,
    })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[check-article]', e?.message)
    return NextResponse.json({ error: 'Gagal mengecek artikel. Coba lagi.' }, { status: 500 })
  }
}
