import { MAIN_TABS, MainTab } from './gameConstants'

/** Barre d'onglets en bas de l'écran, façon RimWorld : chaque onglet ouvre sa fenêtre. */
export function MainTabBar({ activeTab, onSelect }: { activeTab: MainTab | null; onSelect: (tab: MainTab) => void }) {
  return (
    <nav className="absolute left-0 right-0 bottom-0 h-9 z-40 flex bg-slate-900 border-t border-slate-600">
      {MAIN_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          title={`${tab.label} (${tab.hotkey})`}
          aria-pressed={activeTab === tab.id}
          className={`flex-1 max-w-[170px] border-r border-slate-700 text-sm font-semibold ${
            activeTab === tab.id ? 'bg-primary-800 text-primary-300' : 'text-slate-200 hover:bg-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
