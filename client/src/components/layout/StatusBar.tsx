export default function StatusBar() {
  return (
    <footer className="h-8 shrink-0 flex items-center px-4 bg-background border-t border-border text-xs text-muted-foreground">
      {/* Online indicator */}
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
        <span className="text-[#22c55e] font-medium">Online</span>
      </span>

      {/* Shift info */}
      <span className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
        Ca: <span className="text-foreground">17:00 - 05:00</span>
      </span>

      {/* Revenue info */}
      <span className="ml-auto">
        Doanh thu ca:{' '}
        <span className="text-foreground font-medium">0 VNĐ</span>
      </span>
    </footer>
  )
}
