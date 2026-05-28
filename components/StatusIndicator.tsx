'use client'

import { DatasetStatus } from '@/types'

interface Props {
  status: DatasetStatus
  size?: 'sm' | 'md' | 'lg'
}

const config: Record<DatasetStatus, { color: string; pulse: boolean }> = {
  healthy: { color: 'bg-green-500', pulse: true },
  degraded: { color: 'bg-yellow-500', pulse: true },
  down: { color: 'bg-red-500', pulse: true },
  pending: { color: 'bg-gray-500', pulse: false },
}

const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' }

export function StatusIndicator({ status, size = 'md' }: Props) {
  const { color, pulse } = config[status]
  const sizeClass = sizes[size]

  return (
    <span className="relative inline-flex">
      {pulse && (
        <span
          className={`animate-ping absolute inline-flex ${sizeClass} rounded-full ${color} opacity-75`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeClass} ${color}`} />
    </span>
  )
}
