/**
 * Parse Vietnamese booking messages from Facebook.
 * Extracts: customer name, phone, date, time, duration, room preference, guest count.
 *
 * Example messages:
 *   "Cho mình đặt phòng lớn lúc 8h tối nay, 5 người, Tuấn 0901234567"
 *   "Đặt phòng bé 19h ngày mai, tên Lan, sdt 0987654321, hát khoảng 2 tiếng"
 *   "Book phòng lớn 20h thứ 7 cho 10 người nhé"
 */

export interface ParsedBooking {
  customerName: string | null
  customerPhone: string | null
  date: string | null          // YYYY-MM-DD
  time: string | null          // HH:mm
  durationHours: number | null
  roomPreference: 'small' | 'large' | null
  guestCount: number | null
  confidence: number           // 0-1, how confident we are this is a booking
  raw: string
}

export function parseBookingMessage(text: string): ParsedBooking {
  const raw = text
  const lower = text.toLowerCase().normalize('NFC')

  const result: ParsedBooking = {
    customerName: null,
    customerPhone: null,
    date: null,
    time: null,
    durationHours: null,
    roomPreference: null,
    guestCount: null,
    confidence: 0,
    raw,
  }

  // ── Is this a booking message? ──
  const bookingKeywords = [
    'đặt phòng', 'book phòng', 'đặt bàn', 'book bàn',
    'giữ phòng', 'giữ bàn', 'đặt chỗ', 'book chỗ',
    'cho mình đặt', 'cho tôi đặt', 'muốn đặt',
    'đặt lịch', 'hát karaoke', 'đặt hát',
  ]
  const isBooking = bookingKeywords.some((kw) => lower.includes(kw))
  if (!isBooking) {
    result.confidence = 0
    return result
  }
  result.confidence = 0.5

  // ── Phone number ──
  const phoneMatch = text.match(/(?:sdt|số điện thoại|phone|đt|s[oố]\s*:?\s*)?\s*(0[35789]\d{8})/i)
    || text.match(/(0[35789]\d{8})/)
  if (phoneMatch) {
    result.customerPhone = phoneMatch[1]
    result.confidence += 0.1
  }

  // ── Customer name ──
  // Patterns: "tên X", "tên: X", "là X", "mình là X", "tôi tên X"
  const namePatterns = [
    /(?:tên|ten|tôi là|mình là|tui là|là)\s*:?\s*([A-ZÀ-Ỹa-zà-ỹ]+(?:\s+[A-ZÀ-Ỹa-zà-ỹ]+)*)/i,
    /(?:cho|ghi)\s+(?:tên\s+)?([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)\s+(?:nhé|nha|đi|ạ|á|ha)?/,
  ]
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.customerName = match[1].trim()
      result.confidence += 0.1
      break
    }
  }

  // ── Room preference ──
  if (/phòng\s*(lớn|to|vip|big)/i.test(lower)) {
    result.roomPreference = 'large'
    result.confidence += 0.05
  } else if (/phòng\s*(nhỏ|bé|small|thường)/i.test(lower)) {
    result.roomPreference = 'small'
    result.confidence += 0.05
  }

  // ── Guest count ──
  const guestMatch = lower.match(/(\d+)\s*(?:người|ng|nguoi|bạn|ban|khách)/i)
  if (guestMatch) {
    result.guestCount = parseInt(guestMatch[1], 10)
    result.confidence += 0.05
  }

  // ── Duration ──
  const durationMatch = lower.match(/(?:hát|hat|khoảng|khoang|chơi|choi)?\s*(\d+(?:[.,]\d+)?)\s*(?:tiếng|tieng|giờ|gio|h)\b/)
  if (durationMatch) {
    result.durationHours = parseFloat(durationMatch[1].replace(',', '.'))
    result.confidence += 0.05
  }

  // ── Time ──
  // "8h", "8h30", "20h", "8 giờ tối", "19:30", "lúc 8h"
  const timePatterns = [
    /(?:lúc|luc|vào|vao|khoảng)?\s*(\d{1,2})\s*[h:]\s*(\d{2})?\s*(?:phút|phut|p)?\s*(?:tối|toi|chiều|chieu|trưa|trua|sáng|sang|đêm|dem)?/i,
    /(\d{1,2})\s*(?:giờ|gio)\s*(\d{2})?\s*(?:phút|phut)?\s*(?:tối|toi|chiều|chieu|trưa|trua|sáng|sang|đêm|dem)?/i,
  ]
  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      let hour = parseInt(match[1], 10)
      const minute = match[2] ? parseInt(match[2], 10) : 0

      // Handle "tối" / "chiều" / "đêm"
      const afterMatch = text.substring((match.index ?? 0) + match[0].length).toLowerCase()
      const beforeAndMatch = (text.substring(0, (match.index ?? 0)) + match[0]).toLowerCase()
      const hasPM = /tối|toi|chiều|chieu|đêm|dem/.test(beforeAndMatch + ' ' + afterMatch)

      if (hasPM && hour < 12) {
        hour += 12
      }
      // Assume evening if hour <= 6 (e.g., "5h" likely means 17h for karaoke)
      if (hour >= 1 && hour <= 6 && !hasPM) {
        // Could be AM (after midnight) or PM - for karaoke, likely PM
        // But if they say "5h sáng" keep as is
        const hasAM = /sáng|sang|trưa|trua/.test(beforeAndMatch + ' ' + afterMatch)
        if (!hasAM) hour += 12
      }

      if (hour >= 0 && hour <= 28 && minute >= 0 && minute < 60) {
        result.time = `${String(hour > 24 ? hour - 24 : hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        result.confidence += 0.15
      }
      break
    }
  }

  // ── Date ──
  const today = new Date()
  const todayStr = formatDate(today)

  if (/hôm nay|hom nay|hnay|h\.nay|today/.test(lower)) {
    result.date = todayStr
    result.confidence += 0.1
  } else if (/ngày mai|ngay mai|mai|tomorrow/.test(lower)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    result.date = formatDate(tomorrow)
    result.confidence += 0.1
  } else if (/ngày kia|ngay kia|mốt|mot/.test(lower)) {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    result.date = formatDate(dayAfter)
    result.confidence += 0.1
  } else {
    // "thứ X", "t2", "t3"...
    const dayNames: Record<string, number> = {
      'thứ 2': 1, 'thứ hai': 1, 't2': 1,
      'thứ 3': 2, 'thứ ba': 2, 't3': 2,
      'thứ 4': 3, 'thứ tư': 3, 't4': 3,
      'thứ 5': 4, 'thứ năm': 4, 't5': 4,
      'thứ 6': 5, 'thứ sáu': 5, 't6': 5,
      'thứ 7': 6, 'thứ bảy': 6, 't7': 6,
      'chủ nhật': 0, 'cn': 0,
    }
    for (const [name, dayOfWeek] of Object.entries(dayNames)) {
      if (lower.includes(name)) {
        const target = new Date(today)
        const currentDay = target.getDay()
        let diff = dayOfWeek - currentDay
        if (diff <= 0) diff += 7
        target.setDate(target.getDate() + diff)
        result.date = formatDate(target)
        result.confidence += 0.1
        break
      }
    }

    // "ngày DD/MM" or "DD/MM"
    const dateMatch = text.match(/(?:ngày|ngay)?\s*(\d{1,2})\s*[/\-\.]\s*(\d{1,2})(?:\s*[/\-\.]\s*(\d{2,4}))?/)
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10)
      const month = parseInt(dateMatch[2], 10)
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : today.getFullYear()
      const fullYear = year < 100 ? 2000 + year : year
      result.date = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      result.confidence += 0.1
    }
  }

  // Default date to today if not found but time is found
  if (!result.date && result.time) {
    result.date = todayStr
  }

  // Boost confidence if we have essential fields
  if (result.time && result.date) result.confidence += 0.1
  result.confidence = Math.min(1, result.confidence)

  return result
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
