import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alerts/alertService'

export async function POST(req: NextRequest) {
  let body: { dataset_id: string; dataset_name: string; alert_email?: string; alert_webhook?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.dataset_id || !body.dataset_name) {
    return NextResponse.json({ error: 'dataset_id and dataset_name are required' }, { status: 400 })
  }

  try {
    await sendAlert({
      dataset: { name: body.dataset_name, id: body.dataset_id },
      incident: {
        type: 'test',
        description: 'This is a test alert from Shelby Canary.',
        severity: 'info',
      },
      alertEmail: body.alert_email,
      alertWebhook: body.alert_webhook,
    })

    return NextResponse.json({ success: true, message: 'Test alert sent' })
  } catch (err) {
    console.error('Test alert failed:', err)
    return NextResponse.json({ error: 'Failed to send test alert' }, { status: 500 })
  }
}
