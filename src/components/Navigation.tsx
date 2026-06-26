'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link href={href}
        className={`text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors ${
          active
            ? 'bg-white text-[#1F4E79] shadow-sm'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}>
        {label}
      </Link>
    )
  }

  return (
    <>
      <header className="bg-[#1F4E79] text-white shadow sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-bold text-lg tracking-wide">INFORMA</div>
            <div className="text-sm text-blue-200 hidden sm:block">Informa Electronics Ahmad Yani Bekasi</div>
          </div>
          <nav className="flex items-center gap-1.5">
            {navLink('/', 'Form STR')}
            {navLink('/dashboard', 'Dashboard')}
            <button
              onClick={() => setOpen(true)}
              className="ml-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="14" height="1.5" rx="0.75" fill="white"/>
                <rect x="2" y="8.25" width="14" height="1.5" rx="0.75" fill="white"/>
                <rect x="2" y="12.5" width="14" height="1.5" rx="0.75" fill="white"/>
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#1F4E79]">
          <span className="font-bold text-white">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Akses Khusus</p>

          <Link href="/staff" onClick={() => setOpen(false)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0">
              📧
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1F4E79]">Staff</p>
              <p className="text-xs text-gray-400">Update status email approved</p>
            </div>
          </Link>

          <Link href="/manager" onClick={() => setOpen(false)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-[#1F4E79]/10 flex items-center justify-center text-xl shrink-0">
              🔐
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1F4E79]">Manager</p>
              <p className="text-xs text-gray-400">Approve / reject request HOLD</p>
            </div>
          </Link>

          <Link href="/manager/pareto" onClick={() => setOpen(false)}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl shrink-0">
              📊
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1F4E79]">Pareto</p>
              <p className="text-xs text-gray-400">Artikel prioritas & restock monitoring</p>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
