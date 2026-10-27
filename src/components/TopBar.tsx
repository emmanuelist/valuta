// TopBar — wordmark, nav, live block, connect button (petrol filled), mobile drawer
import { useState, useEffect, useRef } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Menu, X } from 'lucide-react'
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

function navActive(href: string, path: string): boolean {
  const seg = href.split('/')[1]
  if (!seg) return path === '/'
  return path.startsWith(`/${seg}`)
}

export function TopBar({ currentPath }: Props) {
  const blockNumber = useLiveBlock()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  const navigate = (href: string) => {
    history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setDrawerOpen(false)
  }

  // Close on outside click / Escape
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawerOpen(false); menuBtnRef.current?.focus() } }
    const onClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [drawerOpen])

  // Focus trap inside drawer
  useEffect(() => {
    if (!drawerOpen || !drawerRef.current) return
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>('button, a, [tabindex]')
    const first = focusable[0]; const last = focusable[focusable.length - 1]
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus() } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first?.focus() } }
    }
    document.addEventListener('keydown', trap)
    first?.focus()
    return () => document.removeEventListener('keydown', trap)
  }, [drawerOpen])

  const blockLabel = blockNumber ? `Arc mainnet · block ${fmtNumber(Number(blockNumber))}` : 'Arc mainnet'

  return (
    <>
      <header
        style={{
          height: 63,
          background: 'var(--ground)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 21px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Mark + Wordmark */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, marginRight: 28,
          }}
          aria-label="Valuta home"
        >
          <img
            src="/valuta-mark.svg"
            alt=""
            aria-hidden="true"
            className="topbar-mark"
            style={{ width: 28, height: 28, flexShrink: 0 }}
          />
          <span
            style={{
              fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 28,
              color: 'var(--ink)', lineHeight: 1, letterSpacing: '-.01em',
            }}
          >
            Valuta
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="topbar-links" style={{ display: 'flex', gap: 22, fontSize: 16 }} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              aria-current={navActive(href, currentPath) ? 'page' : undefined}
              style={{
                fontFamily: 'var(--font-words)', fontSize: 16, background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 0',
                color: navActive(href, currentPath) ? 'var(--petrol)' : 'var(--ink)',
                fontWeight: navActive(href, currentPath) ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Live block indicator */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 20 }}
          aria-live="polite"
          aria-label={blockLabel}
          className="topbar-block"
        >
          <div
            className="pulse-dot"
            style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--petrol)', flexShrink: 0 }}
          />
          <span className="mono" style={{ fontSize: 13, color: 'var(--secondary)', whiteSpace: 'nowrap' }}>
            {blockLabel}
          </span>
        </div>

        {/* Connect button (petrol filled, custom ConnectKit theme) */}
        <div className="topbar-connect">
          <ConnectKitButton.Custom>
            {({ isConnected, isConnecting, show, truncatedAddress, ensName }) => (
              <button
                onClick={show}
                style={{
                  background: 'var(--petrol)', color: '#fff',
                  border: 'none', borderRadius: 6,
                  padding: '0 18px', height: 42, minWidth: 130,
                  fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 15,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  letterSpacing: '.01em',
                }}
              >
                {isConnecting ? 'Connecting…' : isConnected ? (ensName ?? truncatedAddress ?? 'Account') : 'Connect wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuBtnRef}
          className="topbar-menu-btn"
          onClick={() => setDrawerOpen(o => !o)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          style={{
            display: 'none', background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, color: 'var(--ink)',
          }}
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(14,27,38,.35)',
          }}
          aria-hidden="true"
        />
      )}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
          width: 260,
          background: 'var(--paper)',
          borderLeft: '1px solid var(--rule)',
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 4,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .2s ease',
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          style={{
            alignSelf: 'flex-end', background: 'none', border: 'none',
            cursor: 'pointer', padding: 4, color: 'var(--ink)', marginBottom: 12,
          }}
        >
          <X size={22} />
        </button>
        {NAV_LINKS.map(({ href, label }) => (
          <button
            key={href}
            onClick={() => navigate(href)}
            aria-current={navActive(href, currentPath) ? 'page' : undefined}
            style={{
              fontFamily: 'var(--font-words)', fontSize: 18, background: 'none',
              border: 'none', cursor: 'pointer', padding: '12px 0',
              textAlign: 'left', minHeight: 44,
              color: navActive(href, currentPath) ? 'var(--petrol)' : 'var(--ink)',
              fontWeight: navActive(href, currentPath) ? 500 : 400,
              borderBottom: '1px solid var(--rule)',
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ marginTop: 24 }}>
          <ConnectKitButton.Custom>
            {({ isConnected, isConnecting, show, truncatedAddress, ensName }) => (
              <button
                onClick={() => { show?.(); setDrawerOpen(false) }}
                style={{
                  background: 'var(--petrol)', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '12px 18px', width: '100%', minHeight: 44,
                  fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {isConnecting ? 'Connecting…' : isConnected ? (ensName ?? truncatedAddress ?? 'Account') : 'Connect wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>
    </>
  )
}
