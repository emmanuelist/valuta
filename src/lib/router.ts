// Tiny History-API router — no dependency

import { useState, useEffect, useCallback } from 'react'

export interface Route {
  path: string     // e.g. "/payroll/3"
  params: Record<string, string>
  search: URLSearchParams
}

function parseRoute(location: Location): Route {
  const { pathname, search } = location
  const sp = new URLSearchParams(search)

  // /payroll/:id
  const payrollMatch = pathname.match(/^\/payroll\/(\d+)$/)
  if (payrollMatch) {
    return { path: '/payroll/:id', params: { id: payrollMatch[1] }, search: sp }
  }
  // /new
  if (pathname === '/new') return { path: '/new', params: {}, search: sp }
  // /lookup
  if (pathname === '/lookup') return { path: '/lookup', params: {}, search: sp }
  // home
  return { path: '/', params: {}, search: sp }
}

export function useRouter(): { route: Route; navigate: (to: string) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location))

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to)
    setRoute(parseRoute(window.location))
  }, [])

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location))
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return { route, navigate }
}

export function navigate(to: string) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
