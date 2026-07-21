# PRAHARI AI — Predictive Risk Analysis & Hotspot Alert Routing Intelligence

**Karnataka State Police — Law Enforcement Multimodal AI Platform**

[![Live Demo](https://img.shields.io/badge/Live_Demo-AppSail_Hosted-0052CC.svg)](https://prahari-ai-demo.catalystappsail.com)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev)
[![Zoho Catalyst](https://img.shields.io/badge/Zoho_Catalyst-AppSail_%26_Quick_ML-CBA227.svg)](https://catalyst.zoho.com)
[![NVIDIA AI](https://img.shields.io/badge/NVIDIA_AI-Hosted_APIs-76B900.svg)](https://build.nvidia.com)

---

## Executive Overview

**PRAHARI AI** (Predictive Risk Analysis & Hotspot Alert Routing Intelligence) is a full-stack tactical command and intelligence application developed for state law enforcement. The system processes First Information Reports (FIRs), spatio-temporal incident data, and multimodal evidence streams to provide command officers and station staff with predictive analytics, real-time hotspot mapping, automated report drafting, and natural language database querying.

### Deployment Link
- **Live Demo Instance**: [https://prahari-ai-demo.catalystappsail.com](https://prahari-ai-demo.catalystappsail.com)
- **Deployment Platform**: Zoho Catalyst AppSail (Application Hosting) & Zoho Catalyst Quick ML (Machine Learning Microservices)

---

## System Architecture & Component Decoupling

The platform architecture strictly decouples machine learning and AI operations between **Zoho Catalyst Cloud Services** and **NVIDIA AI Hosted APIs**:

```
+-------------------------------------------------------------------------------+
|                                  PRAHARI AI                                   |
|                        Frontend: React + Vite + TypeScript                    |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       Backend API: FastAPI (Python 3.12)                      |
|                  Authentication: OAuth2 + JWT (prahari_auth.db)                |
+-----------------------------------+-------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+---------------------------------------+ +-------------------------------------+
|        ZOHO CATALYST SERVICES         | |          NVIDIA AI APIS             |
|  (Hosted via AppSail & Quick ML)      | |      (Hosted API Endpoints)         |
+---------------------------------------+ +-------------------------------------+
| • Quick ML Optical Character Rec.     | | • Speech-to-Text (Parakeet ASR)     |
| • Quick ML Vision & Object Detection  | | • Text-to-Speech (FastPitch TTS)    |
| • Quick ML Face Recognition           | | • Neural Translation (KN <-> EN)    |
| • Quick ML Text Analytics             | | • LLM Inference (Llama-3 / Mistral) |
| • Quick ML Identity Scanner           | +-------------------------------------+
| • Quick ML Image Moderation           |
| • Quick ML Barcode & QR Scanner       |
+---------------------------------------+
```

---

## Microservices Breakdown

### 1. Zoho Catalyst Microservices (Quick ML & AppSail)
- **Zoho Catalyst AppSail**: Full-stack application container deployment, lifecycle management, and scalable endpoint hosting.
- **Zoho Catalyst Quick ML — OCR Engine**: Converts scanned evidence documents, handwritten field notes, and official FIR paper forms into structured text (`POST /api/v1/catalyst/ocr`).
- **Zoho Catalyst Quick ML — Vision AI & Object Recognition**: Analyzes evidence imagery to detect vehicles, weapons, and key objects (`POST /api/v1/catalyst/object-detection`).
- **Zoho Catalyst Quick ML — Face Recognition**: Biometric face detection and verification (`POST /api/v1/catalyst/face-analytics`).
- **Zoho Catalyst Quick ML — Text Analytics**: Sentiment scoring, entity extraction, and keyphrase detection on crime narratives (`POST /api/v1/catalyst/text-analytics`).
- **Zoho Catalyst Quick ML — Identity Scanner**: Automated parsing of government-issued identity documents (`POST /api/v1/catalyst/identity-scanner`).
- **Zoho Catalyst Quick ML — Image Moderation**: Automated safety and explicit content screening (`POST /api/v1/catalyst/image-moderation`).
- **Zoho Catalyst Quick ML — Barcode Scanner**: Parsing barcodes and QR codes from evidence tags (`POST /api/v1/catalyst/barcode-scanner`).

### 2. NVIDIA AI Hosted APIs
- **Speech-to-Text (STT)**: High-accuracy automatic speech recognition in English (`en-IN`) and Kannada (`kn-IN`) (`POST /api/v1/ai/stt`).
- **Text-to-Speech (TTS)**: High-fidelity voice synthesis for reading analytical reports aloud (`POST /api/v1/ai/tts`).
- **Neural Translation**: Bidirectional translation between Kannada and English (`POST /api/v1/ai/translate`).
- **LLM Inference Engine**: Conversational intelligence, tactical querying, and automated chargesheet/FIR draft generation (`POST /api/v1/ai/chat`, `POST /api/v1/ai/summarize`).

---

## Core Application Modules

1. **Tactical KPI Dashboard**: Real-time monitoring of active cases, daily alerts, clearance rates, average response times, and high-risk zones.
2. **AI Multimodal Command Center**: Natural language voice input, voice output, document OCR scanning, reasoning step breakdown, and live chat querying.
3. **GIS Crime Map**: Interactive spatial mapping of incident clusters, police station boundaries, and risk zone heatmaps.
4. **Live Incidents & Dispatch**: Incident status tracking, urgency ranking, and unit assignments.
5. **Advanced Analytics**: Crime category distribution, time-slot trends, repeat offender analysis, and co-accused network graphs.
6. **Enterprise PDF Generator**: Chrome Headless template engine generating formatted investigation reports with security watermarking.

---

## Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Hosting & Cloud Infrastructure** | **Zoho Catalyst AppSail** |
| **Machine Learning Microservices** | **Zoho Catalyst Quick ML** (OCR, Vision, Face, Text Analytics, Identity) |
| **Speech, Voice & LLM Endpoints** | **NVIDIA AI Hosted APIs** (Parakeet STT, FastPitch TTS, Llama-3 / Mistral LLM) |
| **Backend Framework** | FastAPI (Python 3.12), SQLite (`prahari_auth.db`), OAuth2, JWT Security |
| **Data & Query Engine** | DuckDB, Pandas, NumPy, NetworkX |
| **Frontend Framework** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Leaflet, Lucide Icons |

---

## Environment & Configuration

Environment variables configuration sample (`prahari-ai-backend/.env`):

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000

# JWT Authentication
SECRET_KEY=your-production-jwt-secret-min-32-characters
JWT_SECRET=your-jwt-secret-key

# Zoho Catalyst Credentials
CATALYST_PROJECT_ID=your-catalyst-project-id
CATALYST_CLIENT_ID=your-catalyst-client-id
CATALYST_CLIENT_SECRET=your-catalyst-client-secret
CATALYST_REFRESH_TOKEN=your-catalyst-refresh-token
CATALYST_DC=IN

# NVIDIA AI Hosted APIs
NVIDIA_API_KEY=nvapi-your-nvidia-api-key
```

### Local Execution Instructions

#### 1. Backend Service
```bash
cd prahari-ai-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 2. Frontend Client
```bash
cd prahari-ai-frontend
npm install
npm run dev
```

For complete OAuth token generation and Catalyst project configuration details, refer to the [Deployment Guide](prahari-ai-backend/docs/deployment.md).

---

## Organizational Credits & Acknowledgements

We acknowledge and credit the following organizations whose services, emblems, and APIs power the PRAHARI AI application:

- **Karnataka State Police**: For domain context, organizational structure, operational guidelines, and police station data modeling.
- **Zoho Catalyst**: For cloud infrastructure, application container hosting via **AppSail**, and machine learning microservices via **Quick ML**.
- **NVIDIA AI**: For hosted AI endpoints powering Speech-to-Text (STT), Text-to-Speech (TTS), Neural Translation, and LLM inference engines.

---

*PRAHARI AI — Predictive Risk Analysis & Hotspot Alert Routing Intelligence*
