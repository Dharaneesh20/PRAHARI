# PRAHARI AI — Zoho Catalyst & NVIDIA AI Hosted Services Deployment Guide

This guide provides comprehensive, production-grade setup and deployment instructions for **PRAHARI AI**, integrating **NVIDIA AI Hosted APIs** for Speech, Voice Synthesis, Translation, and LLM Inference, alongside **Zoho Catalyst** for Optical Character Recognition (OCR), Vision AI, Text Analytics, Barcode Scanning, Identity Scanning, and Image Moderation.

---

## 1. Architecture Overview

| Microservice | Provider | Description & Scope |
| :--- | :--- | :--- |
| **Speech-to-Text** | NVIDIA AI Hosted APIs | Multilingual speech transcription (Kannada `kn-IN` & English `en-IN`) |
| **Text-to-Speech** | NVIDIA AI Hosted APIs | High-quality audio voice synthesis |
| **Neural Translation** | NVIDIA AI Hosted APIs | Real-time Kannada ↔ English text translation |
| **LLM Chat & Intelligence** | NVIDIA AI Hosted APIs | Open-source LLM inference (Llama-3 / Mistral) |
| **Text Summarization** | NVIDIA AI Hosted APIs | Long report and FIR summarization |
| **Optical Character Recognition** | Zoho Catalyst | Printed & handwritten document OCR scanning |
| **Text Analytics** | Zoho Catalyst | Key phrase extraction, sentiment analysis, entity detection |
| **Face Analytics** | Zoho Catalyst | Facial detection and demographic attribute analysis |
| **Object Recognition** | Zoho Catalyst | Identification of vehicles, weapons, and evidence items |
| **Barcode Scanner** | Zoho Catalyst | QR code and barcode extraction |
| **Identity Scanner** | Zoho Catalyst | Automated government ID card parsing |
| **Image Moderation** | Zoho Catalyst | Automated explicit/unsafe content screening |

---

## 2. Zoho Catalyst Setup & Refresh Token Generation

Zoho Catalyst requires OAuth 2.0 authentication. Rather than using short-lived tokens, PRAHARI AI automatically generates access tokens via an OAuth **Refresh Token**.

### Step 1: Create a Catalyst Project
1. Log in to the [Zoho Catalyst Console](https://catalyst.zoho.com).
2. Click **Create Project**, enter `PRAHARI-AI`, and select your Data Center (e.g., `IN`, `US`, `EU`).

### Step 2: Register a Self-Client in Zoho API Console
1. Navigate to the [Zoho API Console](https://api-console.zoho.com).
2. Click **Add Client** and choose **Self Client**.
3. Copy your `Client ID` and `Client Secret`.

### Step 3: Generate Grant Code & Refresh Token
1. In the **Generate Code** tab of Self Client, enter the required Catalyst scope:
   ```text
   Catalyst.projects.READ,Catalyst.ml.READ,Catalyst.ml.CREATE
   ```
2. Set Time Duration to 10 minutes and specify a Scope Description (e.g., `PRAHARI AI Backend Authorization`).
3. Click **Generate** to copy the single-use **Grant Code**.
4. Exchange the Grant Code for a **Refresh Token** via HTTP POST request:
   ```bash
   curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=YOUR_GENERATED_GRANT_CODE"
   ```
5. Copy the returned `refresh_token`.

---

## 3. NVIDIA AI Hosted APIs Setup

1. Visit [NVIDIA API Catalog](https://build.nvidia.com).
2. Sign in or register for an NVIDIA Developer account.
3. Select an AI model (e.g., `meta/llama-3.1-70b-instruct` or Parakeet STT).
4. Click **Get API Key** and generate your `NVIDIA_API_KEY` (`nvapi-...`).

---

## 4. Environment Configuration

Create or update the `.env` file in `prahari-ai-backend/`:

```env
# ─── JWT Security ─────────────────────────────────────────────────────────────
SECRET_KEY=dev-secret-key-please-change-in-production-32chars
JWT_SECRET=production-jwt-signing-secret-key-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ─── Zoho Catalyst Configuration ──────────────────────────────────────────────
CATALYST_PROJECT_ID=10001928374
CATALYST_CLIENT_ID=1000.XXXXXXXXXXXXXXXXXXXXXXXX
CATALYST_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CATALYST_REFRESH_TOKEN=1000.YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY.ZZZZZZZZZZZZZZZZ
CATALYST_DC=IN

# ─── NVIDIA AI Hosted APIs ───────────────────────────────────────────────────
NVIDIA_API_KEY=nvapi-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ─── Groq Fallback LLM (Optional) ─────────────────────────────────────────────
GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ─── Server Configuration ─────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4173
```

---

## 5. Deployment Options

### Local Development Server
```bash
cd prahari-ai-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

### Deployment to Zoho Catalyst AppSail
1. Install Catalyst CLI:
   ```bash
   npm install -g zcatalyst-cli
   ```
2. Log in and initialize:
   ```bash
   catalyst login
   catalyst init
   ```
3. Select **AppSail** build target (Python environment) and deploy:
   ```bash
   catalyst deploy
   ```

---

## 6. API Endpoint Specification

### NVIDIA AI Hosted Endpoints
- `POST /api/v1/ai/speech-to-text` — Audio file upload to text transcription.
- `POST /api/v1/ai/text-to-speech` — Text payload to binary speech synthesis (`audio/mpeg`).
- `POST /api/v1/ai/translate` — Bidirectional Kannada ↔ English neural translation.
- `POST /api/v1/ai/chat` — Open-source LLM chat completion.
- `POST /api/v1/ai/summarize` — Long report and FIR summarization.

### Zoho Catalyst Microservice Endpoints
- `POST /api/v1/catalyst/ocr` — Document image text extraction (SSE Live Stream).
- `POST /api/v1/catalyst/text-analysis` — Entity, sentiment, and keyword detection.
- `POST /api/v1/catalyst/face-analysis` — Face detection and demographic attribute analysis.
- `POST /api/v1/catalyst/object-recognition` — Object identification in evidence files.
- `POST /api/v1/catalyst/image-moderation` — Explicit image content detection.
- `POST /api/v1/catalyst/barcode` — QR code & barcode scanning.
- `POST /api/v1/catalyst/identity` — ID card parser (Aadhaar / Passport / DL).
