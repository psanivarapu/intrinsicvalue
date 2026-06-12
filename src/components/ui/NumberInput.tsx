import type { ReactNode } from 'react'
import type { FieldSource } from '../../types'
import { ProvenanceBadge } from './ProvenanceBadge'
import { Tooltip } from './Tooltip'

interface NumberInputProps {
  label: string
  value: number | ''
  onChange: (v: number | '') => void
  unit?: string
  placeholder?: string
  tooltip?: ReactNode
  min?: number
  max?: number
  step?: number
  warning?: string
  error?: string
  className?: string
  // Provenance
  source?: FieldSource
  asOf?: string
  screenerHref?: string
  compact?: boolean
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  tooltip,
  min,
  max,
  step = 0.01,
  warning,
  error,
  className = '',
  source,
  asOf,
  screenerHref,
  compact = false,
}: NumberInputProps) {
  return (
    <div className={`${compact ? 'mb-1.5' : 'mb-3'} ${className}`}>
      <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1 flex-wrap">
        <span>{label}</span>
        {unit && <span className="text-gray-400 font-normal text-xs">({unit})</span>}
        {source && <ProvenanceBadge source={source} asOf={asOf} screenerHref={screenerHref} />}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <input
        type="number"
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors
          ${error ? 'border-red-400 focus:ring-red-300 bg-red-50'
            : warning ? 'border-amber-400 focus:ring-amber-300'
            : source === 'fetched' ? 'border-blue-300 focus:ring-blue-300 bg-blue-50/30'
            : source === 'edited' ? 'border-green-300 focus:ring-green-300 bg-green-50/30'
            : 'border-gray-300 focus:ring-blue-300'
          }
        `}
        value={value === '' ? '' : value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const v = e.target.value
          if (v === '' || v === '-') onChange('')
          else {
            const n = parseFloat(v)
            if (!isNaN(n)) onChange(n)
          }
        }}
      />
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
      {!error && warning && <p className="mt-0.5 text-xs text-amber-600">{warning}</p>}
    </div>
  )
}
