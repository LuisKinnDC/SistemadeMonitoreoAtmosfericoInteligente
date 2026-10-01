@echo off
REM ==========================================================
REM  Lanzador del DASHBOARD React (Capa 3) - Monitoreo Atmosferico
REM  Instala dependencias solo la primera vez y arranca Vite.
REM ==========================================================
title Dashboard React (Capa 3) - Monitoreo Atmosferico
cd /d "%~dp0"

if not exist "node_modules\vite" (
    echo Instalando dependencias por primera vez (puede tardar)...
    call pnpm install
)

echo Arrancando el dashboard en http://localhost:5173/ ...
call pnpm dev --port 5173

echo.
echo El servidor del dashboard se detuvo. Cierra esta ventana o pulsa una tecla.
pause
