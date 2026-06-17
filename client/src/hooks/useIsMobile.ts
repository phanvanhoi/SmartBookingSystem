import { useEffect, useState } from 'react'

/** Matches Tailwind `md` breakpoint — viewport narrower than 768px. */
const MOBILE_MEDIA = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MEDIA).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
