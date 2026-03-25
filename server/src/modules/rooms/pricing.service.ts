import { prisma } from '../../lib/prisma'
import { PriceBreakdown, PriceSegment } from '../../types'

// ─── Internal type for DB pricing rule ───────────────────────────────────────
interface PricingRuleRecord {
  id: number
  name: string
  timeStart: string
  timeEnd: string
  pricePerHour: { toNumber: () => number } | number
  dayOfWeek: string // JSON string e.g. "[]" or "[1,2,3]"
}

// ─── Helper: parse "HH:mm" → minutes from midnight ───────────────────────────
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// ─── Helper: format minutes from midnight → "HH:mm" ──────────────────────────
function formatMinutes(minutes: number): string {
  const normalised = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(normalised / 60)
  const m = normalised % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Find which pricing rule covers a given minute-of-day ───────────────────
function findRuleForMinute(
  minuteOfDay: number,
  rules: PricingRuleRecord[],
): PricingRuleRecord | undefined {
  return rules.find((rule) => {
    const start = parseTimeToMinutes(rule.timeStart)
    const end = parseTimeToMinutes(rule.timeEnd)

    if (start <= end) {
      // Normal range: e.g. 08:00 – 17:00
      return minuteOfDay >= start && minuteOfDay < end
    } else {
      // Overnight range: e.g. 17:00 – 05:00 (spans midnight)
      return minuteOfDay >= start || minuteOfDay < end
    }
  })
}

// ─── Split check-in → check-out into price segments ─────────────────────────
function splitByTimeSlots(
  checkIn: Date,
  checkOut: Date,
  rules: PricingRuleRecord[],
): PriceSegment[] {
  const segments: PriceSegment[] = []

  const totalMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60_000)
  if (totalMinutes <= 0) return segments

  // Work in absolute milliseconds; step minute by minute grouping same-rule runs
  let cursor = new Date(checkIn)
  let segmentStart = new Date(checkIn)
  let currentRule: PricingRuleRecord | undefined

  const toMinuteOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

  currentRule = findRuleForMinute(toMinuteOfDay(cursor), rules)

  for (let i = 0; i < totalMinutes; i++) {
    const next = new Date(cursor.getTime() + 60_000)
    const nextRule = i + 1 < totalMinutes
      ? findRuleForMinute(toMinuteOfDay(next), rules)
      : undefined

    const ruleChanging = nextRule?.id !== currentRule?.id || i + 1 >= totalMinutes

    if (ruleChanging) {
      const segEnd = next
      const minutesInSegment = Math.round((segEnd.getTime() - segmentStart.getTime()) / 60_000)

      if (minutesInSegment > 0) {
        const pricePerHour = currentRule
          ? typeof currentRule.pricePerHour === 'number'
            ? currentRule.pricePerHour
            : currentRule.pricePerHour.toNumber()
          : 0

        segments.push({
          start: `${String(segmentStart.getHours()).padStart(2, '0')}:${String(segmentStart.getMinutes()).padStart(2, '0')}`,
          end: `${String(segEnd.getHours()).padStart(2, '0')}:${String(segEnd.getMinutes()).padStart(2, '0')}`,
          slotName: currentRule?.name ?? 'Không có bảng giá',
          minutes: minutesInSegment,
          pricePerHour,
          amount: Math.round((minutesInSegment / 60) * pricePerHour),
        })
      }

      segmentStart = segEnd
      currentRule = nextRule
    }

    cursor = next
  }

  return segments
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function calculateRoomPrice(
  checkInTime: Date,
  checkOutTime: Date,
  roomTypeId: number,
): Promise<PriceBreakdown> {
  const dayOfWeek = checkInTime.getDay() // 0=Sun … 6=Sat

  // Helper: parse dayOfWeek JSON string → number[]
  function parseDayOfWeek(val: string): number[] {
    try { return JSON.parse(val) } catch { return [] }
  }

  // Helper: check if dayOfWeek matches
  function matchesDayOfWeek(val: string, dow: number): boolean {
    const days = parseDayOfWeek(val)
    return days.length === 0 || days.includes(dow)
  }

  // 1. Load active pricing rules for this room type, filter dayOfWeek in JS
  const allRules = await prisma.pricingRule.findMany({
    where: { roomTypeId, isActive: true },
    orderBy: { id: 'asc' },
  })

  const rules: PricingRuleRecord[] = allRules
    .filter((r) => matchesDayOfWeek(r.dayOfWeek, dayOfWeek))
    .map((r) => ({
      id: r.id,
      name: r.name,
      timeStart: r.timeStart,
      timeEnd: r.timeEnd,
      pricePerHour: r.pricePerHour,
      dayOfWeek: r.dayOfWeek,
    }))

  // 2. Load active surcharges applicable today, filter dayOfWeek in JS
  const today = new Date(checkInTime)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86_400_000)

  const allSurcharges = await prisma.surcharge.findMany({
    where: { isActive: true },
  })

  const surcharges = allSurcharges.filter((s) => {
    const daysMatch = matchesDayOfWeek(s.dayOfWeek, dayOfWeek)
    if (!daysMatch) return false
    // Check date range
    if (s.startDate && new Date(s.startDate) > tomorrow) return false
    if (s.endDate && new Date(s.endDate) < today) return false
    return true
  })

  // 3. Get minimum duration setting
  let minDurationMinutes = 0
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'min_duration_minutes' },
    })
    if (setting?.value) {
      const val = setting.value
      if (typeof val === 'number') minDurationMinutes = val
      else if (typeof val === 'string') minDurationMinutes = parseInt(val, 10) || 0
      else if (typeof val === 'object' && val !== null && 'value' in val) {
        minDurationMinutes = Number((val as Record<string, unknown>).value) || 0
      }
    }
  } catch {
    // Setting not found, skip
  }

  // 4. Apply minimum duration if needed
  const actualMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60_000)
  let effectiveCheckOut = checkOutTime

  if (minDurationMinutes > 0 && actualMinutes < minDurationMinutes) {
    effectiveCheckOut = new Date(checkInTime.getTime() + minDurationMinutes * 60_000)
  }

  // 5. Split time into price segments
  const segments = splitByTimeSlots(checkInTime, effectiveCheckOut, rules)

  // 6. Calculate subtotal
  const subtotal = segments.reduce((sum, s) => sum + s.amount, 0)

  // 7. Apply surcharges
  let totalSurchargePercentage = 0
  for (const sc of surcharges) {
    const pct = typeof sc.percentage === 'number' ? sc.percentage : sc.percentage.toNumber()
    totalSurchargePercentage += pct
  }
  const surchargeAmount = Math.round(subtotal * (totalSurchargePercentage / 100))
  const total = subtotal + surchargeAmount

  return {
    segments,
    subtotal,
    surcharge: surchargeAmount,
    total,
  }
}

// ─── Quick helper: calculate current charge for a running session ────────────
export async function calculateCurrentCharge(
  checkInTime: Date,
  roomTypeId: number,
): Promise<PriceBreakdown> {
  const now = new Date()
  return calculateRoomPrice(checkInTime, now, roomTypeId)
}

// Re-export helper for tests / other services
export { splitByTimeSlots, parseTimeToMinutes, formatMinutes }
