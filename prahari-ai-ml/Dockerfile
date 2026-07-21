# ==============================================================================
# PRAHARI AI — ML Microservice Dockerfile
# Production Container Image for DuckDB & Analytics Engine
# ==============================================================================

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8001

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Fast-track dependency loading using host venv site-packages
COPY venv/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Copy requirements and run pip install as fallback verification
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh

# Expose microservice port
EXPOSE 8001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start container
ENTRYPOINT ["/app/entrypoint.sh"]
