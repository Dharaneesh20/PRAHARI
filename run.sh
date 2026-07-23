#!/usr/bin/env bash
# =======================================================================
#          P R A H A R I   A I   -   M U L T I - A G E N T   S Y S T E M
# =======================================================================
# Automation Script for Linux Devices with Comprehensive Error Handling
# =======================================================================

# Ensure script halts on unhandled errors where appropriate, but allow custom handling
set -e

# ANSI Color Codes for Rich Terminal Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Helper Functions for Output Formatting
info() {
    echo -e "${CYAN}[INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}[OK]${RESET} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}

error() {
    echo -e "${RED}[ERROR]${RESET} $1"
}

header() {
    echo -e "${BOLD}${BLUE}$1${RESET}"
}

# Determine script root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Background process management for headless/terminal-less mode
BG_PIDS=()

cleanup() {
    if [ ${#BG_PIDS[@]} -gt 0 ]; then
        echo ""
        warn "Shutting down background processes..."
        for pid in "${BG_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                info "Stopped background process PID $pid"
            fi
        done
        success "Cleanup complete."
    fi
}
trap cleanup EXIT INT TERM

# Clear screen and display banner
clear || true
echo -e "${BOLD}${CYAN}"
echo "======================================================================="
echo "         P R A H A R I   A I   -   M U L T I - A G E N T   S Y S T E M"
echo "======================================================================="
echo -e "${RESET}"

# ── PRE-FLIGHT SYSTEM CHECKS ──────────────────────────────────────────────────
header "[0/4] Pre-flight Diagnostics & Environment Verification..."

# Check required directories
for dir in prahari-ai-frontend prahari-ai-backend prahari-ai-ml; do
    if [ ! -d "$dir" ]; then
        error "Required project directory '$dir' is missing!"
        error "Please run this script from the root of the PRAHARI repository."
        exit 1
    fi
done

# Check required system utilities
MISSING_TOOLS=()
command -v python3 >/dev/null 2>&1 || MISSING_TOOLS+=("python3")
command -v node >/dev/null 2>&1 || MISSING_TOOLS+=("node")
command -v npm >/dev/null 2>&1 || MISSING_TOOLS+=("npm")

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    error "Missing required system dependencies: ${MISSING_TOOLS[*]}"
    error "Please install them using your Linux package manager (e.g., sudo apt install python3 python3-venv nodejs npm)."
    exit 1
fi

# Verify Python venv module capability
TEST_VENV="/tmp/_prahari_venv_test_$$"
if ! python3 -m venv "$TEST_VENV" >/dev/null 2>&1 || [ ! -f "$TEST_VENV/bin/activate" ]; then
    rm -rf "$TEST_VENV" 2>/dev/null || true
    error "Python3 'venv' (ensurepip) is missing or broken on this system."
    error "On Debian/Ubuntu systems, please run:"
    error "  sudo apt update && sudo apt install -y python3-venv python3.12-venv python3-pip"
    exit 1
fi
rm -rf "$TEST_VENV" 2>/dev/null || true

success "All core system pre-requisites verified!"
echo ""

# ── TERMINAL EMULATOR DETECTION ──────────────────────────────────────────────
TERM_CMD=""
TERM_TYPE=""

if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
    if command -v gnome-terminal >/dev/null 2>&1; then
        TERM_TYPE="gnome-terminal"
    elif command -v konsole >/dev/null 2>&1; then
        TERM_TYPE="konsole"
    elif command -v xfce4-terminal >/dev/null 2>&1; then
        TERM_TYPE="xfce4-terminal"
    elif command -v mate-terminal >/dev/null 2>&1; then
        TERM_TYPE="mate-terminal"
    elif command -v terminator >/dev/null 2>&1; then
        TERM_TYPE="terminator"
    elif command -v tilix >/dev/null 2>&1; then
        TERM_TYPE="tilix"
    elif command -v alacritty >/dev/null 2>&1; then
        TERM_TYPE="alacritty"
    elif command -v kitty >/dev/null 2>&1; then
        TERM_TYPE="kitty"
    elif command -v x-terminal-emulator >/dev/null 2>&1; then
        TERM_TYPE="x-terminal-emulator"
    elif command -v xterm >/dev/null 2>&1; then
        TERM_TYPE="xterm"
    fi
fi

launch_in_terminal() {
    local title="$1"
    local cmd="$2"
    local log_name="$3"

    if [ -n "$TERM_TYPE" ]; then
        case "$TERM_TYPE" in
            gnome-terminal)
                gnome-terminal --title="$title" -- bash -c "$cmd; exec bash" &
                ;;
            konsole)
                konsole -p tabtitle="$title" -e bash -c "$cmd; exec bash" &
                ;;
            xfce4-terminal)
                xfce4-terminal --title="$title" -e "bash -c \"$cmd; exec bash\"" &
                ;;
            mate-terminal)
                mate-terminal --title="$title" -e "bash -c \"$cmd; exec bash\"" &
                ;;
            terminator)
                terminator -T "$title" -e "bash -c \"$cmd; exec bash\"" &
                ;;
            tilix)
                tilix -t "$title" -e bash -c "$cmd; exec bash" &
                ;;
            alacritty)
                alacritty -t "$title" -e bash -c "$cmd; exec bash" &
                ;;
            kitty)
                kitty --title "$title" bash -c "$cmd; exec bash" &
                ;;
            x-terminal-emulator)
                x-terminal-emulator -e bash -c "$cmd; exec bash" &
                ;;
            xterm)
                xterm -title "$title" -e bash -c "$cmd; exec bash" &
                ;;
        esac
        info "Launched '$title' in a new terminal window ($TERM_TYPE)."
    else
        mkdir -p "$PROJECT_ROOT/logs"
        local log_file="$PROJECT_ROOT/logs/${log_name}.log"
        info "No active GUI terminal emulator detected. Running '$title' in background mode."
        info "Logging output to: $log_file"
        eval "$cmd" > "$log_file" 2>&1 &
        local pid=$!
        BG_PIDS+=("$pid")
        success "Started '$title' (PID: $pid)"
    fi
}

