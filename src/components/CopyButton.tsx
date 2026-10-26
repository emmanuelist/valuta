// CopyButton — copy text to clipboard with 1.5 s "Copied" confirmation
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  value: string
  label?: string
}

export function CopyButton({ value, label }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // fallback: create textarea
      const el = document.createElement('textarea')
      el.value = value; el.style.position = 'fixed'; el.style.opacity = '0'
      document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Copied' : `Copy ${label ?? value}`}
      title={copied ? 'Copied!' : 'Copy'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 4px', color: copied ? 'var(--petrol)' : 'var(--secondary)',
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontFamily: 'var(--font-words)', fontSize: 11,
        minHeight: 32,
        transition: 'color .15s',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span style={{ opacity: copied ? 1 : 0.7 }}>{copied ? 'Copied' : ''}</span>
    </button>
  )
}
