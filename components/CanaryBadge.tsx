'use client'

import Link from 'next/link'
import { DatasetStatus } from '@/types'

interface Props {
  datasetId: string
  score: number
  status: DatasetStatus
}

const statusDot: Record<DatasetStatus, string> = {
  healthy: '#22c55e',
  degraded: '#eab308',
  down: '#ef4444',
  pending: '#6b7280',
}

export function CanaryBadge({ datasetId, score, status }: Props) {
  const dotColor = statusDot[status]
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <Link
      href={`/dataset/${datasetId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: '#111111',
        border: '1px solid #222222',
        borderRadius: '6px',
        padding: '6px 12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{ color: '#888888' }}>Shelby Canary</span>
      <span style={{ color: scoreColor, fontWeight: 'bold' }}>{score}</span>
    </Link>
  )
}
