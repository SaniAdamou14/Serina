@echo off
REM Script de lancement unifié pour Serina Evolution Runner
REM Usage: run_serina.bat [options]

setlocal

REM Configuration par défaut
set GENERATIONS=0
set SNAPSHOT_INTERVAL=100
set LOG_INTERVAL=10
set OUTPUT_DIR=results_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set POPULATION=1000
set MODE=advanced
set BINARY_PATH=build\bin\Release\serina_runner.exe

REM Si build pas trouvé, essayer autres emplacements
if not exist "%BINARY_PATH%" set BINARY_PATH=build\bin\Debug\serina_runner.exe
if not exist "%BINARY_PATH%" set BINARY_PATH=build\Release\serina_runner.exe
if not exist "%BINARY_PATH%" set BINARY_PATH=build\src\Release\serina_runner.exe
if not exist "%BINARY_PATH%" set BINARY_PATH=build\src\Debug\serina_runner.exe

echo ================================================
echo     SERINA EVOLUTION RUNNER - LANCEMENT
echo ================================================
echo.

REM Vérifier que l'exécutable existe
if not exist "%BINARY_PATH%" (
    echo ERREUR: Executable non trouve: %BINARY_PATH%
    echo.
    echo Compilez d'abord le projet:
    echo   cmake -S . -B build -DBUILD_TESTS=ON -DBUILD_PYTHON_MODULE=ON
    echo   cmake --build build --config Release
    echo.
    pause
    exit /b 1
)

REM Parse arguments simples
:parse_args
if "%1"=="" goto run_simulation
if "%1"=="-g" (
    set GENERATIONS=%2
    shift
    shift
    goto parse_args
)
if "%1"=="-s" (
    set SNAPSHOT_INTERVAL=%2
    shift
    shift
    goto parse_args
)
if "%1"=="-l" (
    set LOG_INTERVAL=%2
    shift
    shift
    goto parse_args
)
if "%1"=="-o" (
    set OUTPUT_DIR=%2
    shift
    shift
    goto parse_args
)
if "%1"=="-p" (
    set POPULATION=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--simple" (
    set MODE=simple
    shift
    goto parse_args
)
if "%1"=="-h" (
    echo Usage: %0 [options]
    echo.
    echo Options:
    echo   -g N      Nombre de generations (0 = infini)
    echo   -s N      Intervalle snapshots (defaut: 100)
    echo   -l N      Intervalle logs (defaut: 10)
    echo   -o DIR    Repertoire sortie
    echo   -p N      Taille population (defaut: 1000)
    echo   --simple  Mode simple (sans PopulationManager)
    echo   -h        Cette aide
    echo.
    echo Exemples:
    echo   %0                    (simulation infinie avec parametres par defaut)
    echo   %0 -g 1000 -s 50      (1000 generations, snapshots/50)
    echo   %0 -o mon_experience  (sortie dans dossier specifique)
    pause
    exit /b 0
)
shift
goto parse_args

:run_simulation
REM Remplacer les caractères spéciaux dans OUTPUT_DIR
set OUTPUT_DIR=%OUTPUT_DIR::=%
set OUTPUT_DIR=%OUTPUT_DIR: =%

echo Configuration:
echo   Generations: %GENERATIONS% (0 = infini)
echo   Snapshots chaque: %GENERATIONS% generations
echo   Logs chaque: %LOG_INTERVAL% generations  
echo   Repertoire sortie: %OUTPUT_DIR%
echo   Population: %POPULATION%
echo   Mode: %MODE%
echo   Executable: %BINARY_PATH%
echo.

REM Créer commande
set CMD_ARGS=-g %GENERATIONS% -s %SNAPSHOT_INTERVAL% -l %LOG_INTERVAL% -o %OUTPUT_DIR% -p %POPULATION%
if "%MODE%"=="simple" set CMD_ARGS=%CMD_ARGS% --simple

echo Lancement de la simulation...
echo Commande: "%BINARY_PATH%" %CMD_ARGS%
echo.
echo [Ctrl+C pour arreter proprement]
echo.

REM Lancement
"%BINARY_PATH%" %CMD_ARGS%

echo.
echo ================================================
echo Simulation terminee. Resultats dans: %OUTPUT_DIR%
echo ================================================
pause