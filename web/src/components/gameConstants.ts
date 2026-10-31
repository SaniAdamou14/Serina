export type MainTab = 'species' | 'evolution' | 'genetics' | 'world' | 'history' | 'menu'

export const MAIN_TABS: { id: MainTab; label: string; hotkey: string }[] = [
  { id: 'species', label: 'Espèces', hotkey: 'S' },
  { id: 'evolution', label: 'Évolution', hotkey: 'E' },
  { id: 'genetics', label: 'Génétique', hotkey: 'G' },
  { id: 'world', label: 'Monde', hotkey: 'M' },
  { id: 'history', label: 'Historique', hotkey: 'H' },
  { id: 'menu', label: 'Menu', hotkey: 'N' }
]

export const SPEED_TIERS = [1, 2, 5, 10, 20]
