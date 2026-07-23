@echo off
setlocal enabledelayedexpansion
title Prahari AI - Launcher
cls
echo =======================================================================
echo          P R A H A R I   A I   -   M U L T I - A G E N T   S Y S T E M
echo =======================================================================
echo.

:: ── LLM PROVIDER SELECTION ─────────────────────────────────────────────────
echo Select your LLM Provider:
echo [1] Nvidia (Cloud API - requires key)
echo [2] LMStudio (Local Server on port 1234)
echo [3] Ollama (Local Server on port 11434)
echo.
set /p llm_choice="Enter choice (1/2/3) [1]: "
if "%llm_choice%"=="" set llm_choice=1

if "%llm_choice%"=="1" (
    set LLM_PROVIDER=groq
    set /p GROQ_API_KEY="Enter Nvidia API Key (or press enter if already set): "
    if not "!GROQ_API_KEY!"=="" setx GROQ_API_KEY "!GROQ_API_KEY!"
) else if "%llm_choice%"=="2" (
    set LLM_PROVIDER=lmstudio
    set LLM_URL=http://localhost:1234/v1
) else if "%llm_choice%"=="3" (
    set LLM_PROVIDER=ollama
    set LLM_URL=http://localhost:11434
    
    echo.
    echo Starting Ollama in a new terminal...
    start "Prahari AI - Ollama Server" cmd /k "ollama serve"
) else (
    echo Invalid choice, defaulting to Groq.
    set LLM_PROVIDER=groq
)
echo.

:: ── FRONTEND CHECK ──────────────────────────────────────────────────────────
echo [1/3] Checking Frontend Dependencies...
cd prahari-ai-frontend
if not exist node_modules (
    echo node_modules not found. Installing packages...
    call npm install
) else (
    echo Frontend packages already installed.
)
cd ..
echo.

:: ── BACKEND VENV CHECK ───────────────────────────────────────────────────────
echo [2/4] Checking Backend Virtual Environment...
cd prahari-ai-backend
if not exist venv (
    echo Virtual environment 'venv' not found. Creating it...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing backend dependencies...
    pip install -r requirements.txt
) else (
    echo Virtual environment 'venv' detected.
)
cd ..
echo.

:: ── ML PIPELINE CHECK ────────────────────────────────────────────────────────
echo [3/4] ML Pipeline Execution
echo Do you want to run the ML pipeline before starting the servers?
echo (This will generate the synthetic dataset and DuckDB files if they don't exist)
set /p run_ml="Run ML Pipeline? (y/n) [n]: "
if /i "%run_ml%"=="y" (
    echo Setting up ML pipeline...
    cd prahari-ai-ml
    if not exist venv (
        python -m venv venv
        call venv\Scripts\activate.bat
        pip install -r requirements.txt
    ) else (
        call venv\Scripts\activate.bat
    )
    echo Running pipeline scripts...
    cd pipeline
    set LLM_PROVIDER=%LLM_PROVIDER%
    set LLM_URL=%LLM_URL%
    python step1_geo_imputation.py
    python step2_lookup_tables.py
    python step2b_case_master.py
    python step3_pii_synthesis.py
    python step4_feature_engineering.py
    python step4b_network_summary.py
    python step5_nl2sql_agent.py
    python step6_trend_hotspot_module.py
    python step7_test_suite.py
    cd ..\..
    echo ML Pipeline Complete!
)
echo.

:: ── LAUNCH SYSTEM ────────────────────────────────────────────────────────────
echo [4/4] Launching Prahari AI Application Stack...
echo.
echo Launching Backend FastAPI Server (Port 8000)...
start "Prahari AI - Backend" cmd /k "cd prahari-ai-backend && call venv\Scripts\activate.bat && set LLM_PROVIDER=%LLM_PROVIDER%&& set LLM_URL=%LLM_URL%&& python run.py"

echo Launching Frontend Vite App (Port 5173)...
start "Prahari AI - Frontend" cmd /k "cd prahari-ai-frontend && npm run dev"

echo.
echo =======================================================================
echo  Prahari AI stack is starting up in separate windows!
echo  - Backend API:    http://localhost:8000
echo  - Interactive UI: http://localhost:5173
echo.
echo  You can close this launcher window.
echo =======================================================================
echo.
pause
