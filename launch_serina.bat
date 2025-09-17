@echo off@echo off

clscls

echo.echo.

echo ====================================================================echo ====================================================================

echo                     SERINA EVOLUTION API LAUNCHERecho                     SERINA EVOLUTION API LAUNCHER

echo ====================================================================echo ====================================================================

echo   Complete evolution simulation system (C++/Python/Node.js API)echo   Complete evolution simulation system (C++/Python/Node.js API)

echo   With real-time WebSocket updates and Swagger documentationecho   With real-time WebSocket updates and Swagger documentation

echo ====================================================================echo ====================================================================

echo.echo.



REM Default modeREM Default mode

set MODE=%1set MODE=%1

if "%MODE%"=="" set MODE=autoif "%MODE%"=="" set MODE=auto



echo � Checking system requirements...echo � Checking system requirements...



REM Check if MySQL/WAMP is runningREM Check if MySQL/WAMP is running

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NULtasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NUL

if errorlevel 1 (if errorlevel 1 (

    echo ⚠️  MySQL not detected. Starting WAMP check...    echo ⚠️  MySQL not detected. Starting WAMP check...

    if exist "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqld.exe" (    if exist "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqld.exe" (

        echo 💡 WAMP detected but MySQL not running. Please start WAMP services.        echo 💡 WAMP detected but MySQL not running. Please start WAMP services.

    ) else (    ) else (

        echo ❌ MySQL/WAMP not found. Please install WAMP64 or start MySQL manually.        echo ❌ MySQL/WAMP not found. Please install WAMP64 or start MySQL manually.

    )    )

    echo    Then run: %0 %MODE%    echo    Then run: %0 %MODE%

    pause    pause

    exit /b 1    exit /b 1

))

echo ✅ MySQL runningecho ✅ MySQL running



REM Check Node.jsREM Check Node.js

node --version >nul 2>&1node --version >nul 2>&1

if errorlevel 1 (if errorlevel 1 (

    echo ❌ Node.js not found. Please install Node.js 18+ from nodejs.org    echo ❌ Node.js not found. Please install Node.js 18+ from nodejs.org

    pause    pause

    exit /b 1    exit /b 1

))

echo ✅ Node.js availableecho ✅ Node.js available



REM Check C++ executableREM Check C++ executable

if exist "serina_evolution_engine.exe" (if exist "serina_evolution_engine.exe" (

    echo ✅ C++ simulation engine found    echo ✅ C++ simulation engine found

) else () else (

    echo ⚠️  C++ engine not built. Will use Python/Mock mode.    echo ⚠️  C++ engine not built. Will use Python/Mock mode.

))



REM Check PythonREM Check Python

python --version >nul 2>&1python --version >nul 2>&1

if errorlevel 1 (if errorlevel 1 (

    py --version >nul 2>&1    py --version >nul 2>&1

    if errorlevel 1 (    if errorlevel 1 (

        echo ⚠️  Python not found. Will use C++/Mock mode.        echo ⚠️  Python not found. Will use C++/Mock mode.

    ) else (    ) else (

        echo ✅ Python available (via py launcher)        echo ✅ Python available (via py launcher)

    )    )

) else () else (

    echo ✅ Python available    echo ✅ Python available

))



echo.echo.

echo 🚀 Starting Serina Evolution API...echo 🚀 Starting Serina Evolution API...

echo    Mode: %MODE%echo    Mode: %MODE%

echo    API: http://localhost:3001/apiecho    API: http://localhost:3001/api

echo    Docs: http://localhost:3001/api-docsecho    Docs: http://localhost:3001/api-docs

echo    Health: http://localhost:3001/healthecho    Health: http://localhost:3001/health



REM Navigate to API directoryREM Navigate to API directory

cd /d "%~dp0api"cd /d "%~dp0api"



REM Install dependencies if neededREM Install dependencies if needed

if not exist "node_modules" (if not exist "node_modules" (

    echo.    echo.

    echo 📦 Installing Node.js dependencies...    echo 📦 Installing Node.js dependencies...

    call npm install    call npm install

    if errorlevel 1 (    if errorlevel 1 (

        echo ❌ Failed to install dependencies        echo ❌ Failed to install dependencies

        pause        pause

        exit /b 1        exit /b 1

    )    )

))



echo.echo.

echo 📊 Available endpoints:echo 📊 Available endpoints:

echo    POST /api/simulation/start { "mode": "%MODE%" }echo    POST /api/simulation/start { "mode": "%MODE%" }

echo    POST /api/simulation/stopecho    POST /api/simulation/stop

echo    GET  /api/simulation/statusecho    GET  /api/simulation/status

echo    GET  /api/simulationsecho    GET  /api/simulations

echo    GET  /api/species/1echo    GET  /api/species/1

echo    POST /api/evolution/start (Node.js engine)echo    POST /api/evolution/start (Node.js engine)

echo.echo.

echo 🌐 Open http://localhost:3001/api-docs for interactive API testingecho 🌐 Open http://localhost:3001/api-docs for interactive API testing

echo.echo.

echo Press Ctrl+C to stop all servicesecho Press Ctrl+C to stop all services

echo.echo.



REM Set simulation mode environment variableecho ✅ Compilation reussie!

set SIMULATION_MODE=%MODE%echo.



REM Start the Node.js API serverecho 🎯 OPTIONS DE LANCEMENT:

echo ⚡ Starting API server...echo ========================

node server.jsecho.

echo [1] 🖥️  Interface C++ interactive

if errorlevel 1 (echo [2] 🐍 Interface Python graphique

    echo.echo [3] 🔄 Les deux simultanement

    echo ❌ Failed to start API serverecho [4] 🧹 Nettoyer les fichiers temporaires

    echo    Check logs above for error detailsecho [5] ❌ Quitter

    pauseecho.

    exit /b 1

)set /p choice="Votre choix (1-5): "



echo.if "%choice%"=="1" (

echo ✅ API server stopped gracefully    echo.

pause    echo 🚀 Lancement de l'interface C++...
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