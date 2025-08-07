@echo off
echo ========================================
echo    🏪 Papelería Pro - Node.js
echo ========================================
echo.

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Instalando dependencias...
npm install

echo.
echo 🚀 Iniciando aplicación...
echo 📊 Base de datos: MySQL (carlospapeleriagongoraeuan)
echo 🌐 URL: http://localhost:3000
echo.

npm start

echo.
echo ✅ Aplicación terminada
pause 