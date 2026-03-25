import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { formatCurrencyShort, formatCurrency } from '@/utils/formatCurrency'
import type { RevenueChartPoint } from '@/services/reportService'

interface RevenueChartProps {
  data: RevenueChartPoint[]
  className?: string
}

// Custom dark-theme tooltip
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-[#222230] border border-[#3a3a4a] rounded-lg p-3 shadow-xl text-sm">
      <p className="text-[#8888a0] mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#8888a0]">{entry.name}:</span>
          <span className="text-[#f0f0f5] font-semibold ml-auto pl-4">
            {formatCurrency(entry.value ?? 0, true)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatAxisDate(dateStr: string): string {
  // yyyy-MM-dd → d/M or MM → tháng
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parseInt(parts[2])}/${parseInt(parts[1])}`
  }
  if (parts.length === 2) {
    return `T${parseInt(parts[1])}`
  }
  return dateStr
}

export default function RevenueChart({ data, className = '' }: RevenueChartProps) {
  const formattedData = data.map((point) => ({
    ...point,
    label: formatAxisDate(point.date),
  }))

  return (
    <div className={`w-full h-64 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRoom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOrder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#8888a0', fontSize: 12 }}
            axisLine={{ stroke: '#2a2a3a' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fill: '#8888a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#8888a0', paddingTop: '8px' }}
            formatter={(value) => <span style={{ color: '#8888a0' }}>{value}</span>}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Tổng DT"
            stroke="#6c5ce7"
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: '#6c5ce7' }}
          />
          <Area
            type="monotone"
            dataKey="roomRevenue"
            name="Phòng"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradRoom)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          <Area
            type="monotone"
            dataKey="orderRevenue"
            name="Order"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradOrder)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
