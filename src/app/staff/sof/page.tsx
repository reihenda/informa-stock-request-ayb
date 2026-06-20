'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RequestItem {
  _rowNumber: number
  articleCode: string
  articleDesc: string
  brand: string
  category: string
  qtyApproved: string
  salesName: string
  selected: boolean
  stockOnHand: string
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function isoToDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function SOFPage() {
  const router = useRouter()
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // SOF header fields
  const [sofNumber, setSofNumber]     = useState('')
  const [date, setDate]               = useState(todayISO())
  const [planDate, setPlanDate]       = useState('')
  const [supplyingSite, setSupplyingSite] = useState('')
  const [department, setDepartment]   = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [approvedBy, setApprovedBy]   = useState('')
  const [inputtedBy, setInputtedBy]   = useState('')

  useEffect(() => {
    fetch('/api/check-staff-auth')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) router.replace('/staff')
        else setIsAuth(true)
      })
      .catch(() => router.replace('/staff'))
  }, [router])

  useEffect(() => {
    if (!isAuth) return
    fetch('/api/get-requests')
      .then(r => r.json())
      .then(d => {
        const approved = (d.requests || []).filter((r: { status: string }) => r.status === 'APPROVED')
        setItems(approved.map((r: RequestItem) => ({
          ...r,
          selected: false,
          stockOnHand: '0',
        })))
      })
      .catch(() => setError('Gagal memuat data request'))
      .finally(() => setLoading(false))
  }, [isAuth])

  function toggleItem(rowNum: number) {
    setItems(prev => prev.map(r => r._rowNumber === rowNum ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll(sel: boolean) {
    setItems(prev => prev.map(r => ({ ...r, selected: sel })))
  }

  function updateStock(rowNum: number, val: string) {
    setItems(prev => prev.map(r => r._rowNumber === rowNum ? { ...r, stockOnHand: val } : r))
  }

  const selected = items.filter(r => r.selected)
  const totalQty = selected.reduce((sum, r) => sum + (Number(r.qtyApproved) || 0), 0)

  async function handleDownload() {
    if (selected.length === 0) return
    setDownloading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-sof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sofNumber,
          date: isoToDisplay(date),
          planDate: isoToDisplay(planDate),
          supplyingSite,
          department,
          requestedBy,
          approvedBy,
          inputtedBy,
          items: selected.map(r => ({
            articleCode: r.articleCode,
            articleDesc: r.articleDesc,
            qtyApproved: r.qtyApproved,
            stockOnHand: r.stockOnHand,
          })),
        }),
      })
      if (!res.ok) throw new Error('Server error')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const safeDate = isoToDisplay(date).replace(/\//g, '')
      a.href     = url
      a.download = `SOF_${safeDate}_${sofNumber || 'draft'}.ods`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Gagal membuat file SOF. Coba lagi.')
    }
    setDownloading(false)
  }

  // ── Loading / auth ─────────────────────────────────────────
  if (isAuth === null || (isAuth && loading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-4xl animate-spin text-gray-300">↻</span>
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]'

  return (
    <div className="pb-28">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/staff" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 text-lg shadow-sm">
          ←
        </a>
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Create SOF</h1>
          <p className="text-gray-500 text-sm">Store Order Form — pilih request approved untuk dimasukkan</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Step 1: Info SOF ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#1F4E79] mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#1F4E79] text-white text-xs flex items-center justify-center font-bold">1</span>
          Info SOF
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">No. SOF</label>
            <input value={sofNumber} onChange={e => setSofNumber(e.target.value)}
              placeholder="Contoh: 001"
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal SOF</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Plan Received Date</label>
            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplying Site</label>
            <input value={supplyingSite} onChange={e => setSupplyingSite(e.target.value)}
              placeholder="Contoh: H001 WH CIKUPA"
              className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
            <input value={department} onChange={e => setDepartment(e.target.value)}
              placeholder="Contoh: EA"
              className={inputCls} />
          </div>
        </div>

        {/* Signature names */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tanda Tangan <span className="font-normal normal-case text-gray-400">(boleh dikosongkan)</span></p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Requested by</label>
              <input value={requestedBy} onChange={e => setRequestedBy(e.target.value)}
                placeholder="Nama sales"
                className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Sales Executive</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Approved by</label>
              <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                placeholder="Nama manager"
                className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Store / Duty Manager</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inputted by</label>
              <input value={inputtedBy} onChange={e => setInputtedBy(e.target.value)}
                placeholder="Nama staff"
                className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Admin Store</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Step 2: Pilih Artikel ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#1F4E79] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1F4E79] text-white text-xs flex items-center justify-center font-bold">2</span>
            Pilih Artikel
            {selected.length > 0 && (
              <span className="bg-[#2E75B6] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {selected.length} dipilih
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => toggleAll(true)}
              className="text-[#2E75B6] hover:underline font-medium">Semua</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleAll(false)}
              className="text-gray-400 hover:underline">Reset</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <span className="text-3xl animate-spin inline-block">↻</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-medium text-gray-500">Belum ada request yang diapprove</p>
            <a href="/dashboard" className="text-xs text-[#2E75B6] hover:underline mt-2 inline-block">Lihat Dashboard →</a>
          </div>
        ) : (
          <>
            {/* Column labels */}
            <div className="hidden sm:grid sm:grid-cols-[auto_1fr_80px_90px] gap-3 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="w-5" />
              <span>Artikel</span>
              <span className="text-right">Qty OK</span>
              <span className="text-center">Stok Ada</span>
            </div>

            <div className="divide-y divide-gray-50">
              {items.map(r => (
                <div key={r._rowNumber}
                  className={`grid grid-cols-[auto_1fr_80px_90px] gap-3 items-center px-4 py-3.5 transition-colors ${
                    r.selected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                  }`}>

                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => toggleItem(r._rowNumber)}
                    className="w-4 h-4 rounded accent-[#1F4E79] cursor-pointer"
                  />

                  <div className="min-w-0 cursor-pointer" onClick={() => toggleItem(r._rowNumber)}>
                    <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                      {r.articleDesc || r.articleCode}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {[r.articleCode, r.brand, r.category].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-gray-400">{r.salesName}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-[#1F4E79]">{r.qtyApproved}</p>
                    <p className="text-xs text-gray-400">disetujui</p>
                  </div>

                  <div>
                    <input
                      type="number"
                      min={0}
                      value={r.stockOnHand}
                      onChange={e => updateStock(r._rowNumber, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                    />
                    <p className="text-xs text-gray-400 text-center mt-0.5">stok ada</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Sticky download bar ─────────────────────────────────── */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4`}>
        <div className={`rounded-xl shadow-xl border flex items-center justify-between gap-4 px-5 py-4 transition-colors ${
          selected.length > 0 ? 'bg-[#1F4E79] border-[#1F4E79]' : 'bg-white border-gray-200'
        }`}>
          <div>
            {selected.length > 0 ? (
              <>
                <p className="text-sm font-bold text-white">{selected.length} artikel dipilih</p>
                <p className="text-xs text-blue-200">Total qty disetujui: {totalQty} unit</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Pilih artikel untuk membuat SOF</p>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading || selected.length === 0}
            className={`shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-40 ${
              selected.length > 0
                ? 'bg-white text-[#1F4E79] hover:bg-blue-50'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {downloading
              ? <><span className="animate-spin inline-block">↻</span> Membuat...</>
              : <><span>⬇</span> Download SOF</>}
          </button>
        </div>
      </div>
    </div>
  )
}
