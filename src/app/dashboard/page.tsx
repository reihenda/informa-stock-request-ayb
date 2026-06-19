'use client'
import { useState, useEffect, useMemo } from 'react'

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
}

type DisplayRequest = {
  timestamp: string
  salesName: string
  articleCode: string
  articleDesc: string
  category: string
  qtyRequest: string
  status: string
  catatanManager: string
}

const statusBadge: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  HOLD:     'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
  PENDING:  'bg-yellow-100 text-yellow-700',
}

const statusIcon: Record<string, string> = {
  APPROVED: '✓',
  HOLD:     '⏸',
  REJECTED: '✕',
  PENDING:  '⏳',
}

export default function Dashboard() {
  const [tab, setTab] = useState<'requests' | 'display'>('requests')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [displayReqs, setDisplayReqs] = useState<DisplayRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchData() {
    const res = await fetch('/api/get-requests')
    const d = await res.json()
    setRequests(d.requests || [])
    setDisplayReqs(d.displayRequests || [])
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

  // Derived data
  const brands = useMemo(() => {
    const b = Array.from(new Set(requests.map(r => r.brand).filter(Boolean)))
    return b.sort()
  }, [requests])

  const approvedCount  = useMemo(() => requests.filter(r => r.status === 'APPROVED').length, [requests])
  const holdCount      = useMemo(() => requests.filter(r => r.status === 'HOLD').length, [requests])
  const rejectedCount  = useMemo(() => requests.filter(r => r.status === 'REJECTED').length, [requests])

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
          <h1 className="text-2xl font-bold text-[#1F4E79]">Dashboard Manager</h1>
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
            { label: 'Total',    val: requests.length, color: 'text-[#1F4E79]',  bg: 'bg-blue-50',   onClick: () => { setTab('requests'); resetFilters() } },
            { label: 'Approved', val: approvedCount,   color: 'text-green-600',  bg: 'bg-green-50',  onClick: () => { setTab('requests'); setStatusFilter('APPROVED'); setBrandFilter('ALL'); setSearch('') } },
            { label: 'Hold',     val: holdCount,       color: 'text-orange-500', bg: 'bg-orange-50', onClick: () => { setTab('requests'); setStatusFilter('HOLD'); setBrandFilter('ALL'); setSearch('') } },
            { label: 'Rejected', val: rejectedCount,   color: 'text-red-500',    bg: 'bg-red-50',    onClick: () => { setTab('requests'); setStatusFilter('REJECTED'); setBrandFilter('ALL'); setSearch('') } },
          ].map(s => (
            <button key={s.label} onClick={s.onClick}
              className={`${s.bg} rounded-xl border border-gray-100 p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['requests', 'display'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); resetFilters() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-[#1F4E79] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {t === 'requests'
              ? `📋 Request Stok (${requests.length})`
              : `🖥 Pengajuan Display (${displayReqs.length})`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2 animate-spin inline-block">↻</p>
          <p className="mt-2">Memuat data...</p>
        </div>
      )}

      {/* ── REQUEST STOK TAB ── */}
      {!loading && tab === 'requests' && (
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
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DISPLAY TAB ── */}
      {!loading && tab === 'display' && (
        <div className="space-y-3">
          {displayReqs.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <p className="text-4xl mb-3">🖥</p>
              <p className="text-sm">Belum ada pengajuan display</p>
            </div>
          )}
          {displayReqs.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{r.articleDesc || r.articleCode}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{[r.articleCode, r.category].filter(Boolean).join(' · ')}</p>
                  <p className="text-xs text-gray-400">{r.timestamp} · <span className="font-medium text-gray-600">{r.salesName}</span></p>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[r.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusIcon[r.status] || ''} {r.status}
                </span>
              </div>
              <div className="flex gap-4 text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-500">Qty: <strong className="text-gray-700">{r.qtyRequest}</strong></span>
              </div>
              {r.catatanManager && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 rounded px-2.5 py-1.5">💬 {r.catatanManager}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
