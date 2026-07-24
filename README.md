# PRAHARI AI

**Proactive Response & Analytics Hub for Actionable Records & Investigation**  
*AI-Powered Intelligence Copilot & Tactical Analytics Platform for Karnataka State Police*

<div align="center">
  <table>
    <tr>
      <td align="center" valign="middle" border="0">
        <img src="prahari-ai-frontend/public/image_9a5181.png" width="110" alt="Karnataka State Police Emblem" /><br />
        <sub><b>Karnataka State Police</b></sub>
      </td>
      <td align="center" valign="middle" border="0">
        <img src="prahari-ai-frontend/public/image_9a4dc1.png" width="110" alt="PRAHARI AI Logo" /><br />
        <sub><b>PRAHARI AI</b></sub>
      </td>
      <td align="center" valign="middle" border="0">
        <img src="prahari-ai-frontend/public/zoho-logo-web.svg" width="110" alt="Zoho Logo" /><br />
        <sub><b>Zoho</b></sub>
      </td>
      <td align="center" valign="middle" border="0">
        <img src="prahari-ai-frontend/public/catalyst.svg" width="110" alt="Zoho Catalyst Logo" /><br />
        <sub><b>Zoho Catalyst</b></sub>
      </td>
    </tr>
  </table>

  <br />

  [![Live Demo](https://img.shields.io/badge/Live_Demo-Catalyst_Slate-0052CC.svg)](https://prahariai.onsite.in/)
  [![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg)](https://python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com)
  [![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev)
  [![Zoho Catalyst](https://img.shields.io/badge/Zoho_Catalyst-AppSail_%26_Quick_ML-CBA227.svg)](https://catalyst.zoho.com)
  [![NVIDIA AI](https://img.shields.io/badge/NVIDIA_AI-Hosted_APIs-76B900.svg)](https://build.nvidia.com)
</div>

---

## About the Project

**PRAHARI AI** (Proactive Response & Analytics Hub for Actionable Records & Investigation) is a multimodal AI command and tactical analytics platform engineered for state law enforcement. Developed for the Karnataka State Police Datathon, the platform empowers police command staff, Station House Officers (SHOs), and intelligence analysts to transform raw First Information Reports (FIRs), spatio-temporal incident logs, and evidence streams into actionable tactical intelligence.

The application is fully completed and hosted on Zoho Catalyst.

### Live Application Endpoints
- **Application Live Link Catalyst (Slate Hosted)**: [https://prahariai.onsite.in/](https://prahariai.onslate.in/)
- **Backend Endpoint Catalyst (AppSail Hosted)**: [https://backend-prahari-ai-50044201698.development.catalystappsail.in/](https://backend-prahari-ai-50044201698.development.catalystappsail.in/)
- **ML Pipeline Endpoint Catalyst (AppSail Hosted)**: [https://ml-prahari-ai-docker-50044201698.development.catalystappsail.in/health](https://ml-prahari-ai-docker-50044201698.development.catalystappsail.in/health)

---

## Key Features & What We Implemented

We developed a comprehensive analytics and intelligence hub that features:

- **Built-in Application Tour**: An interactive first-time user navigation guide. Just click the "Tour" option on the Login page to easily explore the platform's capabilities.
- **Multilingual Support (Kannada & English)**: Deep regional language support via **Zoho Catalyst Zia NLP models** including:
  - **Zia Neural Translation**: Seamless translation from Kannada to English and English to Kannada.
  - **Zia Text-to-Speech & Speech-to-Text**: Allowing officers to dictate and listen to incident reports naturally.
- **Advanced OCR Recognition**: Extracting text from physical documents, evidence, and forms using **Zoho Catalyst Zia OCR**.
- **Role-Based Access Control (RBAC)**: Secure authentication and authorization powered by **Zoho Catalyst Cloud Scale OAuth**.
- **Crime Map Hotspot Analysis**: Interactive mapping and geographic spatial analysis powered by our AI/ML pipeline.
- **Comprehensive PDF Generation**: Instantly generate well-formatted, professional PDF reports for law enforcement conversations and analytics.
- **Intensive LLM Fallback Mechanism**: An integrated multi-model architecture ensuring uninterrupted access and robust fallback protection. We interface with multiple models including:
  - **NVIDIA Models**: DeepSeek, Nemotron 550B, Nemotron 120B, and Mistral.
  - **Groq LLaMA 120B**: Provides strong fallback protection for uninterrupted AI intelligence, even during service disruptions.
- **AIML Pipeline with DuckDB**: Seamless integration with DuckDB to process, aggregate, and analyze vast amounts of data efficiently.
- **Stronger Query Engine**: A powerful NL2SQL engine translating complex natural language tactical questions into optimized SQL for deep data exploration.

---

## How We Implemented It

Our team developed every layer of this application collaboratively, covering frontend, backend, AI/ML, and cloud integration.

- **Frontend**: Built with React 19, TypeScript, Vite, and Tailwind CSS. We designed interactive maps and tactical dashboards for real-time data visualization.
- **Backend & AIML**: Powered by FastAPI (Python 3.12). We implemented a comprehensive Natural Language to SQL (NL2SQL) engine utilizing DuckDB for fast aggregations, alongside Pandas and NetworkX for network analysis. 
- **Cloud Infrastructure**: The entire application is deployed using modern cloud containerization securely hosted on Zoho Catalyst.

---

## Services Used on Zoho Catalyst

We heavily utilized **Zoho Catalyst** to power critical microservices and host our application securely:

- **Zoho Catalyst AppSail**: Provides scalable container hosting and execution lifecycle management for our full-stack backend and ML pipeline.
- **Zoho Catalyst Slate**: Hosts our interactive frontend dashboard securely.
- **Zoho Catalyst Quick ML & Zia Services**: Powers our natural language and computer vision microservices:
  - **Zia OCR**: Extracting text from documents and forms.
  - **Zia Translation, STT, and TTS**: Powering our English-Kannada multilingual accessibility.
- **Zoho Catalyst Cloud Scale OAuth**: Securing our Role-Based Access Control (RBAC) architecture.

---

## The Development Team

This project was built collaboratively by a dedicated team of developers. We all worked across every area, including frontend, backend, AI/ML pipelines, and cloud infrastructure, developing the entire platform together.

- **Dharaneesh R S**
- **Aadithya**
- **Anumitha**

---

## Organizational Credits & Acknowledgements

We acknowledge and credit the following organizations whose platforms, emblems, and APIs power the PRAHARI AI application. Their logos have been respectfully used to signify our integration and platform alignment:

- **Karnataka State Police**: For domain context, organizational structure, operational guidelines, and police station data modeling. We proudly use their emblem in our application.
- **Zoho Catalyst**: For cloud infrastructure, application container hosting via **AppSail** and **Slate**, and machine learning microservices via **Quick ML & Zia**. The Zoho and Catalyst logos represent our deployment backbone.
- **NVIDIA AI & Groq**: For hosted AI endpoints powering our highly-available multi-model fallback LLM architecture.

---

*PRAHARI AI — Proactive Response & Analytics Hub for Actionable Records & Investigation*
