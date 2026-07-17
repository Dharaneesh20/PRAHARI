# Project Change Log — PRAHARI AI-ML & Backend Pipeline
===================================================================

This document details all the enhancements, features, and pipeline steps added to the **PRAHARI** AI-ML and backend stack in simple, clear English.

---

## 1. Data Cleaning & Preparation (Steps 1-3)
* **Normalized Database**: We cleaned a raw dataset containing over 1.6 million crime records (`FIR_Details_Data.csv`), removed duplicate cases, and organized them into clean relational tables in a DuckDB database (`karnataka_fir.duckdb`).
* **Relational Schema**: Created tables for cases (`CaseMaster`), police stations (`Unit`), districts (`District`), accused details (`Accused`), and arrests (`ArrestSurrender`).
* **PII Synthesis**: For privacy and security, we replaced real names, phone numbers, and addresses of accused individuals with realistic, synthetically generated data.

## 2. Feature Engineering & Geospatial Split (Step 4)
* **Dashboard Skew Prevention**: Created a clean split of crime location records:
  - `fact_crime_agg`: Holds all cases (using approximate central coordinates where exact locations were missing).
  - `fact_crime_geo`: Holds only cases with genuine GPS coordinates.
* **Accuracy Tracking**: Added a `RealCoordCaseCount` column to count only actual GPS coordinates, ensuring maps show true hotspots without being distorted by generic center-point entries.

## 3. Crime Trend Forecasting (Step 6)
* **Monthly Predictions**: Implemented forecasting algorithms (Holt-Winters and Naive models) to predict next-month crime counts for each district and crime head.
* **Smart Model Selection**: Set up a benchmarking step (`trend_model_benchmark`) that compares models and automatically selects the one with the lowest Mean Absolute Error (MAE).
* **Low Confidence Flags**: Added a `LowConfidence_ReviewFlag` to highlight and caution users about forecasts built on fewer than 30 historical cases.

## 4. Hotspot Cluster Detection (Step 6)
* **DBSCAN & HDBSCAN Clustering**: Configured machine learning clustering models to group actual crime coordinates into dense hotspots.
* **Winning Model Benchmarks**: Created a benchmarking tracker (`hotspot_model_benchmark`) that scores and selects the best clustering configuration per district using Silhouette scores and noise metrics.
* **Dynamic Hotspot Summaries**: Generated a summary table (`hotspot_summary`) with real coordinate counts and confidence warnings for clusters with low support.

## 5. Criminal Network Graph Integration
* **Co-Accused Graph**: Constructed a network graph using NetworkX, linking criminals who were arrested or charged together in the same cases.
* **Community Detection**: Applied the Louvain algorithm to partition the offender network into clustered criminal communities.
* **Precomputed Summary**: Saved connection counts and cluster IDs into a `NetworkSummary` table.
* **Live Graph Traversal**: Configured the agent to detect queries like *"Who are the associates of offender #14749?"* and perform a live neighbor-traversal on the graph when needed.

## 6. Role-Based Access Control (RBAC)
* **Jurisdictional Restrictions**: Implemented a secure query rewriter (`rbac.py`) to restrict data access based on user role:
  - **SHO**: Scoped to a single police station (`UnitID`).
  - **SP**: Scoped to a single district (`DistrictID`).
  - **SCRB_ADMIN**: Unscoped (statewide access).
* **Automatic WHERE-Clause Injection**: Before any SQL query, forecasting task, hotspot request, or network query runs, the system rewrites the SQL to inject scope filters. The LLM never sees or overrides these restrictions.
* **Table Scoping Whitelist**: Scoped all 35 whitelisted database tables including case logs, arrest logs, victims, courts, employees, and precomputed aggregates.

## 7. Kannada Voice Input & Output Integration
* **Voice-to-Voice Wrapper**: Added support for speech-to-speech queries by integrating Sarvam AI's REST APIs:
  - **Transcription (Saaras v3)**: Takes Kannada or English audio streams and transcribes them (with auto-detecting language support).
  - **Translation (Sarvam-Translate)**: Translates native Kannada transcripts to English for SQL execution.
  - **Speech Synthesis (Bulbul v3)**: Translates final English answers back to Kannada and speaks them using the high-quality, natural voice model `ritu`.
* **Graceful Fallbacks**: If the Sarvam API times out or fails, the orchestrator automatically falls back to text-only mode instead of crashing.

## 8. Conversation Session Logging & PDF Export
* **Enhanced Audit Log**: Configured the database to track query metadata (`AgentAuditLog`), logging timestamps, user questions, routes taken, generated SQL, row counts, user roles, scope IDs, voice parameters (`input_mode`, `detected_language`), and `session_id`.
* **ReportLab PDF Export**: Created `pdf_export.py` to compile a chat session into a formatted PDF document. It styles SQL statements in grey code blocks, prints final answers, lists disclaimers verbatim, and renders page headers and footers detailing the session's authorization profile.
* **FastAPI Downloads**: Added a `GET /export/{session_id}` route to download the rendered conversation history PDF report directly from the backend.
