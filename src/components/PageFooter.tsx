// PageFooter — the imprint
// Three columns over a top hairline.
import { ARC_EXPLORER, VALUTA_ADDRESS } from '../contracts/abi'
import { truncAddr } from '../lib/format'
import { useLiveBlock } from '../hooks/useLiveBlock'
import { fmtNumber } from '../lib/format'

export function PageFooter() {
  const blockNumber = useLiveBlock()

  const truncContract = truncAddr(VALUTA_ADDRESS, 6, 4)
  const blockStr = blockNumber ? fmtNumber(Number(blockNumber)) : '…'

  return (
    <footer
      style={{
        maxWidth: 1344,
        margin: '56px auto 0',
        padding: '24px 27px 48px',
        borderTop: '1px solid var(--rule)',
      }}
    >
      <div className="footer-cols">
        {/* Column 1: Built in Arc Studio */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-words)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--ink)',
              marginBottom: 10,
            }}
          >
            Built in Arc Studio.
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--secondary)', fontFamily: 'var(--font-words)', lineHeight: 1.6 }}>
            Arc Studio wrote the contract, its tests and this app. Every prompt is published.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a
              href="https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 15, color: 'var(--petrol)', fontFamily: 'var(--font-words)' }}
            >
              Studio project ↗
            </a>
            <a
              href="https://github.com/emmanuelist/valuta/tree/main/prompts"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 15, color: 'var(--petrol)', fontFamily: 'var(--font-words)' }}
            >
              The prompts ↗
            </a>
            <a
              href="https://github.com/emmanuelist/valuta"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 15, color: 'var(--petrol)', fontFamily: 'var(--font-words)' }}
            >
              Source ↗
            </a>
          </div>
        </div>

        {/* Column 2: Stated plainly */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-words)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--ink)',
              marginBottom: 10,
            }}
          >
            Stated plainly.
          </div>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--secondary)', fontFamily: 'var(--font-words)', lineHeight: 1.6 }}>
            Unaudited. The demo payrolls are the builder's own wallets. Arc Studio deploys to testnet
            only, so its exact source was deployed to Arc mainnet and verified:{' '}
            <a
              href={`https://repo.sourcify.dev/5042/${VALUTA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--petrol)' }}
            >
              Sourcify, exact match ↗
            </a>
            . FX rounds arrive 7 to 24 hours apart. A payday prices at the round live then,
            or at the next round if that one was over 25 hours old.
          </p>
        </div>

        {/* Column 3: On Arc mainnet */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-words)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--ink)',
              marginBottom: 10,
            }}
          >
            On Arc mainnet.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a
              href={`${ARC_EXPLORER}/address/${VALUTA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: 14, color: 'var(--petrol)' }}
            >
              Valuta {truncContract} ↗
            </a>
            <div className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
              chain 5042
            </div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
              reading block {blockStr}
            </div>
          </div>

          {/* Arc Studio badge */}
          <a
            href="https://studio.arc.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 20,
              padding: '7px 14px',
              background: 'rgba(172, 198, 233, 0.85)',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.4)',
              textDecoration: 'none',
              color: '#1B3158',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-words)',
            }}
          >
            <svg width="14" height="16" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M0 21.5001C0.167192 16.2366 1.02308 11.3243 2.45378 7.50459C4.26573 2.66517 6.88869 0 9.83904 0C12.7894 0 15.412 2.66517 17.2243 7.50459C18.1669 10.0216 18.8605 13.0121 19.2713 16.2655C19.3081 16.556 19.3393 16.8513 19.3714 17.146C19.3819 17.1642 19.3881 17.1811 19.386 17.1949C19.386 17.1949 19.6275 18.7674 19.6788 21.5001H19.6515C19.2934 21.1937 15.0694 17.7329 8.06739 18.735C8.17304 17.4996 8.31833 16.2974 8.50603 15.1452C8.51562 15.0863 8.52671 15.0294 8.53649 14.9709C11.2828 14.8846 13.6866 15.2171 15.5299 15.6529C15.5231 15.6073 15.5173 15.5603 15.5103 15.5149C15.1314 13.0547 14.5724 10.8024 13.8517 8.87761C12.6732 5.73037 11.1354 3.77496 9.83904 3.77496C8.54269 3.77496 7.00493 5.73037 5.82649 8.87761C5.54123 9.63889 5.28154 10.4508 5.04866 11.3071C4.72126 12.507 4.44621 13.7934 4.22654 15.1451C3.90141 17.1412 3.69827 19.2821 3.62345 21.5001H0Z" fill="currentColor"/>
            </svg>
            Built with Arc Studio
          </a>
        </div>
      </div>
    </footer>
  )
}
