@echo off
REM ====================================================
REM 🌍 SERINA - Lanceur de Simulation Évolutionnaire
REM ====================================================
REM Script de lancement unifié pour le projet Serina
REM Compile le moteur C++ et lance la visualisation Python

echo.
echo 🌍 ================================================
echo 🌍 SERINA - World of Birds Evolution Simulator
echo 🌍 ================================================
echo 🎯 Lancement de la simulation évolutionnaire complète
echo 🧬 Moteur C++ + Visualisation Python en temps réel
echo 🌍 ================================================
echo.

REM Vérification des prérequis
echo 📋 Vérification des prérequis...

REM Vérifier g++
g++ --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur: g++ n'est pas installé ou pas dans le PATH
    echo 💡 Veuillez installer MinGW-w64 ou un compilateur C++
    pause
    exit /b 1
)
echo ✅ Compilateur C++ détecté

REM Vérifier Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur: Python n'est pas installé ou pas dans le PATH
    echo 💡 Veuillez installer Python 3.8+
    pause
    exit /b 1
)
echo ✅ Python détecté

REM Vérifier les modules Python
echo 📦 Vérification des modules Python...
python -c "import matplotlib, numpy, seaborn" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Modules Python manquants, installation...
    pip install matplotlib numpy seaborn
    if %ERRORLEVEL% neq 0 (
        echo ❌ Erreur: Impossible d'installer les modules Python
        pause
        exit /b 1
    )
)
echo ✅ Modules Python disponibles

echo.
echo 🔧 Compilation du moteur d'évolution C++...

REM Nettoyer les anciens exécutables
if exist serina_evolution_engine.exe del serina_evolution_engine.exe

REM Compiler le moteur d'évolution
g++ -std=c++20 -O2 -I"include" -I"include/Serina" serina_evolution_engine.cpp -o serina_evolution_engine.exe

if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur de compilation du moteur C++
    echo 💡 Vérifiez que tous les fichiers d'en-tête sont présents
    pause
    exit /b 1
)

echo ✅ Moteur d'évolution compilé avec succès

echo.
echo 🎮 Choix du mode de simulation:
echo   [1] Simulation complète (Moteur C++ + Visualisation Python)
echo   [2] Visualisation Python seulement (données simulées)
echo   [3] Moteur C++ seulement (génération de données)
echo.
set /p choice="Votre choix (1-3): "

if "%choice%"=="1" (
    echo.
    echo 🚀 === LANCEMENT DE LA SIMULATION COMPLÈTE ===
    echo 🔧 Démarrage du moteur d'évolution C++...
    start "" serina_evolution_engine.exe
    
    echo ⏳ Attente du démarrage du moteur...
    timeout /t 3 /nobreak >nul
    
    echo 🖥️ Lancement de la visualisation Python...
    python serina_evolution_simulator.py
    
) else if "%choice%"=="2" (
    echo.
    echo 🖥️ === LANCEMENT DE LA VISUALISATION PYTHON ===
    python serina_evolution_simulator.py
    
) else if "%choice%"=="3" (
    echo.
    echo 🔧 === LANCEMENT DU MOTEUR C++ SEULEMENT ===
    serina_evolution_engine.exe
    
) else (
    echo ❌ Choix invalide
    pause
    exit /b 1
)

echo.
echo 🎉 Simulation terminée
echo 📊 Vérifiez le fichier serina_evolution_data.json pour les données
echo 🌍 Merci d'avoir exploré le monde de Serina !
echo.
pause