import { lazy, Suspense } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { arc } from 'viem/chains'
import { useRouter } from './lib/router'
import { TopBar } from './components/TopBar'
import { HomePage } from './components/HomePage'
import { usePayrollList } from './hooks/useValutaData'

// Lazy-load secondary pages to keep the initial bundle small
const NewPayrollPage = lazy(() => import('./components/NewPayrollPage').then(m => ({ default: m.NewPayrollPage })))
const LookupPage     = lazy(() => import('./components/LookupPage').then(m => ({ default: m.LookupPage })))

function PageFallback() {
  return (
    <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, margin: '0 auto' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 20, width: `${75 - i * 10}%`, borderRadius: 4 }} />
      ))}
    </div>
  )
}

export default function App() {
  const { route } = useRouter()
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = !!address && chainId !== arc.id

  const { payrollCount, payrolls, isLoading, isError, refetch } = usePayrollList()

  const isHomePath = route.path === '/' || route.path === '/payroll/:id'

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ground)' }}>
      <TopBar currentPath={route.path} />

      {/* Wrong network banner */}
      {isWrongChain && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '8px 16px', fontSize: 14,
            background: 'var(--ambtint)', borderBottom: '1px solid var(--amber)',
            color: 'var(--amber)',
          }}
        >
          <span>Your wallet is on the wrong network.</span>
          <button
            onClick={() => { void switchChain({ chainId: arc.id }) }}
            style={{
              background: 'var(--amber)', color: '#fff', border: 'none',
              borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 13, minHeight: 36,
            }}
          >
            Switch to Arc
          </button>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isHomePath && (
          <HomePage
            payrolls={payrolls}
            payrollCount={payrollCount}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            targetId={route.path === '/payroll/:id' ? parseInt(route.params.id) : undefined}
            initialPayday={
              route.path === '/payroll/:id' && route.search.has('payday')
                ? parseInt(route.search.get('payday')!)
                : undefined
            }
          />
        )}
        {route.path === '/new' && (
          <Suspense fallback={<PageFallback />}>
            <NewPayrollPage />
          </Suspense>
        )}
        {route.path === '/lookup' && (
          <Suspense fallback={<PageFallback />}>
            <LookupPage />
          </Suspense>
        )}
      </main>
    </div>
  )
}
