import Link from 'next/link'
import { supabaseAdmin } from '@/lib/db/supabase'
import { Shield, Activity, GitBranch } from 'lucide-react'

async function getStats() {
  try {
    const [{ count: totalDatasets }, { count: checksToday }, { count: incidentsWeek }] =
      await Promise.all([
        supabaseAdmin.from('monitored_datasets').select('id', { count: 'exact', head: true }),
        supabaseAdmin
          .from('check_results')
          .select('id', { count: 'exact', head: true })
          .gte('checked_at', new Date(Date.now() - 86400000).toISOString()),
        supabaseAdmin
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .gte('started_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])
    return { totalDatasets: totalDatasets ?? 0, checksToday: checksToday ?? 0, incidentsWeek: incidentsWeek ?? 0 }
  } catch {
    return { totalDatasets: 0, checksToday: 0, incidentsWeek: 0 }
  }
}

export default async function LandingPage() {
  const stats = await getStats()

  return (
    <main>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#222222] text-xs text-gray-400 mb-6 font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Monitoring active
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Is your data<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400">trustworthy?</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Shelby Canary monitors your Shelby-hosted datasets for availability, integrity, and drift — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Monitor a Dataset
          </Link>
          <Link
            href="/leaderboard"
            className="px-6 py-3 border border-[#222222] hover:border-[#444444] text-white rounded-lg font-medium transition-colors"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      <section className="border-y border-[#222222] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 divide-x divide-[#222222] text-center">
            <div className="px-6 py-2">
              <div className="text-3xl font-mono font-bold text-white">{stats.totalDatasets}</div>
              <div className="text-sm text-gray-400 mt-1">Datasets Monitored</div>
            </div>
            <div className="px-6 py-2">
              <div className="text-3xl font-mono font-bold text-white">{stats.checksToday}</div>
              <div className="text-sm text-gray-400 mt-1">Checks Run Today</div>
            </div>
            <div className="px-6 py-2">
              <div className="text-3xl font-mono font-bold text-white">{stats.incidentsWeek}</div>
              <div className="text-sm text-gray-400 mt-1">Incidents This Week</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
          <p className="text-gray-400">Three layers of protection for your data assets.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Availability Monitoring</h3>
            <p className="text-sm text-gray-400">
              Checks your dataset URL every 15 minutes. Instant alerts when your data goes offline or returns HTTP errors.
            </p>
          </div>
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Integrity Verification</h3>
            <p className="text-sm text-gray-400">
              SHA-256 checksums on every check. Know the moment your dataset content changes unexpectedly.
            </p>
          </div>
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
              <GitBranch className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Drift Detection</h3>
            <p className="text-sm text-gray-400">
              Schema and statistical anomaly alerts. Catch added columns, type changes, and null rate spikes before buyers do.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#222222] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-sm text-gray-500 font-mono mb-4">If PPAD is the data economy,</p>
          <p className="text-2xl font-bold text-white">Shelby Canary is the trust layer.</p>
          <Link
            href="/dashboard"
            className="inline-block mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  )
}
