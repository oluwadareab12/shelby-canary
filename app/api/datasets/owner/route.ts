import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')

  if (!wallet) {
    return NextResponse.json({ error: 'wallet parameter required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('monitored_datasets')
    .select('*')
    .eq('owner_wallet', wallet)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
