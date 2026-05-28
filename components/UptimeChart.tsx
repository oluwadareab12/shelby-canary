'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DataPoint {
  date: string
  uptime: number
}

interface Props {
  data: DataPoint[]
}

export function UptimeChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: '#888888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#888888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#111111', border: '1px solid #222222', borderRadius: '6px' }}
          labelStyle={{ color: '#888888', fontSize: 12 }}
          itemStyle={{ color: '#ffffff', fontSize: 12 }}
          formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)}%` : `${value}%`, 'Uptime']}
        />
        <Bar dataKey="uptime" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.uptime >= 99 ? '#22c55e' : entry.uptime >= 90 ? '#eab308' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
