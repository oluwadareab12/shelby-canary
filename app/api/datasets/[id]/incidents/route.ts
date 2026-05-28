import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { searchParams } = new URL(req.url)

  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const resolved = searchParams.get('resolved')

  let query = supabaseAdmin
    .from('incidents')
    .select('*')
    .eq('dataset_id', id)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (resolved === 'true') {
    query = query.eq('resolved', true)
  } else if (resolved === 'false') {
    query = query.eq('resolved', false)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
