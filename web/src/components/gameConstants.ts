export type MainTab = 'species' | 'evolution' | 'genetics' | 'world' | 'graphs' | 'chronicles' | 'menu'

export const MAIN_TABS: { id: MainTab; label: string; hotkey: string }[] = [
  { id: 'species', label: 'Espèces', hotkey: 'S' },
  { id: 'evolution', label: 'Évolution', hotkey: 'E' },
  { id: 'genetics', label: 'Génétique', hotkey: 'G' },
  { id: 'world', label: 'Monde', hotkey: 'M' },
  { id: 'graphs', label: 'Graphiques', hotkey: 'H' },
  { id: 'chronicles', label: 'Chroniques', hotkey: 'C' },
  { id: 'menu', label: 'Menu', hotkey: 'N' }
]

export const SPEED_TIERS = [1, 2, 5, 10, 20]
