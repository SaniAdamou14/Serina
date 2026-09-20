import { Map as MapIcon, BarChart3, GitBranch, Dna, PawPrint } from 'lucide-react'

export type DashboardTab = 'map' | 'overview' | 'genetics' | 'evolution' | 'species'

const TABS: { id: DashboardTab; label: string; icon: typeof MapIcon }[] = [
  { id: 'map', label: 'Carte', icon: MapIcon },
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'evolution', label: 'Évolution', icon: GitBranch },
  { id: 'genetics', label: 'Génétique', icon: Dna },
  { id: 'species', label: 'Espèces', icon: PawPrint }
]

/**
 * Rail d'icônes vertical façon RimWorld, remplace les onglets horizontaux
 * du haut : la barre du haut est désormais réservée aux vraies stats
 * globales (TopBar.tsx), toujours visibles quel que soit l'onglet actif.
 */
export function LeftRail({ activeTab, onSelectTab }: { activeTab: DashboardTab; onSelectTab: (tab: DashboardTab) => void }) {
  return (
    <nav className="w-16 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-3 gap-1">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            title={tab.label}
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? 'bg-primary-950 text-primary-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] leading-none">{tab.label.split(' ')[0]}</span>
          </button>
        )
      })}
    </nav>
  )
}
