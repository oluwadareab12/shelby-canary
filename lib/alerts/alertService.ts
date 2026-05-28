import nodemailer from 'nodemailer'

interface AlertParams {
  dataset: { name: string; id: string }
  incident: { type: string; description: string; severity: string }
  alertEmail?: string
  alertWebhook?: string
}

export async function sendAlert(params: AlertParams): Promise<void> {
  const { dataset, incident, alertEmail, alertWebhook } = params

  const promises: Promise<void>[] = []

  if (alertEmail) {
    promises.push(sendEmailAlert(dataset, incident, alertEmail))
  }

  if (alertWebhook) {
    promises.push(sendWebhookAlert(dataset, incident, alertWebhook))
  }

  await Promise.allSettled(promises)
}

async function sendEmailAlert(
  dataset: { name: string; id: string },
  incident: { type: string; description: string; severity: string },
  to: string
): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.log(
      `[AlertService] Email alert skipped (SMTP not configured) — dataset: ${dataset.name}, incident: ${incident.type}`
    )
    return
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  const severityLabel = incident.severity.toUpperCase()

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: `[${severityLabel}] Shelby Canary Alert: ${dataset.name} — ${incident.type}`,
    text: `
Shelby Canary Alert

Dataset: ${dataset.name}
Severity: ${severityLabel}
Type: ${incident.type}
Description: ${incident.description}
Timestamp: ${new Date().toISOString()}

View dataset status: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dataset/${dataset.id}
    `.trim(),
    html: `
<h2>Shelby Canary Alert</h2>
<p><strong>Dataset:</strong> ${dataset.name}</p>
<p><strong>Severity:</strong> ${severityLabel}</p>
<p><strong>Type:</strong> ${incident.type}</p>
<p><strong>Description:</strong> ${incident.description}</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dataset/${dataset.id}">View dataset status</a></p>
    `.trim(),
  })
}

async function sendWebhookAlert(
  dataset: { name: string; id: string },
  incident: { type: string; description: string; severity: string },
  webhookUrl: string
): Promise<void> {
  const payload = {
    event: 'canary.alert',
    dataset_id: dataset.id,
    dataset_name: dataset.name,
    incident_type: incident.type,
    severity: incident.severity,
    description: incident.description,
    timestamp: new Date().toISOString(),
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: HTTP ${response.status}`)
  }
}