check_port() {
    local port="$1"
    local name="$2"
    if (echo > /dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
        warn "Port $port ($name) appears to be ALREADY IN USE."
        warn "If a service is already running on port $port, launch may encounter port binding errors."
    fi
}

# ── LLM PROVIDER SELECTION ─────────────────────────────────────────────────
header "Select your LLM Provider:"
echo "  [1] Nvidia (Cloud API - requires key)"
echo "  [2] LMStudio (Local Server on port 1234)"
echo "  [3] Ollama (Local Server on port 11434)"
echo ""
read -p "Enter choice (1/2/3) [1]: " llm_choice
llm_choice=${llm_choice:-1}

export LLM_PROVIDER=""
export LLM_URL=""

case "$llm_choice" in
    1)
        export LLM_PROVIDER="groq"
        if [ -z "$GROQ_API_KEY" ]; then
            read -p "Enter Nvidia API Key (or press enter if already set): " input_key
            if [ -n "$input_key" ]; then
                export GROQ_API_KEY="$input_key"
            fi
        fi
        if [ -z "$GROQ_API_KEY" ]; then
            warn "NVI_API_KEY is not set. Nvidia queries will fail if API key is missing."
        else
            success "Nvidia LLM Provider configured."
        fi
        ;;
    2)
        export LLM_PROVIDER="lmstudio"
        export LLM_URL="http://localhost:1234/v1"
        check_port 1234 "LMStudio"
        success "LMStudio configured ($LLM_URL)."
        ;;
    3)
        export LLM_PROVIDER="ollama"
        export LLM_URL="http://localhost:11434"
        success "Ollama configured ($LLM_URL)."

        if ! command -v ollama >/dev/null 2>&1; then
            warn "Ollama CLI is not installed in standard PATH."
        fi

        if ! (echo > /dev/tcp/127.0.0.1/11434) 2>/dev/null; then
            info "Starting Ollama server..."
            launch_in_terminal "Prahari AI - Ollama Server" "ollama serve" "ollama"
        else
            success "Ollama service is active on port 11434."
        fi
        ;;
    *)
        warn "Invalid choice '$llm_choice', defaulting to Groq."
        export LLM_PROVIDER="groq"
        ;;
esac
echo ""

# ── FRONTEND CHECK ──────────────────────────────────────────────────────────
header "[1/4] Checking Frontend Dependencies..."
cd "$PROJECT_ROOT/prahari-ai-frontend"

if [ ! -d "node_modules" ]; then
    info "node_modules not found. Installing packages..."
    if ! npm install; then
        error "npm install failed in prahari-ai-frontend! Please check package.json and network connectivity."
        exit 1
    fi
    success "Frontend dependencies installed successfully."
else
    success "Frontend packages already installed."
fi
cd "$PROJECT_ROOT"
echo ""

# ── BACKEND VENV CHECK ───────────────────────────────────────────────────────
header "[2/4] Checking Backend Virtual Environment..."
cd "$PROJECT_ROOT/prahari-ai-backend"

if [ ! -f "venv/bin/activate" ]; then
    if [ -d "venv" ]; then
        warn "Incomplete backend virtual environment detected. Cleaning up..."
        rm -rf venv
    fi
    info "Virtual environment 'venv' not found. Creating it..."
    if ! python3 -m venv venv; then
        error "Failed to create Python virtual environment in prahari-ai-backend."
        error "Please run: sudo apt update && sudo apt install -y python3-venv python3.12-venv python3-pip"
        exit 1
    fi
    source venv/bin/activate
    info "Installing backend dependencies from requirements.txt..."
    if ! pip install -r requirements.txt; then
        error "pip install failed for backend dependencies!"
        exit 1
    fi
    deactivate || true
    success "Backend virtual environment created and dependencies installed."
