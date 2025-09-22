#!/bin/bash
# Script de lancement unifié pour Serina Evolution Runner
# Usage: ./run_serina.sh [options]

# Configuration par défaut
GENERATIONS=0
SNAPSHOT_INTERVAL=100
LOG_INTERVAL=10
OUTPUT_DIR="results_$(date +%Y%m%d_%H%M%S)"
POPULATION=1000
MODE="advanced"
BINARY_PATH="build/bin/serina_runner"

# Si build pas trouvé, essayer autres emplacements
if [ ! -f "$BINARY_PATH" ]; then
    BINARY_PATH="build/serina_runner"
fi
if [ ! -f "$BINARY_PATH" ]; then
    BINARY_PATH="./serina_runner"
fi

echo "================================================"
echo "     SERINA EVOLUTION RUNNER - LANCEMENT"
echo "================================================"
echo

# Vérifier que l'exécutable existe
if [ ! -f "$BINARY_PATH" ]; then
    echo "ERREUR: Executable non trouvé: $BINARY_PATH"
    echo
    echo "Compilez d'abord le projet:"
    echo "  cmake -S . -B build -DBUILD_TESTS=ON -DBUILD_PYTHON_MODULE=ON"
    echo "  cmake --build build --config Release"
    echo
    exit 1
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -g|--generations)
            GENERATIONS="$2"
            shift 2
            ;;
        -s|--snapshot)
            SNAPSHOT_INTERVAL="$2"
            shift 2
            ;;
        -l|--log)
            LOG_INTERVAL="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -p|--population)
            POPULATION="$2"
            shift 2
            ;;
        --simple)
            MODE="simple"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo
            echo "Options:"
            echo "  -g, --generations N     Nombre de générations (0 = infini)"
            echo "  -s, --snapshot N        Intervalle snapshots (défaut: 100)"
            echo "  -l, --log N             Intervalle logs (défaut: 10)"
            echo "  -o, --output DIR        Répertoire sortie"
            echo "  -p, --population N      Taille population (défaut: 1000)"
            echo "  --simple                Mode simple (sans PopulationManager)"
            echo "  -h, --help              Cette aide"
            echo
            echo "Exemples:"
            echo "  $0                      (simulation infinie avec paramètres par défaut)"
            echo "  $0 -g 1000 -s 50        (1000 générations, snapshots/50)"
            echo "  $0 -o mon_experience    (sortie dans dossier spécifique)"
            exit 0
            ;;
        *)
            echo "Argument inconnu: $1"
            echo "Utilisez -h pour l'aide"
            exit 1
            ;;
    esac
done

echo "Configuration:"
echo "  Générations: $GENERATIONS (0 = infini)"
echo "  Snapshots chaque: $SNAPSHOT_INTERVAL générations"
echo "  Logs chaque: $LOG_INTERVAL générations"
echo "  Répertoire sortie: $OUTPUT_DIR"
echo "  Population: $POPULATION"
echo "  Mode: $MODE"
echo "  Exécutable: $BINARY_PATH"
echo

# Construire arguments
CMD_ARGS="-g $GENERATIONS -s $SNAPSHOT_INTERVAL -l $LOG_INTERVAL -o $OUTPUT_DIR -p $POPULATION"
if [ "$MODE" = "simple" ]; then
    CMD_ARGS="$CMD_ARGS --simple"
fi

echo "Lancement de la simulation..."
echo "Commande: $BINARY_PATH $CMD_ARGS"
echo
echo "[Ctrl+C pour arrêter proprement]"
echo

# Lancement avec gestion du signal
trap 'echo; echo "Arrêt demandé..."; kill $PID 2>/dev/null; wait $PID 2>/dev/null; exit 0' SIGINT SIGTERM

$BINARY_PATH $CMD_ARGS &
PID=$!
wait $PID

echo
echo "================================================"
echo "Simulation terminée. Résultats dans: $OUTPUT_DIR"
echo "================================================"