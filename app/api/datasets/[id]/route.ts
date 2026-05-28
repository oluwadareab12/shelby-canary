import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const { data: dataset, error } = await supabaseAdmin
    .from('monitored_datasets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  const { data: checkResults } = await supabaseAdmin
    .from('check_results')
    .select('*')
    .eq('dataset_id', id)
    .order('checked_at', { ascending: false })
    .limit(24)

  const { data: incidents } = await supabaseAdmin
    .from('incidents')
    .select('*')
    .eq('dataset_id', id)
    .order('started_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    ...dataset,
    check_results: checkResults ?? [],
    recent_incidents: incidents ?? [],
  })
}