else
    success "Backend virtual environment 'venv' detected."
fi
cd "$PROJECT_ROOT"
echo ""

# ── ML PIPELINE CHECK ────────────────────────────────────────────────────────
header "[3/4] ML Pipeline Execution"
echo "Do you want to run the ML pipeline before starting the servers?"
echo "(This will generate synthetic datasets, feature embeddings, and DuckDB files)"
read -p "Run ML Pipeline? (y/n) [n]: " run_ml
run_ml=${run_ml:-n}

if [[ "$run_ml" =~ ^[Yy]$ ]]; then
    info "Setting up ML pipeline..."
    cd "$PROJECT_ROOT/prahari-ai-ml"
    
    if [ ! -f "venv/bin/activate" ]; then
        if [ -d "venv" ]; then
            warn "Incomplete ML virtual environment detected. Cleaning up..."
            rm -rf venv
        fi
        info "Creating ML virtual environment..."
        if ! python3 -m venv venv; then
            error "Failed to create virtual environment for ML pipeline!"
            error "Please run: sudo apt update && sudo apt install -y python3-venv python3.12-venv python3-pip"
            exit 1
        fi
        source venv/bin/activate
        info "Installing ML pipeline dependencies..."
        if ! pip install -r requirements.txt; then
            error "Failed to install ML dependencies!"
            exit 1
        fi
    else
        source venv/bin/activate
    fi

    info "Running pipeline scripts..."
    cd "$PROJECT_ROOT/prahari-ai-ml/pipeline"
    
    export LLM_PROVIDER=$LLM_PROVIDER
    export LLM_URL=$LLM_URL
    if [ -n "$GROQ_API_KEY" ]; then
        export GROQ_API_KEY=$GROQ_API_KEY
    fi

    PIPELINE_STEPS=(
        "step1_geo_imputation.py"
        "step2_lookup_tables.py"
        "step2b_case_master.py"
        "step3_pii_synthesis.py"
        "step4_feature_engineering.py"
        "step4b_network_summary.py"
        "step5_nl2sql_agent.py"
        "step6_trend_hotspot_module.py"
        "step7_test_suite.py"
    )

    for step in "${PIPELINE_STEPS[@]}"; do
        if [ -f "$step" ]; then
            info "Executing $step..."
            if ! python "$step"; then
                error "ML Pipeline failed at step: $step"
                cd "$PROJECT_ROOT"
                exit 1
            fi
        else
            warn "Pipeline script $step not found, skipping."
        fi
    done

    cd "$PROJECT_ROOT"
    success "ML Pipeline Complete!"
else
    info "Skipping ML pipeline execution."
fi
echo ""

# ── LAUNCH SYSTEM ────────────────────────────────────────────────────────────
header "[4/4] Launching Prahari AI Application Stack..."
echo ""

# Check standard ports before launching
check_port 8000 "FastAPI Backend"
check_port 5173 "Vite Frontend"

info "Launching Backend FastAPI Server (Port 8000)..."
BACKEND_CMD="cd '$PROJECT_ROOT/prahari-ai-backend' && source venv/bin/activate && export LLM_PROVIDER='$LLM_PROVIDER' && export LLM_URL='$LLM_URL' && export GROQ_API_KEY='$GROQ_API_KEY' && python run.py"
launch_in_terminal "Prahari AI - Backend" "$BACKEND_CMD" "backend"

info "Launching Frontend Vite App (Port 5173)..."
FRONTEND_CMD="cd '$PROJECT_ROOT/prahari-ai-frontend' && npm run dev"
launch_in_terminal "Prahari AI - Frontend" "$FRONTEND_CMD" "frontend"

echo ""
echo -e "${BOLD}${GREEN}"
echo "======================================================================="
echo " Prahari AI stack is starting up!"
echo " - Backend API:    http://localhost:8000"
echo " - Interactive UI: http://localhost:5173"
echo ""
if [ -n "$TERM_TYPE" ]; then
    echo " Separate terminal windows have been launched for services."
    echo " You can close this launcher script window."
else
    echo " Running in background mode without GUI terminal emulator."
    echo " Log files are being written to '$PROJECT_ROOT/logs/'"
    echo " Press Ctrl+C in this terminal to stop all background servers."
fi
echo "======================================================================="
echo -e "${RESET}"
echo ""

# If running in background mode, keep main script alive to manage child processes
if [ ${#BG_PIDS[@]} -gt 0 ]; then
    info "Monitoring background processes (Press Ctrl+C to terminate)..."
    wait
else
    read -p "Press Enter to exit launcher..." || true
fi
