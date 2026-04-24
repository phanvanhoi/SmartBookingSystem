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

// Palette — aligned with POS tokens (primary orange + supporting blues/greens)
const COLORS = {
  revenue: '#ea580c', // primary — warm orange
  room: '#0284c7', // sky-600
  order: '#059669', // emerald-600
  axis: '#94a3b8', // slate-400
  grid: '#e2e8f0', // slate-200
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipLabel: '#475569', // slate-600
  tooltipValue: '#0f172a', // slate-900
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-lg p-3 text-sm shadow-elevated"
      style={{ backgroundColor: COLORS.tooltipBg, border: `1px solid ${COLORS.tooltipBorder}` }}
    >
      <p className="mb-2 font-semibold" style={{ color: COLORS.tooltipLabel }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: COLORS.tooltipLabel }}>{entry.name}:</span>
          <span
            className="font-bold ml-auto pl-4 tabular-nums"
            style={{ color: COLORS.tooltipValue }}
          >
            {formatCurrency(entry.value ?? 0, true)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatAxisDate(dateStr: string): string {
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
              <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRoom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.room} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS.room} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOrder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.order} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS.order} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: COLORS.axis, fontSize: 12 }}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fill: COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.grid }} />

          <Legend
            wrapperStyle={{ fontSize: '12px', color: COLORS.axis, paddingTop: '8px' }}
            formatter={(value) => <span style={{ color: COLORS.axis }}>{value}</span>}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Tổng DT"
            stroke={COLORS.revenue}
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.revenue }}
          />
          <Area
            type="monotone"
            dataKey="roomRevenue"
            name="Phòng"
            stroke={COLORS.room}
            strokeWidth={2}
            fill="url(#gradRoom)"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.room }}
          />
          <Area
            type="monotone"
            dataKey="orderRevenue"
            name="Order"
            stroke={COLORS.order}
            strokeWidth={2}
            fill="url(#gradOrder)"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.order }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
