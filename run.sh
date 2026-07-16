#!/bin/bash
set -e

echo "======================================================================="
echo "         P R A H A R I   A I   -   M U L T I - A G E N T   S Y S T E M"
echo "======================================================================="
echo ""

# Find available terminal emulator
if command -v gnome-terminal &> /dev/null; then
    TERM_CMD="gnome-terminal -- "
elif command -v x-terminal-emulator &> /dev/null; then
    TERM_CMD="x-terminal-emulator -e "
elif command -v xterm &> /dev/null; then
    TERM_CMD="xterm -e "
else
    echo "Warning: No standard terminal emulator found (gnome-terminal, xterm). Processes will run in background."
    TERM_CMD=""
fi

# ── LLM PROVIDER SELECTION ─────────────────────────────────────────────────
echo "Select your LLM Provider:"
echo "[1] Groq (Cloud API - requires key)"
echo "[2] LMStudio (Local Server on port 1234)"
echo "[3] Ollama (Local Server on port 11434)"
echo ""
read -p "Enter choice (1/2/3) [1]: " llm_choice
llm_choice=${llm_choice:-1}

export LLM_PROVIDER=""
export LLM_URL=""

if [ "$llm_choice" == "1" ]; then
    export LLM_PROVIDER="groq"
    if [ -z "$GROQ_API_KEY" ]; then
        read -p "Enter Groq API Key: " GROQ_API_KEY
        export GROQ_API_KEY="$GROQ_API_KEY"
    fi
elif [ "$llm_choice" == "2" ]; then
    export LLM_PROVIDER="lmstudio"
    export LLM_URL="http://localhost:1234/v1"
elif [ "$llm_choice" == "3" ]; then
    export LLM_PROVIDER="ollama"
    export LLM_URL="http://localhost:11434"
    
    echo ""
    echo "Starting Ollama in a new terminal..."
    if [ -n "$TERM_CMD" ]; then
        $TERM_CMD bash -c "ollama serve; exec bash" &
    else
        ollama serve &
    fi
else
    echo "Invalid choice, defaulting to Groq."
    export LLM_PROVIDER="groq"
fi
echo ""

# ── FRONTEND CHECK ──────────────────────────────────────────────────────────
echo "[1/3] Checking Frontend Dependencies..."
cd prahari-ai-frontend
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing packages..."
    npm install
else
    echo "Frontend packages already installed."
fi
cd ..
echo ""

# ── BACKEND VENV CHECK ───────────────────────────────────────────────────────
echo "[2/4] Checking Backend Virtual Environment..."
cd prahari-ai-backend
if [ ! -d "venv" ]; then
    echo "Virtual environment 'venv' not found. Creating it..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
else
    echo "Virtual environment 'venv' detected."
fi
cd ..
echo ""

# ── ML PIPELINE CHECK ────────────────────────────────────────────────────────
echo "[3/4] ML Pipeline Execution"
echo "Do you want to run the ML pipeline before starting the servers?"
echo "(This will generate the synthetic dataset and DuckDB files if they don't exist)"
read -p "Run ML Pipeline? (y/n) [n]: " run_ml
run_ml=${run_ml:-n}

if [[ "$run_ml" =~ ^[Yy]$ ]]; then
    echo "Setting up ML pipeline..."
    cd prahari-ai-ml
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    echo "Running pipeline scripts..."
    cd pipeline
    export LLM_PROVIDER=$LLM_PROVIDER
    export LLM_URL=$LLM_URL
    python step1_geo_imputation.py
    python step2_lookup_tables.py
    python step2b_case_master.py
    python step3_pii_synthesis.py
    python step4_feature_engineering.py
    python step5_nl2sql_agent.py
    python step6_trend_hotspot_module.py
    python step7_test_suite.py
    cd ../..
    echo "ML Pipeline Complete!"
fi
echo ""

# ── LAUNCH SYSTEM ────────────────────────────────────────────────────────────
echo "[4/4] Launching Prahari AI Application Stack..."
echo ""

echo "Launching Backend FastAPI Server (Port 8000)..."
if [ -n "$TERM_CMD" ]; then
    $TERM_CMD bash -c "cd prahari-ai-backend && source venv/bin/activate && python run.py; exec bash" &
else
    (cd prahari-ai-backend && source venv/bin/activate && python run.py) &
fi

echo "Launching Frontend Vite App (Port 5173)..."
if [ -n "$TERM_CMD" ]; then
    $TERM_CMD bash -c "cd prahari-ai-frontend && npm run dev; exec bash" &
else
    (cd prahari-ai-frontend && npm run dev) &
fi

echo ""
echo "======================================================================="
echo " Prahari AI stack is starting up in separate windows!"
echo " - Backend API:    http://localhost:8000"
echo " - Interactive UI: http://localhost:5173"
echo ""
echo " You can close this launcher script window."
echo "======================================================================="
echo ""
