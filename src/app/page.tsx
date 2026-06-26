'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type CheckResult = {
  status: 'APPROVED' | 'HOLD' | 'NOT_FOUND'
  message: string
  article?: { code: string; desc: string; category: string; brand: string; department?: string; artClass?: string }
  qty?: number
  avgSales?: number
  approvedQty?: number
  salesName?: string
}

type Suggestion = {
  code: string
  desc: string
  department: string
  commodity: string
  brand: string
}

type StockInfo = {
  ayb:    { unrestricted: number; blocked: number }
  cikupa: { unrestricted: number; blocked: number }
}

function StockPanel({ stock }: { stock: StockInfo }) {
  const cikupaEmpty = stock.cikupa.unrestricted <= 0 && stock.cikupa.blocked <= 0

  function StockRow({ label, data }: { label: string; data: { unrestricted: number; blocked: number } }) {
    return (
      <div className="flex items-center justify-between py-2 px-3">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            Unrestricted: <strong className={data.unrestricted > 0 ? 'text-green-700' : 'text-gray-400'}>{data.unrestricted}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Blocked: <strong className={data.blocked > 0 ? 'text-orange-600' : 'text-gray-400'}>{data.blocked}</strong>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Info Stok Saat Ini</span>
      </div>
      <StockRow label="Toko AYB" data={stock.ayb} />
      <div className="border-t border-gray-100" />
      <StockRow label="DC Cikupa" data={stock.cikupa} />
      {cikupaEmpty && (
        <div className="border-t border-yellow-200 bg-yellow-50 px-3 py-2.5 flex items-start gap-2">
          <span className="text-yellow-500 mt-0.5 shrink-0">⚠</span>
          <p className="text-xs text-yellow-800">
            <strong>Stok DC Cikupa saat ini kosong.</strong> Pastikan manager sudah mengupdate data stok sebelum melanjutkan request ini.
          </p>
        </div>
      )}
    </div>
  )
}

const statusConfig = {
  APPROVED:  { border: 'border-green-400',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800',   label: 'APPROVED',        icon: '✓' },
  HOLD:      { border: 'border-orange-400', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800', label: 'HOLD',            icon: '⏸' },
  NOT_FOUND: { border: 'border-red-300',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',       label: 'TIDAK DITEMUKAN', icon: '✕' },
}

export default function Home() {
  const [form, setForm] = useState({ salesName: '', articleCode: '', articleDesc: '', qty: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Inventory stock state
  const [stock, setStock] = useState<StockInfo | null>(null)
  const [stockLoading, setStockLoading] = useState(false)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchArticles = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search-articles?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data.results || [])
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } catch {
      setSuggestions([])
    }
    setSearchLoading(false)
  }, [])

  function handleSearchInput(value: string) {
    setForm(f => ({ ...f, articleDesc: value, articleCode: '' }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchArticles(value), 300)
  }

  async function handleSelectSuggestion(s: Suggestion) {
    setForm(f => ({ ...f, articleCode: s.code, articleDesc: s.desc }))
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    // Fetch inventory for selected article
    setStock(null)
    setStockLoading(true)
    try {
      const res = await fetch(`/api/get-inventory?article=${encodeURIComponent(s.code)}`)
      const data = await res.json()
      if (!data.error) setStock(data)
    } catch { /* non-critical, silently fail */ }
    setStockLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectSuggestion(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  function highlightMatch(text: string, query: string) {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-gray-900 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    if (!form.articleCode && !form.articleDesc) {
      alert('Isi Article Code atau Nama Artikel terlebih dahulu.')
      return
    }
    setLoading(true)
    setResult(null)
    setSubmitted(false)
    setShowSuggestions(false)
    try {
      const res = await fetch('/api/check-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qty: parseInt(form.qty) }),
      })
      const data = await res.json()
      if (data.error) {
        setResult({ status: 'NOT_FOUND', message: data.error })
      } else {
        setResult({ ...data, salesName: form.salesName })
      }
    } catch {
      setResult({ status: 'NOT_FOUND', message: 'Koneksi error. Periksa jaringan dan coba lagi.' })
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (!result) return
    setLoading(true)
    const endpoint = '/api/submit-request'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setResult(prev => prev ? { ...prev, message: data.error || 'Gagal menyimpan. Coba lagi.' } : prev)
      } else {
        setSubmitMsg(data.message || 'Berhasil disimpan.')
        setSubmitted(true)
      }
    } catch {
      setResult(prev => prev ? { ...prev, message: 'Koneksi error. Coba lagi.' } : prev)
    }
    setLoading(false)
  }

  function reset() {
    setForm(f => ({ salesName: f.salesName, articleCode: '', articleDesc: '', qty: '' }))
    setResult(null)
    setSubmitted(false)
    setSubmitMsg('')
    setSuggestions([])
    setShowSuggestions(false)
    setStock(null)
  }

  const cfg = result ? statusConfig[result.status] : null

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#1F4E79]">Form Request Stok</h1>
        <a href="/dashboard" className="text-xs text-[#2E75B6] hover:underline mt-1">Lihat Dashboard →</a>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Input artikel yang ingin di-request. Sistem akan otomatis mengecek ketersediaan display dan rata-rata penjualan.
      </p>

      {/* ── Form ── */}
      {!result && !submitted && (
        <form onSubmit={handleCheck} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">

          {/* Nama Sales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Sales <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
              placeholder="Nama lengkap"
              value={form.salesName}
              onChange={e => setForm({ ...form, salesName: e.target.value })}
            />
          </div>

          {/* Cari Artikel — autocomplete */}
          <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Artikel <span className="text-gray-400 font-normal">(nama atau kode)</span>
            </label>
            <div className="relative">
              <input
                className="w-full border border-gray-300 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                placeholder="Ketik nama atau nomor artikel..."
                value={form.articleDesc || form.articleCode}
                onChange={e => handleSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                autoComplete="off"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm select-none">🔍</span>
              {searchLoading && (
                <span className="absolute right-3 top-2.5 text-gray-400 text-sm animate-spin">↻</span>
              )}
              {(form.articleDesc || form.articleCode) && !searchLoading && (
                <button type="button"
                  onClick={() => { setForm(f => ({ ...f, articleCode: '', articleDesc: '' })); setSuggestions([]); setShowSuggestions(false) }}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={s.code}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s) }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0 ${
                      selectedIndex === i ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight">
                        {highlightMatch(s.desc, form.articleDesc)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {highlightMatch(s.code.toString(), form.articleDesc || form.articleCode)}
                        {s.brand && ` · ${s.brand}`}
                        {s.commodity && ` · ${s.commodity}`}
                      </p>
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex items-center gap-1">
                  <span className="font-mono">↑↓</span> navigasi · <span className="font-mono">Enter</span> pilih · <span className="font-mono">Esc</span> tutup
                </div>
              </div>
            )}

            {/* No results */}
            {showSuggestions && suggestions.length === 0 && !searchLoading && (form.articleDesc?.length ?? 0) >= 2 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
                Tidak ditemukan. Coba kata kunci lain.
              </div>
            )}

            {/* Selected article chip */}
            {form.articleCode && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                <span className="text-blue-400">✓</span>
                <span className="font-medium text-blue-700">{form.articleCode}</span>
                <span className="text-blue-500">—</span>
                <span className="text-blue-600 truncate">{form.articleDesc}</span>
              </div>
            )}

            {/* Stock info panel */}
            {form.articleCode && (stockLoading || stock) && (
              <div className="mt-3">
                {stockLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                    <span className="animate-spin text-base">↻</span> Mengambil data stok...
                  </div>
                ) : stock && (
                  <StockPanel stock={stock} />
                )}
              </div>
            )}
          </div>

          {/* Qty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qty yang Diminta <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
              placeholder="Contoh: 3"
              value={form.qty}
              onChange={e => setForm({ ...form, qty: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1F4E79] hover:bg-[#2E75B6] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="animate-spin">↻</span> Mengecek...</>
              : 'Request Stock →'}
          </button>
        </form>
      )}

      {/* ── Result card ── */}
      {result && !submitted && cfg && (
        <div className={`bg-white rounded-xl border-2 ${cfg.border} ${cfg.bg} p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">
              ← Input ulang
            </button>
          </div>

          {result.article && (
            <div className="mb-4 bg-white/70 rounded-lg p-3 border border-white space-y-0.5">
              <p className="font-semibold text-gray-800 text-base">{result.article.desc}</p>
              <p className="text-xs text-gray-500">
                {[result.article.code, result.article.brand, result.article.category].filter(Boolean).join(' · ')}
              </p>
              {result.article.department && (
                <p className="text-xs text-gray-400">Dept: {result.article.department}</p>
              )}
            </div>
          )}

          {(result.status === 'APPROVED' || result.status === 'HOLD') && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Qty Request',  val: result.qty,         highlight: false },
                { label: 'Avg 3 Bulan', val: result.avgSales,    highlight: false },
                { label: 'Qty Disetujui', val: result.approvedQty, highlight: true },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-lg p-3 text-center border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.highlight
                    ? (result.status === 'APPROVED' ? 'text-green-600' : 'text-orange-500')
                    : 'text-[#1F4E79]'}`}>
                    {item.val}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-700 mb-5 leading-relaxed">{result.message}</p>

          {result.status !== 'NOT_FOUND' && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#1F4E79] hover:bg-[#2E75B6] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="animate-spin">↻</span> Menyimpan...</>
                : 'Konfirmasi & Simpan Request →'}
            </button>
          )}
        </div>
      )}

      {/* ── Success ── */}
      {submitted && (
        <div className="bg-white rounded-xl border-2 border-green-400 bg-green-50 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <p className="font-bold text-green-800 text-lg mb-1">Request Berhasil Dikirim!</p>
          <p className="text-green-700 text-sm mb-6">{submitMsg}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="bg-[#1F4E79] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#2E75B6] transition-colors"
            >
              Request Lagi
            </button>
            <a href="/dashboard"
              className="bg-white border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Lihat Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
