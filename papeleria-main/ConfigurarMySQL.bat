@echo off
echo ============================================
echo CONFIGURACION DE BASE DE DATOS MYSQL
echo ============================================
echo.

echo Verificando si MySQL esta instalado...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MySQL no esta instalado o no esta en el PATH
    echo Por favor instala MySQL Server y agrega mysql.exe al PATH
    pause
    exit /b 1
)

echo MySQL encontrado. Configurando base de datos...
echo.

echo Creando base de datos y tablas...
mysql -u root -pAa22559845 < PapeleriaDB_MySQL.sql

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo CONFIGURACION COMPLETADA EXITOSAMENTE
    echo ============================================
    echo.
    echo Base de datos: carlospapeleriagongoraeuan
    echo Usuario: root
    echo Password: Aa22559845
    echo Puerto: 3306
    echo.
    echo Las tablas y stored procedures han sido creados.
    echo Los datos de ejemplo han sido insertados.
    echo.
    echo Ahora puedes ejecutar el servidor Node.js:
    echo   cd ..\PapeleriaPro
    echo   node server.js
    echo.
) else (
    echo.
    echo ERROR: No se pudo configurar la base de datos
    echo Verifica que:
    echo 1. MySQL este ejecutandose
    echo 2. El usuario root tenga la password: Aa22559845
    echo 3. Tengas permisos para crear bases de datos
    echo.
)

pause 