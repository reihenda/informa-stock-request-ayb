import { NextRequest, NextResponse } from 'next/server'
import { getSheets, SPREADSHEET_ID, SHEETS } from '@/lib/sheets'

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
    // Kolom baru: A=ArticleNumber, B=Description, C=Department, D=Commodity,
    //             E=Class, F=ArticleHierarchy, G=Brand, H=Display(yes/no), I=AvgSales
    const masterRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.MASTER}!A3:I`,
    })

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

    const artCode        = article[0] || ''
    const artDesc        = article[1] || ''
    const department     = article[2] || ''
    const commodity      = article[3] || ''
    const artClass       = article[4] || ''
    const brand          = article[6] || ''
    const hasDisplay     = article[7] || ''
    const avgSalesSheet  = parseFloat(article[8] || '0') || 0

    // Gunakan Commodity sebagai category (lebih spesifik), fallback ke Department
    const category = commodity || department

    const hasDisplayBool = hasDisplay.toString().toLowerCase() === 'yes'

    // ── 2. Tidak ada display → pengajuan display ───────────
    if (!hasDisplayBool) {
      return NextResponse.json({
        status: 'NO_DISPLAY',
        article: { code: artCode, desc: artDesc, category, brand, department, artClass },
        qty,
        salesName,
        message: `Artikel ini belum ada display. Silakan ajukan permintaan display terlebih dahulu.`,
      })
    }

    // ── 3. Hitung avg penjualan dari Sales Data sheet ──────
    const salesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.SALES}!A3:E`,
    })

    const salesRows = salesRes.data.values || []
    const articleSales = salesRows
      .filter((row) => row[0]?.toString().toLowerCase() === artCode.toLowerCase())
      .map((row) => parseInt(row[4]) || 0)

    const last3 = articleSales.slice(-3)
    // Gunakan avg dari sales sheet; jika tidak ada data, fallback ke kolom I master
    const avgSales = last3.length > 0
      ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length)
      : avgSalesSheet

    // ── 4. Tentukan status ─────────────────────────────────
    const qtyNum = parseInt(qty)
    const isHold = qtyNum > avgSales
    const approvedQty = isHold ? avgSales : qtyNum

    return NextResponse.json({
      status: isHold ? 'HOLD' : 'APPROVED',
      article: { code: artCode, desc: artDesc, category, brand, department, artClass },
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
