'use client'
import { useState, useEffect, useMemo } from 'react'

type StockInfo = {
  ayb:               { unrestricted: number; blocked: number }
  cikupa:            { unrestricted: number; blocked: number }
  lastUpdatedAYB?:   string
  lastUpdatedCikupa?: string
}

type Request = {
  timestamp: string
  salesName: string
  articleCode: string
  articleDesc: string
  qtyRequest: string
  avgSales: string
  qtyApproved: string
  status: string
  alasan: string
  catatan: string
  brand: string
  category: string
  emailStatus: string
}

const statusBadge: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  HOLD:     'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const statusIcon: Record<string, string> = {
  APPROVED: '✓',
  HOLD:     '⏸',
  REJECTED: '✕',
}

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Stock info per article — keyed by articleCode
  const [stockMap, setStockMap]   = useState<Record<string, StockInfo>>({})
  const [stockLoading, setStockLoading] = useState<Record<string, boolean>>({})
  const [expandedStock, setExpandedStock] = useState<Record<string, boolean>>({})

  async function toggleStock(articleCode: string) {
    const next = !expandedStock[articleCode]
    setExpandedStock(prev => ({ ...prev, [articleCode]: next }))
    if (next && !stockMap[articleCode] && !stockLoading[articleCode]) {
      setStockLoading(prev => ({ ...prev, [articleCode]: true }))
      try {
        const res = await fetch(`/api/get-inventory?article=${encodeURIComponent(articleCode)}`)
        const data: StockInfo = await res.json()
        setStockMap(prev => ({ ...prev, [articleCode]: data }))
      } catch { /* silently fail */ }
      setStockLoading(prev => ({ ...prev, [articleCode]: false }))
    }
  }

  async function fetchData() {
    const res = await fetch('/api/get-requests')
    const d = await res.json()
    setRequests(d.requests || [])
    setLastUpdated(new Date())
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try { await fetchData() } catch {}
    setRefreshing(false)
  }

  function resetFilters() {
    setStatusFilter('ALL')
    setBrandFilter('ALL')
    setSearch('')
  }

  const brands = useMemo(() => {
    const b = Array.from(new Set(requests.map(r => r.brand).filter(Boolean)))
    return b.sort()
  }, [requests])

  const approvedCount = useMemo(() => requests.filter(r => r.status === 'APPROVED').length, [requests])
  const holdCount     = useMemo(() => requests.filter(r => r.status === 'HOLD').length, [requests])
  const rejectedCount = useMemo(() => requests.filter(r => r.status === 'REJECTED').length, [requests])

  const filtered = useMemo(() => requests.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.articleDesc?.toLowerCase().includes(q) ||
      r.articleCode?.toLowerCase().includes(q) ||
      r.salesName?.toLowerCase().includes(q) ||
      r.brand?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
    const matchBrand  = brandFilter === 'ALL'  || r.brand === brandFilter
    return matchSearch && matchStatus && matchBrand
  }), [requests, search, statusFilter, brandFilter])

  const hasActiveFilter = statusFilter !== 'ALL' || brandFilter !== 'ALL' || !!search

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {lastUpdated ? `Update terakhir: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Memuat data...'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
        >
          <span className={`text-base ${refreshing ? 'animate-spin inline-block' : ''}`}>↻</span>
          {refreshing ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'Total',    val: requests.length, color: 'text-[#1F4E79]',  bg: 'bg-blue-50',   onClick: () => resetFilters() },
            { label: 'Approved', val: approvedCount,   color: 'text-green-600',  bg: 'bg-green-50',  onClick: () => { setStatusFilter('APPROVED'); setBrandFilter('ALL'); setSearch('') } },
            { label: 'Hold',     val: holdCount,       color: 'text-orange-500', bg: 'bg-orange-50', onClick: () => { setStatusFilter('HOLD'); setBrandFilter('ALL'); setSearch('') } },
            { label: 'Rejected', val: rejectedCount,   color: 'text-red-500',    bg: 'bg-red-50',    onClick: () => { setStatusFilter('REJECTED'); setBrandFilter('ALL'); setSearch('') } },
          ].map(s => (
            <button key={s.label} onClick={s.onClick}
              className={`${s.bg} rounded-xl border border-gray-100 p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2 animate-spin inline-block">↻</p>
          <p className="mt-2">Memuat data...</p>
        </div>
      )}

      {!loading && (
        <div>
          {/* Search */}
          <div className="relative mb-3">
            <input
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6] shadow-sm"
              placeholder="Cari artikel, kode, nama sales, atau brand..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm select-none">🔍</span>
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { key: 'ALL',      label: `Semua (${requests.length})`,      active: 'bg-[#1F4E79] text-white' },
              { key: 'APPROVED', label: `✓ Approved (${approvedCount})`,   active: 'bg-green-600 text-white' },
              { key: 'HOLD',     label: `⏸ Hold (${holdCount})`,           active: 'bg-orange-500 text-white' },
              { key: 'REJECTED', label: `✕ Rejected (${rejectedCount})`,   active: 'bg-red-500 text-white' },
            ].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === f.key ? f.active : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Brand filter */}
          {brands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['ALL', ...brands].map(b => (
                <button key={b} onClick={() => setBrandFilter(b)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    brandFilter === b ? 'bg-[#2E75B6] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {b === 'ALL' ? 'Semua Brand' : b}
                </button>
              ))}
            </div>
          )}

          {/* Filter info */}
          {hasActiveFilter && (
            <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
              <span>Menampilkan <strong className="text-gray-700">{filtered.length}</strong> dari {requests.length} request</span>
              <button onClick={resetFilters} className="text-[#2E75B6] hover:underline">Reset filter</button>
            </div>
          )}

          {/* Cards */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-14 text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm">Tidak ada request yang sesuai filter</p>
                {hasActiveFilter && (
                  <button onClick={resetFilters} className="mt-3 text-xs text-[#2E75B6] hover:underline">Reset filter</button>
                )}
              </div>
            )}
            {filtered.map((r, i) => {
              const isRejected = r.status === 'REJECTED'
              const isHold     = r.status === 'HOLD'
              const isApproved = r.status === 'APPROVED'
              return (
                <div key={i} className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
                  isRejected ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{r.articleDesc || r.articleCode}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[r.articleCode, r.brand, r.category].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-gray-400">{r.timestamp} · <span className="font-medium text-gray-600">{r.salesName}</span></p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusIcon[r.status] || ''} {r.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-500">Request: <strong className="text-gray-700">{r.qtyRequest}</strong></span>
                    <span className="text-gray-500">Avg 3 Bln: <strong className="text-gray-700">{r.avgSales || '—'}</strong></span>
                    <span className="text-gray-500">Disetujui: <strong className={
                      isApproved ? 'text-green-600' : isHold ? 'text-orange-500' : isRejected ? 'text-red-500' : 'text-gray-700'
                    }>{isRejected ? '—' : r.qtyApproved}</strong></span>
                  </div>
                  {isHold && r.alasan && (
                    <p className="text-xs text-orange-600 mt-2 bg-orange-50 rounded px-2.5 py-1.5">⚠ {r.alasan}</p>
                  )}
                  {isApproved && (
                    <div className={`mt-2 rounded-lg px-3 py-1.5 flex items-center gap-1.5 ${
                      r.emailStatus === 'SUDAH' ? 'bg-green-50' : 'bg-blue-50'
                    }`}>
                      <span className="text-sm">{r.emailStatus === 'SUDAH' ? '✅' : '📤'}</span>
                      <p className={`text-xs font-medium ${r.emailStatus === 'SUDAH' ? 'text-green-700' : 'text-blue-600'}`}>
                        {r.emailStatus === 'SUDAH' ? 'Done Email' : 'Menunggu pengiriman email dari staff'}
                      </p>
                    </div>
                  )}
                  {isRejected && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-600 mb-0.5">✕ Request Ditolak oleh Manager</p>
                      {r.catatan
                        ? <p className="text-xs text-red-500">Alasan: {r.catatan}</p>
                        : <p className="text-xs text-red-400 italic">Tidak ada keterangan alasan</p>
                      }
                    </div>
                  )}

                  {/* Cek Stok toggle */}
                  {r.articleCode && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleStock(r.articleCode)}
                        className="flex items-center gap-1.5 text-xs text-[#2E75B6] hover:underline font-medium"
                      >
                        <span>{expandedStock[r.articleCode] ? '▲' : '▼'}</span>
                        {expandedStock[r.articleCode] ? 'Sembunyikan stok' : 'Cek Stok'}
                      </button>

                      {expandedStock[r.articleCode] && (
                        <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden bg-white text-xs">
                          {stockLoading[r.articleCode] ? (
                            <div className="flex items-center gap-2 px-3 py-2.5 text-gray-400">
                              <span className="animate-spin">↻</span> Mengambil data stok...
                            </div>
                          ) : stockMap[r.articleCode] ? (() => {
                            const s = stockMap[r.articleCode]
                            const todayStr = (() => {
                              const d = new Date()
                              return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
                            })()
                            const aybStale    = !s.lastUpdatedAYB?.trim().startsWith(todayStr)
                            const cikupaStale = !s.lastUpdatedCikupa?.trim().startsWith(todayStr)
                            const anyStale    = aybStale || cikupaStale
                            const cikupaEmpty = s.cikupa.unrestricted <= 0 && s.cikupa.blocked <= 0
                            return (
                              <>
                                {[
                                  { label: 'Toko AYB',  data: s.ayb,    ts: s.lastUpdatedAYB,    stale: aybStale    },
                                  { label: 'DC Cikupa', data: s.cikupa, ts: s.lastUpdatedCikupa, stale: cikupaStale },
                                ].map((row, j) => (
                                  <div key={row.label} className={`flex items-center justify-between px-3 py-2 ${j > 0 ? 'border-t border-gray-100' : ''}`}>
                                    <div>
                                      <p className="font-semibold text-gray-600">{row.label}</p>
                                      {row.ts
                                        ? <p className={`mt-0.5 ${row.stale ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                            Update: {row.ts}{row.stale ? ' ⚠' : ''}
                                          </p>
                                        : <p className="text-gray-400 italic mt-0.5">Belum ada timestamp</p>
                                      }
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">
                                        Unres: <strong className={row.data.unrestricted > 0 ? 'text-green-700' : 'text-gray-400'}>{row.data.unrestricted}</strong>
                                      </span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-gray-500">
                                        Blk: <strong className={row.data.blocked > 0 ? 'text-orange-600' : 'text-gray-400'}>{row.data.blocked}</strong>
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {anyStale && (
                                  <div className="border-t border-red-200 bg-red-50 px-3 py-2 flex items-start gap-1.5">
                                    <span className="text-red-500 shrink-0">⚠</span>
                                    <p className="text-red-800">Data inventory belum diupdate hari ini. Minta manager untuk segera update.</p>
                                  </div>
                                )}
                                {!anyStale && cikupaEmpty && (
                                  <div className="border-t border-yellow-200 bg-yellow-50 px-3 py-2 flex items-start gap-1.5">
                                    <span className="text-yellow-500 shrink-0">⚠</span>
                                    <p className="text-yellow-800">Stok DC Cikupa kosong. Cek apakah data stok sudah diupdate.</p>
                                  </div>
                                )}
                              </>
                            )
                          })() : (
                            <p className="px-3 py-2.5 text-gray-400">Gagal mengambil data stok.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
