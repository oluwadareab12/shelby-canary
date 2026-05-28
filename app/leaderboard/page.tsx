import Link from 'next/link'
import { supabaseAdmin } from '@/lib/db/supabase'
import { StatusIndicator } from '@/components/StatusIndicator'
import { LeaderboardEntry, DatasetStatus } from '@/types'
import { Award } from 'lucide-react'

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data: datasets } = await supabaseAdmin
    .from('monitored_datasets')
    .select('id, name, owner_wallet, canary_score, uptime_24h, certified, status')
    .order('canary_score', { ascending: false })
    .limit(20)

  if (!datasets || datasets.length === 0) return []

  const datasetIds = datasets.map((d: { id: string }) => d.id)
  const { data: checkCounts } = await supabaseAdmin
    .from('check_results')
    .select('dataset_id')
    .in('dataset_id', datasetIds)

  const countMap: Record<string, number> = {}
  for (const row of checkCounts ?? []) {
    countMap[row.dataset_id] = (countMap[row.dataset_id] ?? 0) + 1
  }

  return datasets.map((d: { id: string; name: string; owner_wallet: string; canary_score: number; uptime_24h: number; certified: boolean; status: DatasetStatus }) => ({
    ...d,
    total_checks: countMap[d.id] ?? 0,
  }))
}

function formatWallet(w: string) {
  if (w.length <= 12) return w
  return `${w.slice(0, 6)}...${w.slice(-4)}`
}

export default async function LeaderboardPage() {
  const entries = await getLeaderboard()

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400">Top 20 most reliable datasets on Shelby Protocol.</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#222222] rounded-xl text-gray-500">
          No datasets registered yet.
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222222]">
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3 w-12">Rank</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Owner</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Score</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Uptime 24h</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-center text-xs text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Certified</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#222222] last:border-0 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm text-gray-500">#{i + 1}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/dataset/${entry.id}`} className="hover:text-purple-400 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{entry.name}</span>
                        {entry.certified && (
                          <Award className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="font-mono text-xs text-gray-500">{formatWallet(entry.owner_wallet)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-mono font-bold text-lg ${scoreColor(entry.canary_score)}`}>
                      {entry.canary_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <span className="font-mono text-sm text-gray-300">{entry.uptime_24h.toFixed(1)}%</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                      <StatusIndicator status={entry.status} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center hidden lg:table-cell">
                    {entry.certified ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
