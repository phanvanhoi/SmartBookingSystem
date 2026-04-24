import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Check, X, Clock, User, Phone, CalendarDays,
  Users, DoorOpen, Sparkles, AlertCircle, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { facebookService, FacebookMessage, ParsedBooking } from '@/services/facebookService'
import { useRooms } from '@/hooks/useRooms'
import toast from 'react-hot-toast'
import type { Room } from '@/types/room'

export default function FacebookInboxPage() {
  const qc = useQueryClient()
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['fb-messages'],
    queryFn: () => facebookService.getMessages(),
    refetchInterval: 10_000,
  })

  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<ParsedBooking | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<FacebookMessage | null>(null)

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => facebookService.ignoreMessage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fb-messages'] }); toast.success('Đã bỏ qua') },
  })

  const handleTestParse = async () => {
    if (!testText.trim()) return
    try {
      const result = await facebookService.testParse(testText)
      setTestResult(result)
    } catch { toast.error('Lỗi parse') }
  }

  const newMessages = messages.filter((m) => m.status === 'new' || m.status === 'parsed')
  const bookedMessages = messages.filter((m) => m.status === 'booked')
  const ignoredMessages = messages.filter((m) => m.status === 'ignored')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Facebook Inbox</h1>
            <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
              Tin nhắn đặt phòng từ Facebook · {newMessages.length} chờ xử lý
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </Button>
      </div>

      {/* Test parser */}
      <div className="border border-border rounded-xl p-4 bg-card">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Test parser tin nhắn
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder='VD: "Đặt phòng lớn lúc 8h tối nay, 5 người, Tuấn 0901234567"'
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestParse()}
            className="flex-1"
          />
          <Button onClick={handleTestParse} size="sm">Parse</Button>
        </div>
        {testResult && (
          <div className="mt-3 p-3 rounded-lg bg-muted/30 text-sm space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Độ tin cậy:</span>
              <ConfidenceBadge value={testResult.confidence} />
            </div>
            <ParsedInfo parsed={testResult} />
          </div>
        )}
      </div>

      {/* Messages list */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">Chưa có tin nhắn nào</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tin nhắn từ Facebook Page sẽ hiển thị ở đây
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* New / Parsed messages */}
          {newMessages.length > 0 && (
            <Section title={`Chờ xử lý (${newMessages.length})`} color="text-amber-600">
              {newMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onConfirm={() => setConfirmMsg(msg)}
                  onIgnore={() => ignoreMutation.mutate(msg.id)}
                />
              ))}
            </Section>
          )}

          {/* Booked */}
          {bookedMessages.length > 0 && (
            <Section title={`Đã đặt (${bookedMessages.length})`} color="text-emerald-600">
              {bookedMessages.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
            </Section>
          )}

          {/* Ignored */}
          {ignoredMessages.length > 0 && (
            <Section title={`Bỏ qua (${ignoredMessages.length})`} color="text-muted-foreground">
              {ignoredMessages.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* Confirm booking dialog */}
      {confirmMsg && (
        <ConfirmBookingDialog
          message={confirmMsg}
          open={!!confirmMsg}
          onClose={() => setConfirmMsg(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={cn('text-sm font-semibold mb-2', color)}>{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function MessageCard({
  message,
  onConfirm,
  onIgnore,
}: {
  message: FacebookMessage
  onConfirm?: () => void
  onIgnore?: () => void
}) {
  const time = new Date(message.timestamp).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  })

  return (
    <div className="border border-border rounded-xl p-4 bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Sender + time */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <span className="text-sm font-semibold">{message.senderName}</span>
              <span className="text-xs text-muted-foreground ml-2">{time}</span>
            </div>
            <StatusBadge status={message.status} />
          </div>

          {/* Message text */}
          <p className="text-sm bg-muted/30 rounded-lg p-2.5 mb-2">{message.text}</p>

          {/* Parsed info */}
          {message.parsed && (
            <div className="flex items-start gap-2">
              <ConfidenceBadge value={message.parsed.confidence} />
              <ParsedInfo parsed={message.parsed} />
            </div>
          )}

          {message.autoBookingId && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Booking #{message.autoBookingId}
            </p>
          )}
        </div>

        {/* Actions */}
        {(message.status === 'new' || message.status === 'parsed') && (
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={onIgnore}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-8 px-3" onClick={onConfirm}>
              <Check className="w-3.5 h-3.5 mr-1" />
              Đặt
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ParsedInfo({ parsed }: { parsed: ParsedBooking }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {parsed.customerName && (
        <span className="flex items-center gap-1 text-foreground">
          <User className="w-3 h-3 text-muted-foreground" /> {parsed.customerName}
        </span>
      )}
      {parsed.customerPhone && (
        <span className="flex items-center gap-1 text-foreground">
          <Phone className="w-3 h-3 text-muted-foreground" /> {parsed.customerPhone}
        </span>
      )}
      {parsed.date && (
        <span className="flex items-center gap-1 text-foreground">
          <CalendarDays className="w-3 h-3 text-muted-foreground" /> {parsed.date}
        </span>
      )}
      {parsed.time && (
        <span className="flex items-center gap-1 text-foreground">
          <Clock className="w-3 h-3 text-muted-foreground" /> {parsed.time}
        </span>
      )}
      {parsed.roomPreference && (
        <span className="flex items-center gap-1 text-foreground">
          <DoorOpen className="w-3 h-3 text-muted-foreground" />
          {parsed.roomPreference === 'large' ? 'Phòng lớn' : 'Phòng nhỏ'}
        </span>
      )}
      {parsed.guestCount && (
        <span className="flex items-center gap-1 text-foreground">
          <Users className="w-3 h-3 text-muted-foreground" /> {parsed.guestCount} người
        </span>
      )}
      {parsed.durationHours && (
        <span className="flex items-center gap-1 text-foreground">
          <Clock className="w-3 h-3 text-muted-foreground" /> {parsed.durationHours}h
        </span>
      )}
    </div>
  )
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] shrink-0',
        pct >= 70 ? 'border-emerald-400 text-emerald-600' :
        pct >= 40 ? 'border-amber-400 text-amber-600' :
        'border-red-400 text-red-600'
      )}
    >
      {pct}%
    </Badge>
  )
}

function StatusBadge({ status }: { status: FacebookMessage['status'] }) {
  const config = {
    new: { label: 'Mới', className: 'bg-blue-100 text-blue-700' },
    parsed: { label: 'Đã nhận diện', className: 'bg-amber-100 text-amber-700' },
    booked: { label: 'Đã đặt', className: 'bg-emerald-100 text-emerald-700' },
    ignored: { label: 'Bỏ qua', className: 'bg-gray-100 text-gray-600' },
  }
  const c = config[status]
  return <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', c.className)}>{c.label}</span>
}

// ── Confirm Booking Dialog ───────────────────────────────────────────────────

function ConfirmBookingDialog({
  message, open, onClose,
}: {
  message: FacebookMessage; open: boolean; onClose: () => void
}) {
  const qc = useQueryClient()
  const { data: rooms = [] } = useRooms()
  const parsed = message.parsed

  const [form, setForm] = useState({
    roomId: 0,
    customerName: parsed?.customerName || message.senderName,
    customerPhone: parsed?.customerPhone || '',
    date: parsed?.date || new Date().toISOString().slice(0, 10),
    time: parsed?.time || '19:00',
    durationHours: parsed?.durationHours || 2,
  })

  // Set default room based on preference
  useEffect(() => {
    if (rooms.length > 0 && form.roomId === 0) {
      let defaultRoom: Room | undefined
      if (parsed?.roomPreference === 'large') {
        defaultRoom = rooms.find(r => r.roomType.capacityMax > 8)
      } else if (parsed?.roomPreference === 'small') {
        defaultRoom = rooms.find(r => r.roomType.capacityMax <= 8)
      }
      setForm(f => ({ ...f, roomId: defaultRoom?.id || rooms[0].id }))
    }
  }, [rooms, parsed, form.roomId])

  const confirmMutation = useMutation({
    mutationFn: () => facebookService.confirmMessage(message.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-messages'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Đã tạo booking từ tin nhắn Facebook')
      onClose()
    },
    onError: () => toast.error('Lỗi tạo booking'),
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xác nhận đặt phòng từ Facebook</DialogTitle>
        </DialogHeader>

        {/* Original message */}
        <div className="bg-muted/30 rounded-lg p-3 text-sm mb-2">
          <p className="text-xs text-muted-foreground mb-1">{message.senderName}:</p>
          <p className="italic">"{message.text}"</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phòng</label>
            <select
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm"
              value={form.roomId}
              onChange={e => set('roomId', Number(e.target.value))}
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.roomType.name})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tên khách</label>
              <Input value={form.customerName} onChange={e => set('customerName', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">SĐT</label>
              <Input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ngày</label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Giờ</label>
              <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Thời lượng (h)</label>
              <Input type="number" min={1} max={12} value={form.durationHours} onChange={e => set('durationHours', Number(e.target.value))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={!form.customerName || !form.date || !form.time || confirmMutation.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            Xác nhận đặt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
