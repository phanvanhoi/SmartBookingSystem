import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mic2 } from 'lucide-react'

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700&display=swap'

type PublicShellProps = {
  children: ReactNode
  active?: 'book' | 'spin'
  footer?: ReactNode
}

export default function PublicShell({ children, active = 'book', footer }: PublicShellProps) {
  useEffect(() => {
    const existing = document.querySelector(`link[href="${FONT_HREF}"]`)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    document.head.appendChild(link)
  }, [])

  return (
    <div className="public-promo min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden text-[#f4efe6] flex flex-col">
      <style>{`
        .public-promo {
          --promo-bg: #0b1220;
          --promo-panel: rgba(18, 28, 48, 0.92);
          --promo-gold: #e8b86d;
          --promo-gold-deep: #c9923f;
          --promo-ink: #f4efe6;
          --promo-muted: #9aa8c0;
          font-family: 'Manrope', system-ui, sans-serif;
          background:
            radial-gradient(ellipse 90% 45% at 50% -8%, rgba(232,184,109,0.2), transparent 55%),
            radial-gradient(ellipse 70% 40% at 100% 100%, rgba(56, 120, 180, 0.16), transparent 50%),
            linear-gradient(160deg, #070b14 0%, #0f1a2e 45%, #0b1220 100%);
          -webkit-tap-highlight-color: transparent;
        }
        .public-promo .display {
          font-family: 'Bebas Neue', Impact, sans-serif;
          letter-spacing: 0.04em;
        }
        .public-promo .panel {
          background: var(--promo-panel);
          border: 1px solid rgba(232,184,109,0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        /* 16px+ prevents iOS zoom; min-width:0 stops native date/select blowing the grid */
        .public-promo .field {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border-radius: 0.875rem;
          border: 1px solid rgba(154,168,192,0.28);
          background: rgba(7,11,20,0.55);
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
        }
        .public-promo select.field {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa8c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          padding-right: 2.5rem;
        }
        .public-promo .field:focus {
          border-color: var(--promo-gold);
          box-shadow: 0 0 0 3px rgba(232,184,109,0.15);
        }
        .public-promo .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: linear-gradient(135deg, var(--promo-gold) 0%, var(--promo-gold-deep) 100%);
          color: #1a1208;
          font-weight: 700;
          border-radius: 999px;
          min-height: 48px;
          box-sizing: border-box;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .public-promo .cta:active:not(:disabled) {
          transform: scale(0.98);
        }
        .public-promo .cta:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .public-promo .cta-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: transparent;
          color: var(--promo-gold);
          border: 1px solid rgba(232,184,109,0.4);
          font-weight: 600;
          border-radius: 999px;
          min-height: 48px;
          box-sizing: border-box;
        }
        .public-promo .chip {
          border-radius: 999px;
          border: 1px solid rgba(154,168,192,0.28);
          background: rgba(7,11,20,0.4);
          color: var(--promo-muted);
          padding: 0.55rem 0.9rem;
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .public-promo .chip[data-active='true'] {
          border-color: rgba(232,184,109,0.65);
          background: rgba(232,184,109,0.16);
          color: var(--promo-gold);
        }
        /* Horizontal scroller that cannot expand the page width */
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .public-promo .fade-up {
          animation: public-fade-up 0.45s ease both;
        }
        .public-promo .fade-up-delay {
          animation: public-fade-up 0.55s ease 0.08s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .public-promo .fade-up,
          .public-promo .fade-up-delay {
            animation: none;
          }
        }
      `}</style>

      <header
        className="sticky top-0 z-30 w-full max-w-[100vw] panel border-x-0 border-t-0 rounded-none"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pb-3 flex items-center justify-between gap-2 min-w-0">
          <Link to="/dat-lich" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-[rgba(232,184,109,0.15)] border border-[rgba(232,184,109,0.35)] flex items-center justify-center text-[var(--promo-gold)]">
              <Mic2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="display text-xl leading-none text-[var(--promo-gold)] truncate">MUSIC BOX</p>
            </div>
          </Link>

          <nav
            className="flex items-center p-0.5 rounded-full bg-[rgba(7,11,20,0.55)] border border-[rgba(154,168,192,0.2)] shrink-0"
            aria-label="Điều hướng"
          >
            <Link
              to="/dat-lich"
              className={`px-3 py-2 text-xs rounded-full transition touch-manipulation ${
                active === 'book'
                  ? 'bg-[rgba(232,184,109,0.22)] text-[var(--promo-gold)] font-semibold'
                  : 'text-[var(--promo-muted)]'
              }`}
            >
              Đặt lịch
            </Link>
            <Link
              to="/quay-thuong"
              className={`px-3 py-2 text-xs rounded-full transition touch-manipulation ${
                active === 'spin'
                  ? 'bg-[rgba(232,184,109,0.22)] text-[var(--promo-gold)] font-semibold'
                  : 'text-[var(--promo-muted)]'
              }`}
            >
              Quay
            </Link>
          </nav>
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
          className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] panel border-x-0 border-b-0 rounded-none"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="w-full max-w-lg mx-auto px-3 sm:px-4 pt-3 min-w-0">{footer}</div>
        </div>
      ) : null}
    </div>
  )
}
