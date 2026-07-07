@echo off
chcp 65001 >nul
setlocal EnableExtensions

echo ============================================
echo   POG.KR - Starting local dev servers
echo ============================================
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

REM --- 1) Create .env files from example if missing ---
if exist "%BACKEND%\.env" goto skip_backend_env
echo [setup] backend\.env not found. Copying from .env.example.
echo         Please fill in RIOT_API_KEY afterwards.
copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
:skip_backend_env

if exist "%FRONTEND%\.env.local" goto skip_frontend_env
echo [setup] frontend\.env.local not found. Copying from .env.example.
copy "%FRONTEND%\.env.example" "%FRONTEND%\.env.local" >nul
:skip_frontend_env

echo.

REM --- 2) Prepare backend virtual environment ---
if exist "%BACKEND%\.venv\Scripts\activate.bat" goto skip_venv
echo [backend] Virtual environment not found. Creating one...
python -m venv "%BACKEND%\.venv"
:skip_venv

echo [backend] Installing/checking dependencies...
call "%BACKEND%\.venv\Scripts\activate.bat"
pip install -q -r "%BACKEND%\requirements.txt"
call "%BACKEND%\.venv\Scripts\deactivate.bat" 2>nul

REM --- 3) Prepare frontend dependencies ---
if exist "%FRONTEND%\node_modules" goto skip_npm_install
echo [frontend] node_modules not found. Running npm install...
pushd "%FRONTEND%"
call npm install
popd
:skip_npm_install

echo.
echo ============================================
echo   Make sure PostgreSQL is running locally.
echo   (DATABASE_URL in backend\.env must match it)
echo ============================================
echo.
pause

REM --- 4) Start backend and frontend in separate windows ---
echo [run] Starting backend (FastAPI) in a new window...
start "POG.KR - Backend (FastAPI)" cmd /k "cd /d "%BACKEND%" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [run] Starting frontend (Next.js) in a new window...
start "POG.KR - Frontend (Next.js)" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo ============================================
echo   Done!
echo   Frontend : http://localhost:3000
echo   API docs : http://localhost:8000/docs
echo   Each server runs in its own window.
echo   Close the window or press Ctrl+C to stop it.
echo ============================================

endlocal
