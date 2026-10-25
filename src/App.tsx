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

  const { payrollCount, payrolls, featured, totalPaydays, isLoading, isError, refetch } = usePayrollList()

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ground)' }}>
      <TopBar currentPath={route.path} />

      {/* Wrong network banner */}
      {isWrongChain && (
        <div
          className="flex items-center justify-center gap-3 px-4 py-2 text-[14px]"
          style={{ background: '#FEF3E2', borderBottom: '1px solid var(--amber)', color: 'var(--amber)' }}
        >
          <span>Your wallet is on the wrong network.</span>
          <button
            onClick={() => switchChain({ chainId: arc.id })}
            className="px-3 py-1 rounded-btn text-[13px] font-medium"
            style={{ background: 'var(--amber)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Switch to Arc
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {route.path === '/' && (
          <HomePage
            payrolls={payrolls}
            payrollCount={payrollCount}
            totalPaydays={totalPaydays}
            featuredId={featured?.id ?? null}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
          />
        )}

        {route.path === '/payroll/:id' && (
          <HomePage
            payrolls={payrolls}
            payrollCount={payrollCount}
            totalPaydays={totalPaydays}
            featuredId={featured?.id ?? null}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            targetId={parseInt(route.params.id)}
            initialPayday={route.search.has('payday') ? parseInt(route.search.get('payday')!) : undefined}
          />
        )}

        {route.path === '/new' && <NewPayrollPage />}

        {route.path === '/lookup' && <LookupPage />}
      </main>
    </div>
  )
}
