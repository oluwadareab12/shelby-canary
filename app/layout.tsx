import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shelby Canary — Dataset Monitoring',
  description: 'The trust and reliability layer for the Shelby data ecosystem.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <nav className="border-b border-[#222222] bg-[#0a0a0a] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" className="font-mono text-lg font-bold text-white flex items-center gap-2">
              <span className="text-yellow-400">◆</span> Shelby Canary
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a>
              <a href="/leaderboard" className="text-gray-400 hover:text-white transition-colors">Leaderboard</a>
              <a href="/docs" className="text-gray-400 hover:text-white transition-colors">Docs</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
