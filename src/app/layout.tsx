import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Informa Stock Request',
  description: 'Sistem Request Stok — Informa Electronics Margonda',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-[#1F4E79] text-white shadow">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-bold text-lg tracking-wide">INFORMA</div>
              <div className="text-sm text-blue-200 hidden sm:block">Stock Request System — Margonda</div>
            </div>
            <nav className="flex items-center gap-1">
              <a href="/" className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-100 hover:text-white">
                Form Sales
              </a>
              <a href="/dashboard" className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-blue-100 hover:text-white">
                Dashboard
              </a>
              <a href="/staff" className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white font-medium border border-white/20 ml-1">
                📧 Staff
              </a>
              <a href="/manager" className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white font-medium border border-white/20">
                🔐 Manager
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
