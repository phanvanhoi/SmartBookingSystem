import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap'

type PublicShellProps = {
  children: ReactNode
  active?: 'book' | 'spin'
  footer?: ReactNode
}

export default function PublicShell({ children, active = 'book', footer }: PublicShellProps) {
  useEffect(() => {
    // Drop older promo font links (Orbitron/Outfit…) so Vietnamese glyphs render cleanly.
    document
      .querySelectorAll('link[data-public-promo-font], link[href*="Orbitron"], link[href*="Outfit"]')
      .forEach((el) => el.remove())

    const existing = document.querySelector(`link[href="${FONT_HREF}"]`)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    link.dataset.publicPromoFont = '1'
    document.head.appendChild(link)
  }, [])

  return (
    <div className="public-promo min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden text-[#eef4ff] flex flex-col">
      <style>{`
        .public-promo {
          --promo-bg: #050b1a;
          --promo-panel: rgba(18, 28, 55, 0.72);
          --promo-gold: #ffe566;
          --promo-gold-deep: #f0c020;
          --promo-ink: #eef4ff;
          --promo-muted: #9bb0d0;
          --promo-blue: #3d9eff;
          --promo-purple: #c44dff;
          --promo-magenta: #ff4fd8;
          font-family: 'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif;
          background-color: var(--promo-bg);
          background-image:
            radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 28% 42%, rgba(255,255,255,0.45), transparent),
            radial-gradient(1.5px 1.5px at 48% 12%, rgba(255,255,255,0.55), transparent),
            radial-gradient(1px 1px at 67% 28%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 82% 55%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 91% 16%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1px 1px at 18% 72%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1.5px 1.5px at 55% 78%, rgba(255,255,255,0.45), transparent),
            radial-gradient(ellipse 85% 50% at 50% -12%, rgba(61,158,255,0.28), transparent 55%),
            radial-gradient(ellipse 55% 40% at 0% 100%, rgba(196,77,255,0.22), transparent 55%),
            radial-gradient(ellipse 50% 35% at 100% 85%, rgba(255,79,216,0.14), transparent 50%),
            linear-gradient(165deg, #030712 0%, #0a1630 42%, #071022 100%);
          -webkit-tap-highlight-color: transparent;
        }
        .public-promo .display {
          font-family: 'Be Vietnam Pro', system-ui, sans-serif;
          letter-spacing: -0.02em;
          font-weight: 800;
          line-height: 1.15;
        }
        .public-promo .ika-mark {
          position: relative;
          width: 3.15rem;
          height: 3.15rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          background:
            radial-gradient(circle at 40% 35%, rgba(255,229,102,0.35), transparent 55%),
            rgba(8, 14, 32, 0.9);
          border: 2px solid var(--promo-gold);
          box-shadow:
            0 0 0 1px rgba(255,229,102,0.25),
            0 0 18px rgba(255,229,102,0.45),
            0 0 36px rgba(196,77,255,0.2);
          animation: ika-pulse 3.2s ease-in-out infinite;
        }
        .public-promo .ika-mark span {
          font-family: 'Be Vietnam Pro', system-ui, sans-serif;
          font-weight: 800;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          color: var(--promo-gold);
          text-shadow: 0 0 12px rgba(255,229,102,0.8);
          line-height: 1;
        }
        @keyframes ika-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,229,102,0.25), 0 0 16px rgba(255,229,102,0.4), 0 0 28px rgba(196,77,255,0.15); }
          50% { box-shadow: 0 0 0 1px rgba(255,229,102,0.4), 0 0 24px rgba(255,229,102,0.65), 0 0 40px rgba(61,158,255,0.25); }
        }
        .public-promo .panel {
          background: var(--promo-panel);
          border: 1px solid rgba(157, 190, 255, 0.16);
          backdrop-filter: blur(14px) saturate(1.2);
          -webkit-backdrop-filter: blur(14px) saturate(1.2);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 12px 40px rgba(0,0,0,0.28);
        }
        .public-promo .field {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border-radius: 0.875rem;
          border: 1px solid rgba(157,190,255,0.22);
          background: rgba(4, 10, 24, 0.65);
          color: var(--promo-ink);
          padding: 0.875rem 1rem;
          font-size: 16px;
          line-height: 1.35;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none;
          appearance: none;
        }
        .public-promo input[type='date'].field {
          min-height: 3.15rem;
          color-scheme: dark;
        }
        .public-promo select.field {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239bb0d0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          padding-right: 2.5rem;
        }
        .public-promo .field:focus {
          border-color: var(--promo-blue);
          box-shadow: 0 0 0 3px rgba(61,158,255,0.22);
        }
        .public-promo .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: linear-gradient(135deg, var(--promo-gold) 0%, var(--promo-gold-deep) 100%);
          color: #1a1200;
          font-weight: 700;
          border-radius: 999px;
          min-height: 48px;
          box-sizing: border-box;
          box-shadow: 0 0 24px rgba(255,229,102,0.35);
          transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
        }
        .public-promo .cta:active:not(:disabled) {
          transform: scale(0.98);
        }
        .public-promo .cta:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
        .public-promo .cta-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: rgba(61,158,255,0.08);
          color: var(--promo-gold);
          border: 1px solid rgba(255,229,102,0.4);
          font-weight: 600;
          border-radius: 999px;
          min-height: 48px;
          box-sizing: border-box;
        }
        .public-promo .chip {
          border-radius: 999px;
          border: 1px solid rgba(157,190,255,0.22);
          background: rgba(4,10,24,0.5);
          color: var(--promo-muted);
          padding: 0.55rem 0.9rem;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
          transition: border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
        }
        .public-promo .chip[data-active='true'] {
          border-color: rgba(255,229,102,0.7);
          background: rgba(255,229,102,0.14);
          color: var(--promo-gold);
          box-shadow: 0 0 16px rgba(255,229,102,0.2);
        }
        .public-promo .h-scroll {
          display: flex;
          gap: 0.5rem;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .public-promo .h-scroll::-webkit-scrollbar {
          display: none;
        }
        .public-promo .field-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
          min-width: 0;
        }
        @media (min-width: 420px) {
          .public-promo .field-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
        }
        @keyframes public-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes public-glow-line {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .public-promo .fade-up {
          animation: public-fade-up 0.5s ease both;
        }
        .public-promo .fade-up-delay {
          animation: public-fade-up 0.55s ease 0.1s both;
        }
        .public-promo .neon-line {
          height: 2px;
          width: 100%;
          background: linear-gradient(90deg, transparent, var(--promo-purple), var(--promo-blue), var(--promo-gold), transparent);
          animation: public-glow-line 2.8s ease-in-out infinite;
        }
        .public-promo .header-bar {
          background: linear-gradient(180deg, rgba(6,12,28,0.94) 0%, rgba(8,16,36,0.88) 100%);
          border-bottom: 1px solid rgba(61,158,255,0.18);
          backdrop-filter: blur(16px) saturate(1.25);
          -webkit-backdrop-filter: blur(16px) saturate(1.25);
          box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(196,77,255,0.12);
        }
        .public-promo .nav-pill {
          background: rgba(4,10,24,0.7);
          border: 1px solid rgba(157,190,255,0.2);
        }
        .public-promo .nav-pill a[data-active='true'] {
          background: linear-gradient(135deg, rgba(255,229,102,0.22), rgba(196,77,255,0.18));
          color: var(--promo-gold);
          font-weight: 600;
          box-shadow: 0 0 16px rgba(255,229,102,0.18);
        }
        @media (prefers-reduced-motion: reduce) {
          .public-promo .fade-up,
          .public-promo .fade-up-delay,
          .public-promo .ika-mark,
          .public-promo .neon-line {
            animation: none;
          }
        }
      `}</style>

      <header
        className="sticky top-0 z-30 w-full max-w-[100vw] header-bar"
        style={{ paddingTop: 'max(0.65rem, env(safe-area-inset-top))' }}
      >
        <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pb-3 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Link to="/dat-lich" className="flex items-center gap-3 min-w-0 group">
              <div className="ika-mark" aria-hidden>
                <span>IKA</span>
              </div>
              <div className="min-w-0">
                <p className="display text-[1.05rem] leading-none text-[var(--promo-gold)] truncate">
                  IKA
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--promo-ink)]/90 font-medium truncate mt-0.5 tracking-wide">
                  Recording Studio
                </p>
                <p className="text-[10px] text-[var(--promo-muted)] truncate mt-0.5">
                  Music Box · bring privacy to you
                </p>
              </div>
            </Link>

            <nav className="nav-pill flex items-center p-0.5 rounded-full shrink-0" aria-label="Điều hướng">
              <Link
                to="/dat-lich"
                data-active={active === 'book'}
                className={`px-3 py-2 text-xs rounded-full transition touch-manipulation ${
                  active === 'book' ? '' : 'text-[var(--promo-muted)]'
                }`}
              >
                Đặt lịch
              </Link>
              <Link
                to="/quay-thuong"
                data-active={active === 'spin'}
                className={`px-3 py-2 text-xs rounded-full transition touch-manipulation ${
                  active === 'spin' ? '' : 'text-[var(--promo-muted)]'
                }`}
              >
                Quay
              </Link>
            </nav>
          </div>
          <div className="neon-line rounded-full" aria-hidden />
        </div>
      </header>

      <main
        className={`relative z-10 flex-1 w-full max-w-lg mx-auto px-3 sm:px-4 pt-4 min-w-0 ${
          footer ? 'pb-28' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'
        }`}
      >
        {children}
      </main>

      {footer ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] header-bar border-t border-b-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pt-3 min-w-0">{footer}</div>
        </div>
      ) : null}
    </div>
  )
}
