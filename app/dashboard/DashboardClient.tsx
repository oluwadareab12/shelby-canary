'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { StatusIndicator } from '@/components/StatusIndicator'
import { MonitoredDataset, RegisterDatasetBody } from '@/types'
import { Plus, Wallet, Clock, ArrowRight, X } from 'lucide-react'

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function formatWallet(w: string) {
  if (w.length <= 12) return w
  return `${w.slice(0, 6)}...${w.slice(-4)}`
}

function formatDate(ts: string | null) {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

export function DashboardClient() {
  const [wallet, setWallet] = useState<string | null>(null)
  const [walletInput, setWalletInput] = useState('')
  const [datasets, setDatasets] = useState<MonitoredDataset[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  const [form, setForm] = useState<RegisterDatasetBody>({
    name: '',
    description: '',
    dataset_url: '',
    owner_wallet: '',
    file_format: 'csv',
    check_interval_minutes: 15,
    alert_email: '',
    alert_webhook: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('shelby_wallet')
    if (saved) {
      setWallet(saved)
    }
  }, [])

  const fetchDatasets = useCallback(async (w: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/datasets/owner?wallet=${encodeURIComponent(w)}`)
      if (res.ok) {
        const data = await res.json()
        setDatasets(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (wallet) {
      fetchDatasets(wallet)
    }
  }, [wallet, fetchDatasets])

  function connectWallet() {
    const w = walletInput.trim()
    if (!w) return
    localStorage.setItem('shelby_wallet', w)
    setWallet(w)
  }

  function disconnectWallet() {
    localStorage.removeItem('shelby_wallet')
    setWallet(null)
    setDatasets([])
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!wallet) return
    setRegistering(true)
    setRegisterError(null)

    const payload: RegisterDatasetBody = {
      ...form,
      owner_wallet: wallet,
      description: form.description || undefined,
      alert_email: form.alert_email || undefined,
      alert_webhook: form.alert_webhook || undefined,
    }

    try {
      const res = await fetch('/api/datasets/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        setRegisterError(err.error ?? 'Registration failed')
        return
      }

      setShowModal(false)
      setForm({
        name: '',
        description: '',
        dataset_url: '',
        owner_wallet: '',
        file_format: 'csv',
        check_interval_minutes: 15,
        alert_email: '',
        alert_webhook: '',
      })
      fetchDatasets(wallet)
    } catch {
      setRegisterError('Network error. Please try again.')
    } finally {
      setRegistering(false)
    }
  }

  if (!wallet) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Wallet className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-3">Connect your wallet</h1>
        <p className="text-gray-400 mb-8">Enter your wallet address to view your monitored datasets.</p>
        <div className="flex gap-3 max-w-md mx-auto">
          <input
            type="text"
            placeholder="0x... or wallet address"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connectWallet()}
            className="flex-1 bg-[#111111] border border-[#222222] text-white rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Connect
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <Wallet className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-sm font-mono text-gray-400">{formatWallet(wallet)}</span>
            <button onClick={disconnectWallet} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              disconnect
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Register Dataset
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-500">Loading datasets...</div>
      )}

      {!loading && datasets.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#222222] rounded-xl">
          <p className="text-gray-400 mb-4">No datasets registered yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Register your first dataset →
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {datasets.map((ds) => (
          <div
            key={ds.id}
            className="bg-[#111111] border border-[#222222] rounded-xl p-5 flex items-center gap-4 hover:border-[#333333] transition-colors"
          >
            <StatusIndicator status={ds.status} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">{ds.name}</span>
                {ds.certified && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    ★ Certified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last checked: {formatDate(ds.last_checked_at)}
                </span>
                <span>Uptime 24h: {ds.uptime_24h.toFixed(1)}%</span>
                <span>7d: {ds.uptime_7d.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-mono font-bold ${scoreColor(ds.canary_score)}`}>
                {ds.canary_score.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">Canary Score</div>
            </div>
            <Link
              href={`/dataset/${ds.id}`}
              className="flex items-center gap-1 px-3 py-2 border border-[#222222] hover:border-[#444444] text-sm text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#222222]">
              <h2 className="text-lg font-semibold text-white">Register Dataset</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Dataset Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Dataset URL *</label>
                <input
                  required
                  type="url"
                  value={form.dataset_url}
                  onChange={(e) => setForm({ ...form, dataset_url: e.target.value })}
                  placeholder="https://example.com/data.csv"
                  className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">File Format *</label>
                  <select
                    value={form.file_format}
                    onChange={(e) => setForm({ ...form, file_format: e.target.value as 'csv' | 'json' })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Check Interval *</label>
                  <select
                    value={form.check_interval_minutes}
                    onChange={(e) => setForm({ ...form, check_interval_minutes: Number(e.target.value) as 15 | 30 | 60 })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value={15}>Every 15 min</option>
                    <option value={30}>Every 30 min</option>
                    <option value={60}>Every 60 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alert Email (optional)</label>
                <input
                  type="email"
                  value={form.alert_email}
                  onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alert Webhook URL (optional)</label>
                <input
                  type="url"
                  value={form.alert_webhook}
                  onChange={(e) => setForm({ ...form, alert_webhook: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              {registerError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {registerError}
                </div>
              )}
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {registering ? 'Running initial check…' : 'Register & Start Monitoring'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
