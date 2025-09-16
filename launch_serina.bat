@echo off
cls
echo.
echo ====================================================================
echo                        PROJET SERINA - LAUNCHER
echo ====================================================================
echo   Simulateur d'ecosysteme evolutionnaire inspire de Serina
echo   Tous les fichiers corriges et synchronises
echo ====================================================================
echo.

echo 🔧 Compilation des composants C++...
g++ -std=c++20 -I"include" -I"include/Serina" serina_main.cpp -o serina_sim.exe

if %errorlevel% neq 0 (
    echo ❌ Erreur de compilation!
    pause
    exit /b 1
)

echo ✅ Compilation reussie!
echo.

echo 🎯 OPTIONS DE LANCEMENT:
echo ========================
echo.
echo [1] 🖥️  Interface C++ interactive
echo [2] 🐍 Interface Python graphique
echo [3] 🔄 Les deux simultanement
echo [4] 🧹 Nettoyer les fichiers temporaires
echo [5] ❌ Quitter
echo.

set /p choice="Votre choix (1-5): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Lancement de l'interface C++...
    echo.
    serina_sim.exe
    goto end
)

if "%choice%"=="2" (
    echo.
    echo 🚀 Lancement de l'interface Python...
    echo.
    python serina_modern_sim.py
    goto end
)

if "%choice%"=="3" (
    echo.
    echo 🚀 Lancement des deux interfaces...
    echo.
    start "Serina C++" serina_sim.exe
    timeout /t 2 /nobreak >nul
    python serina_modern_sim.py
    goto end
)

if "%choice%"=="4" (
    echo.
    echo 🧹 Nettoyage en cours...
    del *.exe 2>nul
    del *.json 2>nul
    del *.tmp 2>nul
    del tests\*.exe 2>nul
    echo ✅ Nettoyage termine!
    goto end
)

if "%choice%"=="5" (
    echo.
    echo 👋 Au revoir!
    goto end
)

echo ❌ Option invalide!

:end
echo.
echo ⏸️ Appuyez sur une touche pour fermer...
pause >nul