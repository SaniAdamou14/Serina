interface LoadingScreenProps {
  message?: string
}

/** Écran affiché pendant le court délai fixe d'initialisation
 * (App.tsx, ~2s) avant le tableau de bord réel. Ne montre aucun statut
 * de service inventé (l'ancienne version affichait "Genetic Engine ✓ Ready"
 * / "Physics Simulation ✓ Ready" sans qu'aucune vérification réelle n'ait
 * lieu à ce stade) -- la vraie santé des services est vérifiée et affichée
 * une fois le tableau de bord chargé (voir PerformanceMetrics.tsx). */
export function LoadingScreen({ message = "Initialisation de Serina..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Animated DNA Helix */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 animate-spin">
            <div className="w-full h-full border-4 border-slate-700 border-t-primary-500 rounded-full"></div>
          </div>
          <div className="absolute inset-2 animate-pulse">
            <div className="w-full h-full border-2 border-slate-700 border-b-genetic-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
        </div>

        {/* Serina Logo */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gradient">
            🧬 Serina
          </h1>
          <p className="text-lg text-slate-400 font-medium">
            Simulateur d'écosystème évolutif
          </p>
        </div>

        {/* Loading Message */}
        <div className="space-y-3">
          <p className="text-slate-300">
            {message}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* Version Info */}
        <p className="text-xs text-slate-500">
          Version 1.0.0 • C++20 & React
        </p>
      </div>
    </div>
  )
}
