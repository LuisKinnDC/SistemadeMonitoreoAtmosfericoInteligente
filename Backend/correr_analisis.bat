@echo off
REM ==========================================================
REM  ANALISIS BATCH con PySpark (Capa 2) - Monitoreo Atmosferico
REM  Calcula los agregados historicos y los sube a Supabase para
REM  la vista "Analitica Historica" del dashboard.
REM  Ejecutalo cuando quieras recalcular (no es continuo).
REM ==========================================================
title Analisis PySpark (Capa 2) - Monitoreo Atmosferico
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] No se encontro .venv\Scripts\python.exe
    pause
    exit /b 1
)

echo Ejecutando el analisis batch (PySpark)...
".venv\Scripts\python.exe" -m procesamiento.analisis_spark

echo.
echo Analisis terminado. Los agregados se subieron a Supabase.
pause
