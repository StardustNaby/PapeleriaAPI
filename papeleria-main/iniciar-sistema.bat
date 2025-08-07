@echo off
echo ============================================
echo SISTEMA DE PAPELERÍA - INICIO RÁPIDO
echo ============================================
echo.

echo 🔍 Verificando estructura del proyecto...
if not exist "Database" (
    echo ❌ Error: Directorio Database no encontrado
    pause
    exit /b 1
)

if not exist "PapeleriaPro" (
    echo ❌ Error: Directorio PapeleriaPro no encontrado
    pause
    exit /b 1
)

echo ✅ Estructura del proyecto verificada
echo.

echo 🗄️  Configurando base de datos...
cd Database
call ConfigurarMySQL.bat
if %errorlevel% neq 0 (
    echo ❌ Error al configurar la base de datos
    pause
    exit /b 1
)
cd ..

echo.
echo 📦 Instalando dependencias de Node.js...
cd PapeleriaPro
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Error al instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencias ya instaladas
)

echo.
echo 🔍 Verificando conexión a la base de datos...
node verificar-db.js
if %errorlevel% neq 0 (
    echo ❌ Error en la verificación de la base de datos
    echo.
    echo 🔧 Soluciones posibles:
    echo 1. Verifica que MySQL esté ejecutándose
    echo 2. Verifica las credenciales en config.env
    echo 3. Ejecuta ConfigurarMySQL.bat manualmente
    pause
    exit /b 1
)

echo.
echo 🔍 Verificando stored procedures...
node verificar-stored-procedures.js
if %errorlevel% neq 0 (
    echo ❌ Error en la verificación de stored procedures
    echo.
    echo 🔧 Soluciones posibles:
    echo 1. Ejecuta ConfigurarMySQL.bat para recrear los stored procedures
    echo 2. Verifica que la base de datos esté creada correctamente
    pause
    exit /b 1
)

echo.
echo 🚀 Iniciando sistema completo...
echo.
echo 💡 El sistema se iniciará con:
echo    - Frontend: http://localhost:3000
echo    - Backend:  http://localhost:30011
echo    - API Health: http://localhost:30011/api/health
echo.
echo ⏳ Iniciando en 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo 🎯 Iniciando servidor de desarrollo...
npm run dev:full

pause 