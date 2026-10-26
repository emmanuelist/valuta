// TopBar — Valuta wordmark, nav links, live block, connect button
import { ConnectKitButton } from 'connectkit'
import { useLiveBlock } from '../hooks/useLiveBlock'
import { fmtNumber } from '../lib/format'

interface Props {
  currentPath: string
}

const NAV_LINKS = [
  { href: '/payroll/1', label: 'Payrolls' },
  { href: '/new',       label: 'New payroll' },
  { href: '/lookup',    label: 'Rate lookup' },
]

export function TopBar({ currentPath }: Props) {
  const blockNumber = useLiveBlock()

  const navigate = (href: string) => {
    history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <header
      style={{
        height: 63,
        background: 'var(--ground)',
        borderBottom: '1px solid var(--rule)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 21px',
        gap: 0,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Wordmark */}
      <button
        onClick={() => navigate('/')}
        style={{
          fontFamily: 'var(--font-words)',
          fontWeight: 600,
          fontSize: 30,
          color: 'var(--ink)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          letterSpacing: '-.01em',
          marginRight: 32,
        }}
        aria-label="Valuta home"
      >
        Valuta
      </button>

      {/* Nav links */}
      <nav
        className="topbar-links"
        style={{ display: 'flex', gap: 24, fontSize: 17 }}
        aria-label="Main navigation"
      >
        {NAV_LINKS.map(({ href, label }) => (
          <button
            key={href}
            onClick={() => navigate(href)}
            style={{
              fontFamily: 'var(--font-words)',
              fontSize: 17,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              color: currentPath.startsWith(href.split('/')[1] ? `/${href.split('/')[1]}` : '/')
                ? 'var(--petrol)' : 'var(--ink)',
              fontWeight: 400,
              textDecoration: 'none',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Live indicator */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          marginRight: 24,
        }}
        aria-live="polite"
        aria-label={`Arc mainnet block ${blockNumber ? fmtNumber(Number(blockNumber)) : '...'}`}
      >
        <div
          className="pulse-dot"
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--petrol)', flexShrink: 0,
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 14, color: 'var(--ink)' }}
        >
          Arc mainnet
          {blockNumber ? ` · block ${fmtNumber(Number(blockNumber))}` : ''}
        </span>
      </div>

      {/* Connect wallet */}
      <ConnectKitButton />
    </header>
  )
}
