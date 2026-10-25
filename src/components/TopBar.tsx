import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { navigate } from '../lib/router'

interface Props {
  currentPath: string
}

const LINKS = [
  { label: 'Payrolls',     to: '/'       },
  { label: 'New payroll',  to: '/new'    },
  { label: 'Rate lookup',  to: '/lookup' },
]

export function TopBar({ currentPath }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNav = (to: string) => {
    navigate(to)
    setMenuOpen(false)
  }

  return (
    <header
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rules)' }}
      className="sticky top-0 z-50 h-[72px] flex items-center px-7"
    >
      {/* Wordmark */}
      <button
        onClick={() => handleNav('/')}
        className="text-[34px] font-medium leading-none mr-8 focus-visible:outline-none"
        style={{ color: 'var(--ink)', fontFamily: '"Radio Canada Big"' }}
      >
        Valuta
      </button>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8 flex-1">
        {LINKS.map(link => (
          <button
            key={link.to}
            onClick={() => handleNav(link.to)}
            className="text-[18px] transition-opacity"
            style={{
              color:   currentPath === link.to ? 'var(--petrol)' : 'var(--ink)',
              opacity: currentPath === link.to ? 1 : 0.75,
              fontWeight: currentPath === link.to ? 500 : 400,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Desktop connect button */}
      <div className="hidden md:block ml-auto">
        <ConnectKitButton.Custom>
          {({ isConnected, show, address, chain }) => (
            <button
              onClick={show}
              className="px-5 h-11 text-[16px] font-medium rounded-btn transition-opacity hover:opacity-90"
              style={{
                background: 'var(--petrol)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                minWidth: '157px',
              }}
            >
              {isConnected && address
                ? `${address.slice(0, 6)}…${address.slice(-4)} · ${chain?.name ?? 'Arc'}`
                : 'Connect wallet'
              }
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>

      {/* Mobile menu button */}
      <button
        className="md:hidden ml-auto p-2"
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Menu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-[72px] left-0 right-0 z-50 flex flex-col gap-1 px-4 py-4"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rules)' }}
        >
          {LINKS.map(link => (
            <button
              key={link.to}
              onClick={() => handleNav(link.to)}
              className="text-left px-3 py-3 text-[17px] rounded-btn"
              style={{
                background: currentPath === link.to ? 'var(--ptint)' : 'none',
                color:      currentPath === link.to ? 'var(--petrol)' : 'var(--ink)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: currentPath === link.to ? 500 : 400,
              }}
            >
              {link.label}
            </button>
          ))}
          <div className="mt-2">
            <ConnectKitButton />
          </div>
        </div>
      )}
    </header>
  )
}
