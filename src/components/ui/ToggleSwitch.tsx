interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  labelOff?: string
  labelOn?: string
}

export function ToggleSwitch({ checked, onChange, labelOff = 'Simple', labelOn = 'Advanced' }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${!checked ? 'text-blue-700' : 'text-gray-400'}`}>{labelOff}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
      <span className={`text-xs font-medium ${checked ? 'text-blue-700' : 'text-gray-400'}`}>{labelOn}</span>
    </div>
  )
}
