'use client'

import { Incident } from '@/types'

interface Props {
  incidents: Incident[]
}

const severityBorder: Record<string, string> = {
  info: 'border-green-500',
  warning: 'border-yellow-500',
  critical: 'border-red-500',
}

const severityBadge: Record<string, string> = {
  info: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  critical: 'bg-red-500/20 text-red-400',
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export function IncidentTimeline({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">No incidents recorded.</div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {incidents.map((inc) => (
        <div
          key={inc.id}
          className={`border-l-4 ${severityBorder[inc.severity]} pl-4 py-2`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${severityBadge[inc.severity]}`}>
              {inc.severity}
            </span>
            <span className="text-sm font-medium text-white font-mono">{inc.type.replace(/_/g, ' ')}</span>
            {!inc.resolved && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse">
                Ongoing
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-1">{inc.description}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>Started: {formatTs(inc.started_at)}</span>
            {inc.resolved && inc.resolved_at && (
              <span>Resolved: {formatTs(inc.resolved_at)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
