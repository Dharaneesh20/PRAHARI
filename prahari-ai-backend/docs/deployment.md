# PRAHARI AI — Zoho Catalyst & Zia Services Deployment Guide

This guide provides step-by-step instructions for setting up a **Zoho Catalyst** account, creating a project, enabling **Zia Services** (Speech-to-Text, Text-to-Speech, Neural Translation, and ML OCR), obtaining API credentials, and deploying the PRAHARI AI backend.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Create a Zoho Catalyst Account](#step-1-create-a-zoho-catalyst-account)
3. [Step 2: Create a Catalyst Project](#step-2-create-a-catalyst-project)
4. [Step 3: Access Zia Services in Catalyst Console](#step-3-access-zia-services-in-catalyst-console)
5. [Step 4: Generate Zoho OAuth Token & Get Project ID](#step-4-generate-zoho-oauth-token--get-project-id)
6. [Step 5: Configure Backend Environment Variables](#step-5-configure-backend-environment-variables)
7. [Step 6: Test Zia Endpoints Locally](#step-6-test-zia-endpoints-locally)
8. [Step 7: Deploy Backend to Zoho Catalyst AppSail (Serverless)](#step-7-deploy-backend-to-zoho-catalyst-appsail-serverless)
9. [API Reference & Endpoints](#api-reference--endpoints)

---

## 1. Prerequisites
- A valid email address to sign up on [Zoho Catalyst](https://catalyst.zoho.com).
- Python 3.12+ installed on your deployment server or local development machine.
- Node.js 18+ and `catalyst-cli` (optional for local deployment, required for AppSail deployment).

---

## Step 1: Create a Zoho Catalyst Account

1. Open your web browser and navigate to **[https://catalyst.zoho.com](https://catalyst.zoho.com)**.
2. Click **Sign Up** (or **Log In** if you already have a Zoho Account).
3. Complete the registration form with your email and organization details.
4. Verify your email address via the confirmation link sent by Zoho.

---

## Step 2: Create a Catalyst Project

1. After logging into the **Zoho Catalyst Console** (`https://console.catalyst.zoho.com`), click **Create Project**.
2. Enter a **Project Name** (e.g., `PRAHARI-AI`).
3. Select your preferred **Data Center / Region** (e.g., *IN - India* or *US - United States*).
4. Click **Create**.
5. Once created, copy the **Project ID** displayed in the project overview header. You will need this for your `.env` file (`CATALYST_PROJECT_ID`).

---

## Step 3: Access Zia Services in Catalyst Console

Zoho Catalyst Zia provides built-in AI/ML microservices.

1. In the left navigation menu of the Catalyst Console, expand **Zia Services** / **AI & Machine Learning**.
2. You will see available microservices:
   - **Speech-to-Text (STT)**: Converts spoken audio files (Kannada `kn-IN`, English `en-IN`) into text.
   - **Text-to-Speech (TTS)**: Converts text strings into natural-sounding audio streams.
   - **Neural Translation**: Translates text between English and Kannada.
   - **Optical Character Recognition (OCR)**: Extracts text from uploaded image files (PNG, JPG, TIFF, BMP, PDF).
3. Ensure these services are enabled for your project (they are enabled by default for all Catalyst projects).

---

## Step 4: Generate Zoho OAuth Token & Get Project ID

To authenticate API requests sent from the backend to Catalyst Zia Services:

### Option A: Using Catalyst API Portal / Developer Console (Recommended)
1. Go to the **Zoho Developer Console**: [https://api-console.zoho.com](https://api-console.zoho.com).
2. Click **Add Client** and select **Self Client**.
3. Copy the generated **Client ID** and **Client Secret**.
4. In the **Generate Code** tab, enter the required Zia scope:
   ```
   Catalyst.zia.READ,Catalyst.zia.CREATE,Catalyst.projects.READ
   ```
5. Set the duration to **10 minutes** (or generate a permanent Refresh Token).
6. Exchange the code for an Access Token (`Zoho-oauthtoken`).

### Option B: Using Permanent API Key / Access Token
1. In the Catalyst Console, go to **Settings** > **Developer Tools** > **API Tokens**.
2. Click **Generate Token**.
3. Copy the token string (`CATALYST_ZIA_TOKEN`).

---

## Step 5: Configure Backend Environment Variables

Open or create the `.env` file in `prahari-ai-backend/.env`:

```env
# ── Zoho Catalyst Credentials ─────────────────────────────────────────────
CATALYST_PROJECT_ID=12345678901234567       # Replace with your Catalyst Project ID
CATALYST_ZIA_TOKEN=Zoho-oauthtoken-your-token # Replace with your token
ZIA_BASE_URL=https://api.catalyst.zoho.com/baas/v1/project

# ── LLM API Keys ──────────────────────────────────────────────────────────
NVIDIA_API_KEY=nvapi-your-nvidia-api-key
GROQ_API_KEY=gsk_your-groq-api-key

# ── Server Config ─────────────────────────────────────────────────────────
HOST=0.0.0.0
PORT=8000
SECRET_KEY=prahari-ai-secret-key-change-in-production-min-32-chars
```

---

## Step 6: Test Zia Endpoints Locally

Start the backend server:

```bash
cd prahari-ai-backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

Verify endpoints using `curl` or Postman:

### 1. Test Speech-to-Text (STT)
```bash
curl -X POST "http://localhost:8000/api/v1/zia/speech-to-text" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "file=@sample_audio.wav" \
  -F "language=kn-IN"
```

### 2. Test Text-to-Speech (TTS)
```bash
curl -X POST "http://localhost:8000/api/v1/zia/text-to-speech" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text": "ಪ್ರಹರಿ AI ಗೆ ಸ್ವಾಗತ", "language": "kn-IN"}' \
  --output response.mp3
```

### 3. Test Neural Translation
```bash
curl -X POST "http://localhost:8000/api/v1/zia/translate" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Show theft cases in Bengaluru", "target_lang": "kn-IN"}'
```

### 4. Test Catalyst ML OCR
```bash
curl -X POST "http://localhost:8000/api/v1/zia/ocr" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "file=@sample_fir.png" \
  -F "language=eng"
```

---

## Step 7: Deploy Backend to Zoho Catalyst AppSail (Serverless)

Zoho Catalyst **AppSail** allows hosting Python FastAPI standalone web services directly on Zoho infrastructure.

### 1. Install Catalyst CLI
```bash
npm install -g zcatalyst-cli
```

### 2. Log in to Catalyst CLI
```bash
catalyst login
```

### 3. Initialize AppSail in Project Root
```bash
cd prahari-ai-backend
catalyst init
```
- Select **AppSail** when prompted.
- Choose Python 3.12 stack.
- Name the app `prahari-backend`.

### 4. Create `app-sail.json` configuration file in `prahari-ai-backend/`:
```json
{
  "command": "python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT",
  "stack": "python3.12",
  "env_variables": {
    "CATALYST_PROJECT_ID": "12345678901234567",
    "ZIA_BASE_URL": "https://api.catalyst.zoho.com/baas/v1/project"
  }
}
```

### 5. Deploy to Production
```bash
catalyst deploy
```
Once deployment completes, Catalyst CLI will output your live public web service URL (e.g., `https://prahari-backend-12345.appsail.zoho.com`).

---

## API Reference & Endpoints

| Endpoint | Method | Input | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/zia/speech-to-text` | `POST` | `multipart/form-data` (`file`, `language`) | Audio transcription via Catalyst STT |
| `/api/v1/zia/text-to-speech` | `POST` | `application/json` (`text`, `language`) | Voice synthesis via Catalyst TTS |
| `/api/v1/zia/translate` | `POST` | `application/json` (`text`, `target_lang`) | Kannada ↔ English Neural Translation |
| `/api/v1/zia/ocr` | `POST` | `multipart/form-data` (`file`, `language`) | Image OCR via Catalyst Zia ML OCR API |
