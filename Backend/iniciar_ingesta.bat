@echo off
REM ==========================================================
REM  Lanzador de la INGESTA (Capa 1) - Monitoreo Atmosferico
REM  - Usa el Python del entorno virtual (.venv) directamente,
REM    asi NO hay que activar nada ni sale "ModuleNotFoundError".
REM  - Si el proceso se cae, se reinicia solo tras 10 s.
REM  - Doble clic en este archivo y dejalo abierto.
REM    (Ctrl+C dos veces para detenerlo del todo.)
REM ==========================================================
title Ingesta ESP32 - Monitoreo Atmosferico
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] No se encontro .venv\Scripts\python.exe
    echo Crea el entorno virtual e instala dependencias:
    echo   python -m venv .venv
    echo   .venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

:loop
echo ==========================================================
echo  Iniciando ingesta...  %date% %time%
echo ==========================================================
".venv\Scripts\python.exe" -m ingesta.limpieza
echo.
echo  La ingesta se detuvo (cierre o error). Reiniciando en 10 s...
echo  Cierra esta ventana o pulsa Ctrl+C para salir.
timeout /t 10 /nobreak >nul
goto loop
