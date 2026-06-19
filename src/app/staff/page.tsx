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
  emailStatus: string
  _rowNumber: number
}

export default function StaffPage() {
  // Auth
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Data
  const [requests, setRequests] = useState<Request[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filter
  const [emailFilter, setEmailFilter] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL')
  const [search, setSearch] = useState('')

  // Action
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/check-staff-auth')
      .then(r => r.json())
      .then(d => setIsAuth(d.authenticated))
      .catch(() => setIsAuth(false))
  }, [])

  useEffect(() => {
    if (isAuth) fetchData()
  }, [isAuth])

  async function fetchData() {
    setDataLoading(true)
    try {
      const res = await fetch('/api/get-requests')
      const d = await res.json()
      // Hanya tampilkan yang APPROVED
      const approved = (d.requests || []).filter((r: Request) => r.status === 'APPROVED')
      setRequests(approved)
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
      const res = await fetch('/api/staff-login', {
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
    await fetch('/api/staff-logout', { method: 'POST' })
    setIsAuth(false)
    setRequests([])
    setPassword('')
  }

  async function handleToggleEmail(rowNumber: number, currentStatus: string) {
    const newStatus = currentStatus === 'SUDAH' ? 'BELUM' : 'SUDAH'
    setActionLoading(rowNumber)
    try {
      const res = await fetch('/api/update-email-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber, emailStatus: newStatus }),
      })
      if (res.ok) {
        showToast(
          newStatus === 'SUDAH' ? '✓ Done Email' : 'Dikembalikan ke Belum Email',
          'success'
        )
        // Update local state langsung tanpa fetch ulang
        setRequests(prev => prev.map(r =>
          r._rowNumber === rowNumber ? { ...r, emailStatus: newStatus } : r
        ))
      } else {
        showToast('Gagal mengupdate status', 'error')
      }
    } catch {
      showToast('Koneksi error', 'error')
    }
    setActionLoading(null)
  }

  // Derived
  const belumCount = useMemo(() => requests.filter(r => r.emailStatus !== 'SUDAH').length, [requests])
  const sudahCount = useMemo(() => requests.filter(r => r.emailStatus === 'SUDAH').length, [requests])

  const filtered = useMemo(() => requests.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.articleDesc?.toLowerCase().includes(q) ||
      r.articleCode?.toLowerCase().includes(q) ||
      r.salesName?.toLowerCase().includes(q)
    const matchEmail =
      emailFilter === 'ALL' ? true :
      emailFilter === 'SUDAH' ? r.emailStatus === 'SUDAH' :
      r.emailStatus !== 'SUDAH'  // BELUM = semua yang bukan SUDAH
    return matchSearch && matchEmail
  }), [requests, search, emailFilter])

  // ── Loading ──
  if (isAuth === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-4xl animate-spin text-gray-300">↻</span>
      </div>
    )
  }

  // ── Login ──
  if (!isAuth) {
    return (
      <div className="max-w-sm mx-auto mt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#2E75B6] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-2xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Staff Area</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola pengiriman email request yang sudah approved</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Staff</label>
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
            className="w-full bg-[#2E75B6] hover:bg-[#1F4E79] text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

  // ── Staff Dashboard ──
  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-[#1F4E79]">Staff Dashboard</h1>
            <span className="text-xs bg-[#2E75B6] text-white px-2 py-0.5 rounded-full">STAFF</span>
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Approved', val: requests.length,  color: 'text-[#1F4E79]',  bg: 'bg-blue-50',  key: 'ALL' },
          { label: 'Belum Email', val: belumCount,        color: 'text-orange-500', bg: 'bg-orange-50', key: 'BELUM' },
          { label: 'Done Email',  val: sudahCount,        color: 'text-green-600',  bg: 'bg-green-50', key: 'SUDAH' },
        ].map(s => (
          <button key={s.key} onClick={() => setEmailFilter(s.key as 'ALL' | 'BELUM' | 'SUDAH')}
            className={`${s.bg} rounded-xl border border-gray-100 p-3 text-center shadow-sm hover:shadow-md transition-all`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {requests.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress Pengiriman Email</span>
            <span className="font-medium">{sudahCount}/{requests.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${requests.length > 0 ? (sudahCount / requests.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {requests.length > 0
              ? `${Math.round((sudahCount / requests.length) * 100)}% selesai`
              : 'Belum ada data'}
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { key: 'ALL',   label: `Semua (${requests.length})`,   active: 'bg-[#1F4E79] text-white' },
          { key: 'BELUM', label: `📤 Belum Email (${belumCount})`, active: 'bg-orange-500 text-white' },
          { key: 'SUDAH', label: `✓ Done Email (${sudahCount})`,   active: 'bg-green-600 text-white' },
        ].map(f => (
          <button key={f.key} onClick={() => setEmailFilter(f.key as 'ALL' | 'BELUM' | 'SUDAH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              emailFilter === f.key ? f.active : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6] shadow-sm"
          placeholder="Cari artikel, kode, atau nama sales..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        )}
      </div>

      {/* Loading */}
      {dataLoading && (
        <div className="text-center py-14 text-gray-400">
          <span className="text-3xl animate-spin inline-block">↻</span>
          <p className="mt-2 text-sm">Memuat data...</p>
        </div>
      )}

      {/* Cards */}
      {!dataLoading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <p className="text-4xl mb-3">{emailFilter === 'SUDAH' ? '🎉' : '📭'}</p>
              <p className="text-sm font-medium text-gray-600">
                {emailFilter === 'SUDAH' ? 'Belum ada yang dikirim' : emailFilter === 'BELUM' ? 'Semua email sudah dikirim!' : 'Belum ada request yang diapprove'}
              </p>
            </div>
          )}

          {filtered.map((r) => {
            const isSudah = r.emailStatus === 'SUDAH'
            const isLoading = actionLoading === r._rowNumber
            return (
              <div key={r._rowNumber} className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
                isSudah ? 'border-green-200' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.articleDesc || r.articleCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[r.articleCode, r.brand, r.category].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-gray-400">{r.timestamp} · <span className="font-medium text-gray-600">{r.salesName}</span></p>
                  </div>
                  {/* Email status badge */}
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                    isSudah ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {isSudah ? '✓ Done Email' : '📤 Belum Email'}
                  </span>
                </div>

                {/* Qty info */}
                <div className="flex gap-4 text-xs bg-gray-50 rounded-lg px-3 py-2 my-3">
                  <span className="text-gray-500">Qty: <strong className="text-gray-700">{r.qtyApproved}</strong></span>
                  <span className="text-gray-500">Dari: <strong className="text-gray-700">{r.qtyRequest}</strong></span>
                  <span className="text-gray-500">Avg 3 Bln: <strong className="text-gray-700">{r.avgSales || '—'}</strong></span>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => handleToggleEmail(r._rowNumber, r.emailStatus)}
                  disabled={isLoading}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isSudah
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isLoading
                    ? <><span className="animate-spin">↻</span> Menyimpan...</>
                    : isSudah
                      ? '↩ Belum Email'
                      : '✓ Done Email'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
