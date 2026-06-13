import { ValuationProvider, useValuation } from './context/ValuationContext'
import { StockSetupPanel } from './components/StockSetupPanel'
import { DCFTab } from './components/tabs/DCFTab'
import { PETab } from './components/tabs/PETab'
import { RITab } from './components/tabs/RITab'
import { EVTab } from './components/tabs/EVTab'
import { ComparisonDashboard } from './components/ComparisonDashboard'
import { GraduationCap } from 'lucide-react'

const TABS = [
  { id: 'dcf' as const, label: 'DCF' },
  { id: 'pe' as const, label: 'PE Multiple' },
  { id: 'ri' as const, label: 'Residual Income' },
  { id: 'ev' as const, label: 'EV/EBITDA' },
]

function AppInner() {
  const { state, dispatch } = useValuation()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-blue-600" size={24} />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Intrinsic Value Workbench</h1>
            <p className="text-xs text-gray-500">India (NSE/BSE) · DCF · PE · Residual Income · EV/EBITDA</p>
          </div>
          <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
            Educational Tool
          </span>
        </div>

        <button
          onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}
          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
        >
          Load sample data
        </button>
      </header>

      {/* Sticky setup panel */}
      <div className="sticky top-0 z-30 shadow-sm">
        <StockSetupPanel />
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 sticky top-0 z-20 shadow-[0_3px_10px_rgba(0,0,0,0.07)]">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const active = state.activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-[3px] transition-all ${
                  active
                    ? 'border-blue-600 text-blue-700 bg-blue-50/70 shadow-[inset_0_-2px_6px_rgba(37,99,235,0.08)]'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {state.activeTab === 'dcf' && <DCFTab />}
        {state.activeTab === 'pe' && <PETab />}
        {state.activeTab === 'ri' && <RITab />}
        {state.activeTab === 'ev' && <EVTab />}

        <ComparisonDashboard />
      </main>

      {/* Persistent compliance footer */}
      <footer className="bg-gray-100 border-t border-gray-200 px-4 py-3 text-center text-xs text-gray-500 leading-relaxed">
        This is an educational calculator. Pre-filled data comes from third-party sources (Yahoo Finance) and may be inaccurate
        or delayed — verify before use. All results are computed from numbers you confirm and assumptions you choose.
        Nothing here is investment advice or a recommendation. We are not SEBI-registered investment advisers or research analysts.
        Consult a SEBI-registered adviser before making investment decisions.
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ValuationProvider>
      <AppInner />
    </ValuationProvider>
  )
}
