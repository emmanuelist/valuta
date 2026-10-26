import { useAccount, useSwitchChain } from 'wagmi'
import { arc } from 'viem/chains'
import { useRouter } from './lib/router'
import { TopBar } from './components/TopBar'
import { HomePage } from './components/HomePage'
import { NewPayrollPage } from './components/NewPayrollPage'
import { LookupPage } from './components/LookupPage'
import { usePayrollList } from './hooks/useValutaData'

export default function App() {
  const { route } = useRouter()
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = !!address && chainId !== arc.id

  const { payrollCount, payrolls, isLoading, isError, refetch } = usePayrollList()

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ground)' }}>
      <TopBar currentPath={route.path} />

      {/* Wrong network banner */}
      {isWrongChain && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '8px 16px', fontSize: 14,
            background: 'var(--ambtint)',
            borderBottom: '1px solid var(--amber)',
            color: 'var(--amber)',
          }}
        >
          <span>Your wallet is on the wrong network.</span>
          <button
            onClick={() => { void switchChain({ chainId: arc.id }) }}
            style={{
              background: 'var(--amber)', color: '#fff', border: 'none',
              borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 13,
            }}
          >
            Switch to Arc
          </button>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {(route.path === '/' || route.path === '/payroll/:id') && (
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
        {route.path === '/new'    && <NewPayrollPage />}
        {route.path === '/lookup' && <LookupPage />}
      </main>
    </div>
  )
}
