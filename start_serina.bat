@echo off
echo.
echo 🚀 ===============================================
echo    SERINA EVOLUTION - LANCEMENT COMPLET
echo ===============================================
echo.

REM Vérifier que WAMP est démarré
echo 🔍 Vérification de WAMP...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo ✅ MySQL détecté - WAMP est démarré
) else (
    echo ❌ MySQL non détecté !
    echo.
    echo 💡 Actions requises:
    echo    1. Démarrez WAMP64
    echo    2. Vérifiez que l'icône WAMP est verte
    echo    3. Relancez ce script
    echo.
    pause
    exit /b 1
)

REM Vérifier Apache
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo ✅ Apache détecté - Services web actifs
) else (
    echo ⚠️  Apache non détecté, mais MySQL fonctionne
)

echo.
echo 🗄️ Initialisation de la base de données...
cd api
node database/init.js
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de l'initialisation de la base de données
    pause
    exit /b 1
)

echo.
echo ✅ Base de données prête !
echo.

REM Retour au répertoire racine
cd ..

echo 🌐 Démarrage de l'écosystème Serina...
echo.
echo 📋 Services qui vont démarrer:
echo    • API Node.js (Port 3001)
echo    • Interface Web React (Port 5173)
echo    • Bridge Python-API (automatique)
echo.

REM Utiliser concurrently pour lancer API + Web
echo 🚀 Lancement des services...
npm run dev

echo.
echo 🎉 Serina Evolution est maintenant actif !
echo.
echo 🔗 URLs d'accès:
echo    • Interface Web: http://localhost:5173
echo    • API Documentation: http://localhost:3001/api-docs
echo    • API Base: http://localhost:3001
echo.
echo 💾 Base de données: serina_evolution (WAMP MySQL)
echo.
pause