@echo off
chcp 65001 >nul
setlocal EnableExtensions

echo ============================================
echo   POG.KR - Docker Compose startup
echo ============================================
echo.

set "ROOT=%~dp0"

where docker >nul 2>nul
if errorlevel 1 goto docker_missing

if exist "%ROOT%backend\.env" goto env_ready
echo [setup] backend\.env not found. Copying from .env.example.
echo         It is recommended to fill in RIOT_API_KEY before continuing.
copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
pause
:env_ready

echo.
echo [run] docker compose up --build
echo       (press Ctrl+C in this window to stop)
echo.

cd /d "%ROOT%"
docker compose up --build
goto end

:docker_missing
echo [error] Docker was not found in PATH.
echo         Please install/start Docker Desktop and try again.
pause
exit /b 1

:end
endlocal
