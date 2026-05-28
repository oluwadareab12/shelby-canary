import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

export async function GET() {
  const { data: datasets, error } = await supabaseAdmin
    .from('monitored_datasets')
    .select('id, name, owner_wallet, canary_score, uptime_24h, certified, status')
    .order('canary_score', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  if (!datasets || datasets.length === 0) {
    return NextResponse.json([])
  }

  const datasetIds = datasets.map((d) => d.id)

  const { data: checkCounts } = await supabaseAdmin
    .from('check_results')
    .select('dataset_id')
    .in('dataset_id', datasetIds)

  const countMap: Record<string, number> = {}
  for (const row of checkCounts ?? []) {
    countMap[row.dataset_id] = (countMap[row.dataset_id] ?? 0) + 1
  }

  const leaderboard = datasets.map((d) => ({
    ...d,
    total_checks: countMap[d.id] ?? 0,
  }))

  return NextResponse.json(leaderboard)
}
