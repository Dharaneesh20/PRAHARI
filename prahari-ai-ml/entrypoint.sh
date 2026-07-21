#!/bin/bash
set -e

echo "=================================================="
echo " Starting PRAHARI AI — ML Microservice Container"
echo "=================================================="

# Export PORT if not set
export PORT=${PORT:-8001}

# Check if DuckDB database exists
if [ ! -f "/app/db/karnataka_fir.duckdb" ]; then
    echo "[INFO] DuckDB database missing. Initializing ML pipeline data..."
    mkdir -p /app/db /app/data /app/outputs
    cd /app/pipeline
    python3 step1_geo_imputation.py || true
    python3 step2_lookup_tables.py || true
    python3 step2b_case_master.py || true
    python3 step3_pii_synthesis.py || true
    python3 step4_feature_engineering.py || true
    python3 step4b_network_summary.py || true
    python3 step6_trend_hotspot_module.py || true
    cd /app
    echo "[INFO] ML pipeline data generation complete."
else
    echo "[SUCCESS] DuckDB database detected at /app/db/karnataka_fir.duckdb"
fi

echo "[INFO] Starting ML FastAPI microservice on port $PORT..."
exec python3 server.py
