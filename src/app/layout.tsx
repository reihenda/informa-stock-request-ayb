import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Informa Stock Request',
  description: 'Sistem Request Stok — Informa Electronics Ahmad Yani Bekasi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
