import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import type { RoomReportItem } from '@/services/reportService'

interface RoomUsageChartProps {
  data: RoomReportItem[]
  className?: string
}

const BAR_COLORS = ['#ea580c', '#f97316', '#0284c7', '#059669', '#f59e0b']
const AXIS = '#94a3b8'
const GRID = '#e2e8f0'

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-elevated text-sm">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      <p className="text-muted-foreground">
        Tỉ lệ lấp đầy:{' '}
        <span className="text-foreground font-bold tabular-nums">{value}%</span>
      </p>
    </div>
  )
}

export default function RoomUsageChart({ data, className = '' }: RoomUsageChartProps) {
  const top5 = [...data]
    .sort((a, b) => b.occupancyRate - a.occupancyRate)
    .slice(0, 5)
    .map((room) => ({
      name: room.roomName,
      occupancyRate: room.occupancyRate,
    }))

  return (
    <div className={`w-full h-52 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top5}
          layout="vertical"
          margin={{ top: 4, right: 32, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />

          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: AXIS, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />

          <Bar dataKey="occupancyRate" name="Lấp đầy" radius={[0, 6, 6, 0]}>
            {top5.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
