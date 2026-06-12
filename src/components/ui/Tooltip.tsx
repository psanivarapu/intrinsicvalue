import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: React.ReactNode
}

export function Tooltip({ content }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="text-gray-400 hover:text-blue-500 transition-colors"
        onClick={() => setOpen(v => !v)}
        aria-label="Help"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 leading-relaxed">
          {content}
        </div>
      )}
    </div>
  )
}
