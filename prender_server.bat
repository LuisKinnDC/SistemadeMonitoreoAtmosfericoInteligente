@echo off
REM ==========================================================
REM  PRENDER SERVER - Sistema de Monitoreo Atmosferico Inteligente
REM  El dashboard esta HOSPEDADO en Cloudflare Pages, asi que en
REM  tu PC solo hace falta la INGESTA (captura + limpieza del ESP32).
REM  El sitio lee de Supabase, que es donde escribe la ingesta.
REM
REM    1) Ingesta (Capa 1)  -> captura y limpia lo del ESP32
REM    2) Abre el dashboard hospedado en el navegador
REM
REM  Uso: doble clic en este archivo.
REM  Para APAGAR la ingesta: cierra la ventana "Ingesta ESP32".
REM ==========================================================
title PRENDER SERVER - Monitoreo Atmosferico
cd /d "%~dp0"

echo ============================================================
echo   Encendiendo el Sistema de Monitoreo Atmosferico...
echo ============================================================
echo.

REM 1) Ingesta (Capa 1) - usa su propio lanzador con auto-reinicio
start "Ingesta ESP32 (Capa 1)" "%~dp0Backend\iniciar_ingesta.bat"

REM 2) Abrir el dashboard HOSPEDADO en el navegador
echo Abriendo el dashboard hospedado...
timeout /t 2 /nobreak >nul
start "" https://monitoreoambiental.pages.dev/

echo.
echo ============================================================
echo   SISTEMA ENCENDIDO.
echo     - Ingesta ESP32 (Capa 1): corriendo en su ventana
echo     - Dashboard: https://monitoreoambiental.pages.dev/
echo.
echo   Para APAGAR la ingesta: cierra la ventana "Ingesta ESP32".
echo.
echo   Agregados historicos (PySpark, opcional / bajo demanda):
echo     ejecuta  Backend\correr_analisis.bat  cuando quieras
echo     recalcular las comparativas.
echo.
echo   (Para desarrollar el dashboard en local, aparte:
echo     frontend\iniciar_dashboard.bat  -^> http://localhost:5173/ )
echo ============================================================
echo.
echo Esta ventana ya puede cerrarse. Pulsa una tecla...
pause >nul
