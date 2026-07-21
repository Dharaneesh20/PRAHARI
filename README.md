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

  [![Live Demo](https://img.shields.io/badge/Live_Demo-AppSail_Hosted-0052CC.svg)](https://prahari-ai-demo.catalystappsail.com)
  [![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg)](https://python.org)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com)
  [![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev)
  [![Zoho Catalyst](https://img.shields.io/badge/Zoho_Catalyst-AppSail_%26_Quick_ML-CBA227.svg)](https://catalyst.zoho.com)
  [![NVIDIA AI](https://img.shields.io/badge/NVIDIA_AI-Hosted_APIs-76B900.svg)](https://build.nvidia.com)
</div>

---

## About the Project

**PRAHARI AI** (Proactive Response & Analytics Hub for Actionable Records & Investigation) is a multimodal AI command and tactical analytics platform engineered for state law enforcement. Developed for the Karnataka State Police Datathon, the platform empowers police command staff, Station House Officers (SHOs), and intelligence analysts to transform raw First Information Reports (FIRs), spatio-temporal incident logs, and evidence streams into actionable tactical intelligence.

The platform is designed to handle complex data querying and deliver uninterrupted intelligence utilizing robust fallback mechanisms and specialized AI microservices.

### Live Application Endpoint
- **Live Demo Instance**: [https://prahari-ai-demo.catalystappsail.com](https://prahari-ai-demo.catalystappsail.com) (Placeholder link)

---

## What We Implemented

We developed a comprehensive analytics and intelligence hub that features:

- **Intensive LLM Fallback Mechanism**: An integrated system featuring 4 fallback LLM models, ensuring uninterrupted working, high availability, and consistent, high-quality information retrieval even during service disruptions.
- **AIML Pipeline with DuckDB**: A robust Artificial Intelligence and Machine Learning pipeline integrated seamlessly with DuckDB to process, aggregate, and analyze vast amounts of data efficiently.
- **Stronger Query Engine**: A powerful query engine tailored for hard querying, translating complex natural language tactical questions into optimized SQL for deep data exploration.
- **Decoupled Architecture**: Separation of core analytical logic from external AI capabilities, utilizing robust cloud deployment strategies.
- **Multimodal Interfaces**: Support for optical character recognition, object detection, speech-to-text, and text-to-speech to assist officers in varied tactical scenarios.

---

## How We Implemented It

Our team developed every layer of this application collaboratively, covering frontend, backend, AI/ML, and cloud integration.

- **Frontend**: Built with React 19, TypeScript, Vite, and Tailwind CSS. We designed interactive maps and tactical dashboards for real-time data visualization.
- **Backend & AIML**: Powered by FastAPI (Python 3.12). We implemented a comprehensive Natural Language to SQL (NL2SQL) engine utilizing DuckDB for fast aggregations, alongside Pandas and NetworkX for network analysis. The robust LLM fallback mechanism is built natively into our intelligence pipeline.
- **Cloud Infrastructure**: The entire application is deployed using modern cloud containerization. The frontend and backend services are securely hosted, maintaining high uptime and secure access through OAuth2 and JWT-based authentication.

---

## Services Used on Zoho Catalyst

We heavily utilized **Zoho Catalyst** to power critical microservices and host our application securely:

- **Zoho Catalyst AppSail**: Provides scalable container hosting and execution lifecycle management for our full-stack application, ensuring robust deployment.
- **Zoho Catalyst Quick ML**: Powers our computer vision and text analysis microservices, specifically including:
  - **Optical Character Recognition (OCR)**: Extracting text from documents and forms.
  - **Vision AI & Object Detection**: Identifying objects from crime scene imagery.
  - **Face Analytics & Identity Scanner**: Processing demographic attributes and identity documents.
  - **Text Analytics**: Extracting entities and analyzing sentiments in incident reports.

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
- **Zoho Catalyst**: For cloud infrastructure, application container hosting via **AppSail**, and machine learning microservices via **Quick ML**. The Zoho and Catalyst logos represent our deployment backbone.
- **NVIDIA AI**: For hosted AI endpoints powering Speech-to-Text, Text-to-Speech, Neural Translation, and LLM inference engines.

---

*PRAHARI AI — Proactive Response & Analytics Hub for Actionable Records & Investigation*
