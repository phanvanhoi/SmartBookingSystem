/**
 * Simple audio alerts using Web Audio API.
 * No external sound files needed.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    gainNode.gain.value = volume

    // Fade out to avoid click
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

/** Phòng sắp hết giờ - 2 beep nhẹ */
export function playWarningSound() {
  playTone(880, 0.15, 'sine', 0.2)
  setTimeout(() => playTone(880, 0.15, 'sine', 0.2), 200)
}

/** Phòng đã hết giờ - 3 beep nhanh cao */
export function playExpiredSound() {
  playTone(1000, 0.12, 'square', 0.15)
  setTimeout(() => playTone(1200, 0.12, 'square', 0.15), 160)
  setTimeout(() => playTone(1400, 0.12, 'square', 0.15), 320)
}

/** Order mới - 1 ding nhẹ */
export function playOrderSound() {
  playTone(660, 0.2, 'sine', 0.15)
}
