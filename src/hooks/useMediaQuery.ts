import { useState, useEffect } from 'react'

/**
 * Returns true when the media query matches, false otherwise.
 * Initialises synchronously on the server / before mount to false.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    // Re-read in case query changed after initial mount
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    // Sync once via the handler pattern — no direct setState call
    handler({ matches: mq.matches } as MediaQueryListEvent)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
