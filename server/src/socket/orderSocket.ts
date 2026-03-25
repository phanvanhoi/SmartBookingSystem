// ── Order Socket Helper ──────────────────────────────────────────────────────
// Order events are emitted from order.service when needed.
// This file provides re-exported helpers for convenience.

export {
  emitOrderNew,
  emitOrderStatusChanged,
} from './socketManager'
