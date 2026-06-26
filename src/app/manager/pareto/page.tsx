'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type ParetoItem = {
  articleCode:  string
  articleDesc:  string
  brand:        string
  dept:         string
  commodity:    string
  pareto:       string
  isPriority:   boolean
  isExcluded:   boolean
  needsRestock: boolean
  aybStock:     number
  cikupaStock:  number
  soldQty:      number
  soldValue:    number
}

type Filter = 'ALL' | 'PRIORITY' | 'RESTOCK'

const PARETO_COLOR: Record<string, string> = {
  AA: 'bg-purple-100 text-purple-800 border-purple-200',
  AB: 'bg-blue-100 text-blue-800 border-blue-200',
  AC: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  BA: 'bg-green-100 text-green-800 border-green-200',
  BB: 'bg-lime-100 text-lime-800 border-lime-200',
  CA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

function fmtIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
function fmtQty(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

export default function ParetoPage() {
  const router = useRouter()
  const [isAuth, setIsAuth]   = useState<boolean | null>(null)
  const [items, setItems]     = useState<ParetoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('RESTOCK')
  const [managerName, setManagerName] = useState('')
  const [reqMap, setReqMap]   = useState<Record<string, { qty: string; loading: boolean; done: boolean; error: string }>>({})

  useEffect(() => {
    fetch('/api/check-manager-auth')
      .then(r => r.json())
      .then(d => { if (!d.authenticated) router.replace('/manager'); else setIsAuth(true) })
      .catch(() => router.replace('/manager'))
  }, [router])

  useEffect(() => {
    if (!isAuth) return
    fetch('/api/get-pareto')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setItems(d.results || []) })
      .catch(() => setError('Gagal memuat data Pareto'))
      .finally(() => setLoading(false))
  }, [isAuth])

  const filtered = useMemo(() => {
    let list = items
    if (filter === 'PRIORITY') list = list.filter(i => i.isPriority)
    if (filter === 'RESTOCK')  list = list.filter(i => i.needsRestock)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.articleCode.toLowerCase().includes(q) ||
        i.articleDesc.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q) ||
        i.commodity.toLowerCase().includes(q) ||
        i.dept.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (a.needsRestock !== b.needsRestock) return a.needsRestock ? -1 : 1
      if (a.isPriority   !== b.isPriority)   return a.isPriority   ? -1 : 1
      return a.pareto.localeCompare(b.pareto)
    })
  }, [items, filter, search])

  const restockCount  = useMemo(() => items.filter(i => i.needsRestock).length, [items])
  const priorityCount = useMemo(() => items.filter(i => i.isPriority).length,   [items])

  function openReq(code: string) {
    setReqMap(prev => ({ ...prev, [code]: prev[code] ?? { qty: '1', loading: false, done: false, error: '' } }))
  }
  function cancelReq(code: string) {
    setReqMap(prev => { const n = { ...prev }; delete n[code]; return n })
  }
  function updateQty(code: string, qty: string) {
    setReqMap(prev => ({ ...prev, [code]: { ...prev[code], qty } }))
  }
  async function submitReq(item: ParetoItem) {
    const state = reqMap[item.articleCode]
    if (!state || Number(state.qty) <= 0) return
    if (!managerName.trim()) { alert('Isi nama manager terlebih dahulu.'); return }
    setReqMap(prev => ({ ...prev, [item.articleCode]: { ...prev[item.articleCode], loading: true, error: '' } }))
    try {
      const res = await fetch('/api/submit-pareto-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleCode: item.articleCode, articleDesc: item.articleDesc, brand: item.brand, commodity: item.commodity, qty: Number(state.qty), managerName }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setReqMap(prev => ({ ...prev, [item.articleCode]: { ...prev[item.articleCode], loading: false, done: true } }))
      setItems(prev => prev.map(i => i.articleCode === item.articleCode ? { ...i, needsRestock: false } : i))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal submit'
      setReqMap(prev => ({ ...prev, [item.articleCode]: { ...prev[item.articleCode], loading: false, error: msg } }))
    }
  }

  if (isAuth === null || (isAuth && loading)) {
    return <div className="flex items-center justify-center py-20"><span className="text-4xl animate-spin text-gray-300">↻</span></div>
  }

  const showTable = filter !== 'RESTOCK'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <a href="/manager" className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 text-lg shadow-sm">←</a>
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Pareto Analysis</h1>
          <p className="text-gray-500 text-sm">Monitoring artikel prioritas — stok toko & performa penjualan 3 bulan</p>
        </div>
      </div>

      {/* Manager name (only needed for restock) */}
      {filter === 'RESTOCK' && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 shadow-sm flex items-center gap-3">
          <span className="text-gray-400 text-sm shrink-0">Nama Manager:</span>
          <input value={managerName} onChange={e => setManagerName(e.target.value)}
            placeholder="Isi nama untuk submit request"
            className="flex-1 text-sm border-0 outline-none text-gray-700 placeholder-gray-300" />
        </div>
      )}

      {/* Summary cards / filter tabs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { key: 'ALL'      as Filter, label: 'Total Artikel', val: items.length,  active: 'bg-[#1F4E79] border-[#1F4E79]', valCls: 'text-[#1F4E79]',  valActCls: 'text-white', subCls: 'text-gray-500',  subActCls: 'text-blue-200'  },
            { key: 'PRIORITY' as Filter, label: 'Prioritas',     val: priorityCount, active: 'bg-[#2E75B6] border-[#2E75B6]', valCls: 'text-[#2E75B6]',  valActCls: 'text-white', subCls: 'text-gray-500',  subActCls: 'text-blue-200'  },
            { key: 'RESTOCK'  as Filter, label: 'Perlu Restock', val: restockCount,  active: 'bg-red-600 border-red-600',     valCls: 'text-red-600',    valActCls: 'text-white', subCls: 'text-red-400',   subActCls: 'text-red-200'   },
          ].map(s => {
            const on = filter === s.key
            return (
              <button key={s.key} onClick={() => setFilter(s.key)}
                className={`rounded-xl border p-3 text-center shadow-sm transition-all ${on ? s.active : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                <p className={`text-2xl font-bold ${on ? s.valActCls : s.valCls}`}>{s.val}</p>
                <p className={`text-xs mt-0.5 ${on ? s.subActCls : s.subCls}`}>{s.label}</p>
              </button>
            )
          })}
        </div>
      )}

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {/* Search */}
      {!loading && (
        <div className="relative mb-3">
          <input className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6] shadow-sm"
            placeholder="Cari kode, nama, brand, commodity, dept..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
        </div>
      )}

      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          Menampilkan <strong className="text-gray-600">{filtered.length}</strong> artikel
          {filter === 'RESTOCK' && restockCount > 0 && <span className="ml-2 text-red-500 font-semibold">— {restockCount} butuh restock segera</span>}
        </p>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl animate-spin inline-block">↻</p>
          <p className="mt-3 text-sm">Memuat data Pareto...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">Tidak ada artikel yang sesuai filter</p>
        </div>

      /* ── TABLE view (ALL / PRIORITY) ───────────────────────────── */
      ) : showTable ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#1F4E79] text-white">
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Pareto</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Artikel</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Deskripsi</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Commodity</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Brand</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Dept</th>
                <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Sold Qty</th>
                <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Sold Value</th>
                <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Stok AYB</th>
                <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Stok Cikupa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item, idx) => (
                <tr key={item.articleCode}
                  className={`transition-colors hover:bg-blue-50/40 ${
                    item.needsRestock ? 'bg-red-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  }`}>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold px-2 py-0.5 rounded-full border text-xs ${PARETO_COLOR[item.pareto] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {item.pareto}
                    </span>
                    {item.needsRestock && (
                      <span className="ml-1 text-red-500 font-bold text-xs">⚠</span>
                    )}
                    {item.isExcluded && (
                      <span className="ml-1 text-gray-400 text-xs" title="Sold via DC Cikupa">DC</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{item.articleCode}</td>
                  <td className="px-3 py-2.5 text-gray-800 max-w-[220px]">
                    <p className="truncate font-medium">{item.articleDesc}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.commodity}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.brand}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.dept}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-700">{fmtQty(item.soldQty)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    <span className="font-semibold">{fmtIDR(item.soldValue)}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold ${item.needsRestock ? 'text-red-600' : item.aybStock > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                    {fmtQty(item.aybStock)}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-bold ${item.cikupaStock > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {fmtQty(item.cikupaStock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      /* ── CARDS view (RESTOCK) ──────────────────────────────────── */
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const req = reqMap[item.articleCode]
            const isOpen = !!req && !req.done
            return (
              <div key={item.articleCode}
                className="bg-white rounded-xl border border-red-300 bg-red-50/40 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PARETO_COLOR[item.pareto] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {item.pareto}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠ Perlu Restock</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{item.articleDesc || item.articleCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{[item.articleCode, item.brand, item.commodity].filter(Boolean).join(' · ')}</p>
                    <p className="text-xs text-gray-400">{item.dept}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <p className="text-gray-400">AYB</p>
                        <p className="text-base font-bold text-red-600">{fmtQty(item.aybStock)}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div>
                        <p className="text-gray-400">Cikupa</p>
                        <p className={`text-base font-bold ${item.cikupaStock > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{fmtQty(item.cikupaStock)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Sold 3bln: <strong className="text-gray-600">{fmtQty(item.soldQty)}</strong></p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-red-100">
                  {req?.done ? (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <span>✓</span><span>Request berhasil dikirim sebagai APPROVED</span>
                    </div>
                  ) : !isOpen ? (
                    <button onClick={() => openReq(item.articleCode)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                      + Request Restock
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 shrink-0">Qty:</span>
                      <input type="number" min={1} value={req.qty} onChange={e => updateQty(item.articleCode, e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
                      <button onClick={() => submitReq(item)} disabled={req.loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
                        {req.loading ? <><span className="animate-spin">↻</span> Menyimpan...</> : 'Konfirmasi Request'}
                      </button>
                      <button onClick={() => cancelReq(item.articleCode)}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">✕</button>
                    </div>
                  )}
                  {req?.error && <p className="text-xs text-red-500 mt-1">{req.error}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
