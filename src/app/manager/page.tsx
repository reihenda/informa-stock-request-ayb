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
  _rowNumber: number
}

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  HOLD:     'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
}
const STATUS_ICON: Record<string, string> = {
  APPROVED: '✓',
  HOLD:     '⏸',
  REJECTED: '✕',
}

export default function ManagerPage() {
  // Auth state
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Data state
  const [requests, setRequests] = useState<Request[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [tab, setTab] = useState<'hold' | 'all'>('hold')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Action state
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<{ rowNumber: number; desc: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [approveModal, setApproveModal] = useState<{ rowNumber: number; desc: string; defaultQty: string } | null>(null)
  const [approveQty, setApproveQty] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filter state (tab "all")
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')

  // Check auth on mount
  useEffect(() => {
    fetch('/api/check-manager-auth')
      .then(r => r.json())
      .then(d => setIsAuth(d.authenticated))
      .catch(() => setIsAuth(false))
  }, [])

  // Fetch data saat sudah auth
  useEffect(() => {
    if (isAuth) fetchData()
  }, [isAuth])

  async function fetchData() {
    setDataLoading(true)
    try {
      const res = await fetch('/api/get-requests')
      const d = await res.json()
      setRequests(d.requests || [])
      setLastUpdated(new Date())
    } catch {}
    setDataLoading(false)
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/manager-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Login gagal')
      } else {
        setIsAuth(true)
      }
    } catch {
      setLoginError('Koneksi error. Coba lagi.')
    }
    setLoginLoading(false)
  }

  async function handleLogout() {
    await fetch('/api/manager-logout', { method: 'POST' })
    setIsAuth(false)
    setRequests([])
    setPassword('')
  }

  async function handleUpdateStatus(rowNumber: number, newStatus: 'APPROVED' | 'REJECTED', catatan = '', qtyApproved?: string) {
    setActionLoading(rowNumber)
    try {
      const res = await fetch('/api/update-request-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber, newStatus, catatan, qtyApproved }),
      })
      if (res.ok) {
        showToast(`Request berhasil di-${newStatus === 'APPROVED' ? 'approve' : 'reject'}`, 'success')
        await fetchData()
      } else {
        showToast('Gagal mengupdate status', 'error')
      }
    } catch {
      showToast('Koneksi error', 'error')
    }
    setActionLoading(null)
    setRejectModal(null)
    setRejectNote('')
    setApproveModal(null)
    setApproveQty('')
  }

  // Derived
  const holdRequests = useMemo(() => requests.filter(r => r.status === 'HOLD'), [requests])
  const approvedCount = useMemo(() => requests.filter(r => r.status === 'APPROVED').length, [requests])
  const rejectedCount = useMemo(() => requests.filter(r => r.status === 'REJECTED').length, [requests])

  const filteredAll = useMemo(() => requests.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.articleDesc?.toLowerCase().includes(q) ||
      r.articleCode?.toLowerCase().includes(q) ||
      r.salesName?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus
    return matchSearch && matchStatus
  }), [requests, search, filterStatus])

  // ── Loading auth check ──
  if (isAuth === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-4xl animate-spin text-gray-300">↻</span>
      </div>
    )
  }

  // ── Login Form ──
  if (!isAuth) {
    return (
      <div className="max-w-sm mx-auto mt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1F4E79] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Manager Area</h1>
          <p className="text-gray-500 text-sm mt-1">Masuk untuk mengelola request stok</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Manager</label>
            <input
              type="password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {loginError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-[#1F4E79] hover:bg-[#2E75B6] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginLoading ? <><span className="animate-spin">↻</span> Masuk...</> : 'Masuk →'}
          </button>
        </form>

        <p className="text-center mt-5">
          <a href="/" className="text-sm text-gray-400 hover:text-[#2E75B6] transition-colors">← Kembali ke Form Sales</a>
        </p>
      </div>
    )
  }

  // ── Manager Dashboard ──
  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-[#1F4E79]">Manager Dashboard</h1>
            <span className="text-xs bg-[#1F4E79] text-white px-2 py-0.5 rounded-full">MANAGER</span>
          </div>
          <p className="text-gray-500 text-sm">
            {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Memuat...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={dataLoading}
            className="text-sm text-gray-600 border border-gray-200 bg-white w-9 h-9 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
          >
            <span className={`text-base ${dataLoading ? 'animate-spin' : ''}`}>↻</span>
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 border border-red-200 bg-white px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Pareto shortcut */}
      <a href="/manager/pareto"
        className="flex items-center justify-between w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 py-4 mb-5 shadow-sm transition-colors group">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold text-sm">Pareto Analysis</p>
            <p className="text-xs text-purple-200">Monitor artikel prioritas yang perlu restock di toko</p>
          </div>
        </div>
        <span className="text-purple-200 group-hover:text-white transition-colors text-lg">→</span>
      </a>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Total',        val: requests.length,  color: 'text-[#1F4E79]', bg: 'bg-blue-50',   border: 'border-blue-100',   onClick: () => { setTab('all'); setFilterStatus('ALL'); setSearch('') } },
          { label: 'Perlu Review', val: holdRequests.length, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', onClick: () => setTab('hold') },
          { label: 'Approved',     val: approvedCount,    color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-100',  onClick: () => { setTab('all'); setFilterStatus('APPROVED'); setSearch('') } },
          { label: 'Rejected',     val: rejectedCount,    color: 'text-red-500',   bg: 'bg-red-50',    border: 'border-red-100',    onClick: () => { setTab('all'); setFilterStatus('REJECTED'); setSearch('') } },
        ].map(s => (
          <button key={s.label} onClick={s.onClick}
            className={`${s.bg} border ${s.border} rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all cursor-pointer`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('hold')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'hold' ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          ⏸ Perlu Review
          {holdRequests.length > 0 && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === 'hold' ? 'bg-white/30' : 'bg-orange-100 text-orange-600'}`}>
              {holdRequests.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all' ? 'bg-[#1F4E79] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}>
          📋 Semua Request ({requests.length})
        </button>
      </div>

      {dataLoading && (
        <div className="text-center py-14 text-gray-400">
          <span className="text-3xl animate-spin inline-block">↻</span>
          <p className="mt-2 text-sm">Memuat data...</p>
        </div>
      )}

      {/* ── TAB: PERLU REVIEW ── */}
      {!dataLoading && tab === 'hold' && (
        <div className="space-y-4">
          {holdRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">✅</p>
              <p className="font-medium text-gray-600">Semua request sudah diproses!</p>
              <p className="text-sm mt-1">Tidak ada yang perlu di-review saat ini</p>
            </div>
          ) : (
            holdRequests.map((r) => (
              <div key={r._rowNumber} className="bg-white rounded-xl border-2 border-orange-300 p-5 shadow-sm">
                {/* Info artikel */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-base">{r.articleDesc || r.articleCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[r.articleCode, r.brand, r.category].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.timestamp} · <span className="font-semibold text-gray-600">{r.salesName}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">⏸ HOLD</span>
                </div>

                {/* Qty info */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Qty Request', val: r.qtyRequest, color: 'text-gray-700' },
                    { label: 'Avg 3 Bulan', val: r.avgSales || '—', color: 'text-gray-700' },
                    { label: 'Di-hold ke', val: r.qtyApproved, color: 'text-orange-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-orange-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {r.alasan && (
                  <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-3">⚠ {r.alasan}</p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setApproveModal({ rowNumber: r._rowNumber, desc: r.articleDesc || r.articleCode, defaultQty: r.qtyApproved }); setApproveQty(r.qtyApproved) }}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === r._rowNumber ? <span className="animate-spin">↻</span> : '✓'} Approve
                  </button>
                  <button
                    onClick={() => { setRejectModal({ rowNumber: r._rowNumber, desc: r.articleDesc || r.articleCode }); setRejectNote('') }}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: SEMUA REQUEST ── */}
      {!dataLoading && tab === 'all' && (
        <div>
          {/* Search & filter */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <input
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6] shadow-sm"
                placeholder="Cari artikel, kode, atau sales..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              )}
            </div>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6] shadow-sm text-gray-600"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="APPROVED">✓ Approved</option>
              <option value="HOLD">⏸ Hold</option>
              <option value="REJECTED">✕ Rejected</option>
            </select>
          </div>

          {(filterStatus !== 'ALL' || search) && (
            <p className="text-xs text-gray-500 mb-3">
              Menampilkan <strong>{filteredAll.length}</strong> dari {requests.length} request
            </p>
          )}

          <div className="space-y-3">
            {filteredAll.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">Tidak ada data yang sesuai</p>
              </div>
            )}
            {filteredAll.map((r) => (
              <div key={r._rowNumber} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.articleDesc || r.articleCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[r.articleCode, r.brand, r.category].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-gray-400">{r.timestamp} · <span className="font-medium text-gray-600">{r.salesName}</span></p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_ICON[r.status] || ''} {r.status}
                  </span>
                </div>
                <div className="flex gap-4 text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500">Req: <strong className="text-gray-700">{r.qtyRequest}</strong></span>
                  <span className="text-gray-500">Avg: <strong className="text-gray-700">{r.avgSales || '—'}</strong></span>
                  <span className="text-gray-500">Disetujui: <strong className={
                    r.status === 'APPROVED' ? 'text-green-600' : r.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
                  }>{r.qtyApproved}</strong></span>
                </div>
                {r.alasan && <p className="text-xs text-orange-600 mt-2 bg-orange-50 rounded px-2.5 py-1.5">⚠ {r.alasan}</p>}
                {r.catatan && <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded px-2.5 py-1.5">💬 {r.catatan}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-1">Konfirmasi Approve</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{approveModal.desc}</p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Qty yang Disetujui
                </label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="Masukkan qty yang disetujui..."
                  value={approveQty}
                  onChange={e => setApproveQty(e.target.value)}
                />
                {approveModal.defaultQty && approveQty !== approveModal.defaultQty && (
                  <p className="text-xs text-orange-500 mt-1.5">
                    Qty awal dari sistem: <strong>{approveModal.defaultQty}</strong>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setApproveModal(null); setApproveQty('') }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleUpdateStatus(approveModal.rowNumber, 'APPROVED', '', approveQty)}
                  disabled={actionLoading !== null || !approveQty || Number(approveQty) <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading !== null ? '...' : '✓ Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-1">Konfirmasi Reject</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{rejectModal.desc}</p>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Alasan Penolakan <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  rows={3}
                  placeholder="Contoh: Stok masih mencukupi, qty terlalu besar..."
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setRejectModal(null); setRejectNote('') }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleUpdateStatus(rejectModal.rowNumber, 'REJECTED', rejectNote)}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {actionLoading !== null ? '...' : '✕ Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
