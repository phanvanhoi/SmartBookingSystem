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

const BAR_COLORS = ['#6c5ce7', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b']

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0

  return (
    <div className="bg-[#222230] border border-[#3a3a4a] rounded-lg p-3 shadow-xl text-sm">
      <p className="text-[#f0f0f5] font-semibold mb-1">{label}</p>
      <p className="text-[#8888a0]">
        Tỉ lệ lấp đầy:{' '}
        <span className="text-[#f0f0f5] font-semibold">{value}%</span>
      </p>
    </div>
  )
}

export default function RoomUsageChart({ data, className = '' }: RoomUsageChartProps) {
  // Take top 5 rooms by occupancy rate
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
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />

          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: '#8888a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#8888a0', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

          <Bar dataKey="occupancyRate" name="Lấp đầy" radius={[0, 4, 4, 0]}>
            {top5.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
