'use client'

interface DriftEvent {
  column: string
  date: string
  type: string
}

interface Props {
  columns: string[]
  events: DriftEvent[]
}

function getLast14Days(): string[] {
  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function cellColor(events: DriftEvent[]): string {
  if (events.length === 0) return '#1a2e1a'
  const hasCritical = events.some((e) => e.type === 'schema_drift')
  if (hasCritical) return '#7f1d1d'
  return '#713f12'
}

export function DriftHeatmap({ columns, events }: Props) {
  const days = getLast14Days()

  const eventMap: Record<string, Record<string, DriftEvent[]>> = {}
  for (const ev of events) {
    const day = ev.date.slice(0, 10)
    if (!eventMap[ev.column]) eventMap[ev.column] = {}
    if (!eventMap[ev.column][day]) eventMap[ev.column][day] = []
    eventMap[ev.column][day].push(ev)
  }

  if (columns.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">No column data available.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex gap-1 mb-1 ml-32">
          {days.map((d) => (
            <div key={d} className="w-7 text-center text-xs text-gray-500" style={{ fontSize: 9 }}>
              {d.slice(5)}
            </div>
          ))}
        </div>
        {columns.map((col) => (
          <div key={col} className="flex items-center gap-1 mb-1">
            <div className="w-32 text-right pr-2 text-xs text-gray-400 truncate font-mono">{col}</div>
            {days.map((day) => {
              const cellEvents = eventMap[col]?.[day] ?? []
              return (
                <div
                  key={day}
                  title={cellEvents.length > 0 ? cellEvents.map((e) => e.type).join(', ') : 'No events'}
                  style={{ background: cellColor(cellEvents), width: 28, height: 20, borderRadius: 3, border: '1px solid #222222' }}
                />
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-3 mt-3 ml-32">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span style={{ background: '#1a2e1a', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }} /> No events
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span style={{ background: '#713f12', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }} /> Data drift
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span style={{ background: '#7f1d1d', width: 12, height: 12, borderRadius: 2, display: 'inline-block' }} /> Schema drift
          </span>
        </div>
      </div>
    </div>
  )
}
