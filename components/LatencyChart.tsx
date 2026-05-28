'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  timestamp: string
  latency_ms: number
}

interface Props {
  data: DataPoint[]
}

export function LatencyChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: '#888888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#888888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#111111', border: '1px solid #222222', borderRadius: '6px' }}
          labelStyle={{ color: '#888888', fontSize: 12 }}
          itemStyle={{ color: '#ffffff', fontSize: 12 }}
          formatter={(value) => [`${value}ms`, 'Latency']}
        />
        <ReferenceLine y={1000} stroke="#eab308" strokeDasharray="4 4" label={{ value: '1000ms', fill: '#eab308', fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="latency_ms"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#8b5cf6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
