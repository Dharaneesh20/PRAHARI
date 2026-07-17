# Karnataka Police FIR Analytics — API Specification

This document defines the REST API specification for the **Karnataka FIR Datathon** platform. These endpoints bridge the analytical database (DuckDB) and predictive models (SARIMA/XGBoost/DBSCAN) with front-end dashboard applications.

---

## Endpoint Summary

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Overview & Volume** | [`/api/v1/crime/volume`](#/api/v1/crime/volume) | `GET` | Aggregated case counts and case demographics. |
| **Overview & Volume** | [`/api/v1/crime/chargesheet-rates`](#/api/v1/crime/chargesheet-rates) | `GET` | Case chargesheet rates and comparisons. |
| **Spatial & Hotspots** | [`/api/v1/crime/hotspots`](#/api/v1/crime/hotspots) | `GET` | Geo-coordinates of real-coordinate crime zones. |
| **Spatial & Hotspots** | [`/api/v1/crime/clusters`](#/api/v1/crime/clusters) | `GET` | Density-based crime clusters (DBSCAN/HDBSCAN results). |
| **Offender Networks** | [`/api/v1/offenders/repeat-offenders`](#/api/v1/offenders/repeat-offenders) | `GET` | Statistics and profiles of repeat offenders. |
| **Offenders Networks** | [`/api/v1/offenders/coaccused-network`](#/api/v1/offenders/coaccused-network) | `GET` | Graph structures (nodes/edges) for co-accused networks. |
| **Trend & Forecasting**| [`/api/v1/crime/forecast`](#/api/v1/crime/forecast) | `GET` | Time-series forecasting for specific crime groups. |
| **Trend & Forecasting**| [`/api/v1/crime/forecast/benchmarks`](#/api/v1/crime/forecast/benchmarks) | `GET` | Model selection scores (SARIMA vs. Holt-Winters vs. XGBoost). |
| **Natural Language** | [`/api/v1/search/nl2sql`](#/api/v1/search/nl2sql) | `POST` | LLM-powered natural language querying engine with RBAC. |
| **Natural Language** | [`/api/v1/chat/voice`](#/api/v1/chat/voice) | `POST` | Voice-to-voice query analytics endpoint (STT, translation, TTS). |
| **Natural Language** | [`/api/v1/export/{session_id}`](#/api/v1/export/session_id) | `GET` | Export conversation history to ReportLab PDF report. |

---

## 1. Overview & Volume Endpoints

### `GET /api/v1/crime/volume`
Retrieves aggregated case counts over time, filterable by administrative and statutory boundaries. Uses the pre-aggregated `fact_crime_agg` table.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | No | `null` | Exact district name filter (e.g., `Bengaluru City`, `Mysuru Dist`). |
| `unit` | `string` | No | `null` | Exact police station unit name (e.g., `South CEN Crime PS`). |
| `crime_group` | `string` | No | `null` | Major crime head group (e.g., `THEFT`, `ASSAULT`). |
| `gravity` | `string` | No | `null` | Heinous classification: `Heinous` or `Non Heinous`. |
| `year` | `integer` | No | `null` | Calendar year filter (e.g., `2023`). |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "filters": {
    "district": "Bengaluru City",
    "year": 2023
  },
  "data": {
    "total_cases": 72902,
    "heinous_cases": 4512,
    "non_heinous_cases": 68390,
    "breakdown": [
      {
        "CrimeGroupName": "CYBER CRIME",
        "CaseCount": 18450,
        "TotalChargesheeted": 6120
      },
      {
        "CrimeGroupName": "THEFT",
        "CaseCount": 14201,
        "TotalChargesheeted": 8110
      }
    ]
  }
}
```

---

### `GET /api/v1/crime/chargesheet-rates`
Calculates and compares case chargesheet rates.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `districts` | `array[string]` | Yes | `[]` | List of districts to compare (e.g., `["Bengaluru City", "Mysuru City"]`). |
| `year` | `integer` | No | `null` | Filter by year (e.g., `2022`). |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "year": 2022,
  "comparisons": [
    {
      "district": "Bengaluru City",
      "total_cases": 49793,
      "total_chargesheets": 27056,
      "chargesheet_rate": 54.34
    },
    {
      "district": "Mysuru City",
      "total_cases": 3656,
      "total_chargesheets": 2102,
      "chargesheet_rate": 57.49
    }
  ]
}
```

---

## 2. Spatial & Hotspots Endpoints

### `GET /api/v1/crime/hotspots`
Returns geo-coordinates of crime incident clusters. 

> [!IMPORTANT]
> **Data Governance Caveat**: This endpoint queries the `fact_crime_geo` table which **excludes all imputed coordinates**, ensuring dashboards do not display artificial town/district centroid hotspots.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | Yes | `null` | Name of district (e.g. `Bengaluru City`). |
| `min_cases` | `integer` | No | `5` | Suppresses locations with real coord counts lower than this threshold. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "district": "Bengaluru City",
  "mapping_provenance": "real_coordinates_only",
  "hotspots": [
    {
      "UnitName": "South CEN Crime PS",
      "CrimeGroupName": "CYBER CRIME",
      "AvgLatitude": 12.80285,
      "AvgLongitude": 77.80971,
      "RealCoordCaseCount": 574
    },
    {
      "UnitName": "North CEN Crime PS",
      "CrimeGroupName": "CYBER CRIME",
      "AvgLatitude": 13.71627,
      "AvgLongitude": 77.55752,
      "RealCoordCaseCount": 517
    }
  ]
}
```

---

### `GET /api/v1/crime/clusters`
Returns density-based spatial clusters generated by the winning spatial algorithm (DBSCAN/HDBSCAN/K-Means) for the district, querying `hotspot_clusters` and `hotspot_summary` tables.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | Yes | `null` | Name of district. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "district": "Bengaluru City",
  "winning_model": "DBSCAN",
  "metrics": {
    "silhouette_score": 0.62,
    "noise_ratio": 12.4
  },
  "clusters": [
    {
      "cluster_id": 0,
      "centroid_lat": 12.97159,
      "centroid_lon": 77.59456,
      "core_point_count": 412,
      "primary_crime_group": "THEFT"
    },
    {
      "cluster_id": 1,
      "centroid_lat": 12.92543,
      "centroid_lon": 77.58210,
      "core_point_count": 189,
      "primary_crime_group": "CYBER CRIME"
    }
  ]
}
```

---

## 3. Offender Networks Endpoints

### `GET /api/v1/offenders/repeat-offenders`
Exposes statistical indices on repeat offenders.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | No | `null` | Filter statistics by district. |
| `crime_group` | `string` | No | `null` | Filter by major crime group. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "total_accused_records": 2984353,
    "repeat_offenders_count": 39001,
    "recidivism_rate_pct": 15.1,
    "top_recidivists": [
      {
        "AccusedName": "Samar Krish",
        "RepeatPoolID": 33338,
        "TotalOffences": 14,
        "PrimaryCrimeSubHead": "Temple Theft"
      }
    ]
  }
}
```

---

### `GET /api/v1/offenders/coaccused-network`
Retrieves co-accused network graph nodes and edges for visualizing syndicates and repeat-offender networks, extracted from `coaccused_bengaluru_city.graphml`.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | Yes | `null` | Target district (e.g. `Bengaluru City`). |
| `min_weight` | `integer` | No | `2` | Minimum co-accused occurrences between two nodes to include edge. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "district": "Bengaluru City",
  "graph": {
    "nodes": [
      { "id": "33123", "label": "Harish Thakur", "size": 8, "community": 3 },
      { "id": "33338", "label": "Samar Krish", "size": 14, "community": 3 },
      { "id": "18021", "label": "Amit Hegde", "size": 4, "community": 1 }
    ],
    "edges": [
      { "source": "33123", "target": "33338", "weight": 4, "type": "coaccused" }
    ]
  }
}
```

---

## 4. Trend & Forecasting Endpoints

### `GET /api/v1/crime/forecast`
Returns historical monthly crime counts paired with next-month predictive forecasts, querying the winning model forecast output from the benchmark evaluation.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | Yes | `null` | Target district. |
| `crime_group` | `string` | Yes | `null` | Major crime head group. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "district": "Bengaluru City",
  "crime_group": "THEFT",
  "selected_model": "SARIMA",
  "historical_data": [
    { "month": "2023-11", "actual": 1180 },
    { "month": "2023-12", "actual": 1205 }
  ],
  "forecast": {
    "month": "2024-01",
    "predicted_value": 1228.45,
    "confidence_interval_lower": 1195.30,
    "confidence_interval_upper": 1261.60
  }
}
```

---

### `GET /api/v1/crime/forecast/benchmarks`
Provides comparative benchmark indicators for trend models evaluated against the historical time-series.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `district` | `string` | Yes | `null` | Target district. |
| `crime_group` | `string` | Yes | `null` | Major crime head group. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "district": "Bengaluru City",
  "crime_group": "THEFT",
  "benchmark_scorecard": [
    {
      "model": "SARIMA",
      "mae": 14.2,
      "rmse": 18.5,
      "mape": 1.22,
      "is_winner": true
    },
    {
      "model": "Holt-Winters",
      "mae": 19.8,
      "rmse": 24.1,
      "mape": 1.64,
      "is_winner": false
    },
    {
      "model": "XGBoost",
      "mae": 26.5,
      "rmse": 32.8,
      "mape": 2.19,
      "is_winner": false
    }
  ]
}
```

---

## 5. Natural Language Agent Endpoint

### `POST /api/v1/search/nl2sql`
Processes natural language questions, translates them into validated SQL, executes them against DuckDB under RBAC scope filters, and returns structured data alongside plain-English insights.

#### Request Body
* `Content-Type: application/json`
```json
{
  "question": "Compare chargesheet rates between Bengaluru City and Mysuru City for 2022.",
  "role": "SP",
  "scope_id": 5,
  "session_id": "test-session-uuid-12345"
}
```

#### Request Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `question` | `string` | Yes | The natural language question (in English). |
| `role` | `string` | Yes | User role for jurisdiction scoping: `SHO`, `SP`, or `SCRB_ADMIN`. |
| `scope_id` | `integer` | No | Target UnitID (for `SHO`) or DistrictID (for `SP`). Required if role is SHO/SP. |
| `session_id` | `string` | No | Chat session ID string to group logs together. If missing, a new session ID is generated and returned. |

#### Response Sample (`200 OK`)
```json
{
  "status": "success",
  "question": "Compare chargesheet rates between Bengaluru City and Mysuru City for 2022.",
  "route": "comparison",
  "sql": "SELECT DistrictName, SUM(TotalChargesheeted) * 1.0 / SUM(CaseCount) AS chargesheet_rate FROM fact_crime_agg WHERE CrimeYear = 2022 AND DistrictName IN ('Bengaluru City', 'Mysuru City') GROUP BY DistrictName LIMIT 200",
  "rows_returned": 2,
  "data": [
    { "DistrictName": "Bengaluru City", "chargesheet_rate": 0.57164 },
    { "DistrictName": "Mysuru City", "chargesheet_rate": 0.59302 }
  ],
  "answer": "The chargesheet rate in Bengaluru City was 57.16% in 2022, compared to 59.30% in Mysuru City. This means that out of all cases, nearly 57 out of 100 in Bengaluru City and 59 out of 100 in Mysuru City resulted in a chargesheet. Mysuru City had a slightly higher chargesheet rate, with a difference of about 2.1 percentage points.",
  "session_id": "test-session-uuid-12345",
  "audit_id": 42
}
```

---

### `POST /api/v1/chat/voice`
Voice-to-voice query analytics endpoint. Accepts Kannada/English voice query audio uploads, transcribes and translates it, scopes it via RBAC, executes it on the NL2SQL agent, translates the text answer back to Kannada (or requested output language), and speaks the response using natural neural TTS.

#### Request Body
* `Content-Type: multipart/form-data`

#### Multipart Form Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `file` | `file (binary)` | Yes | Raw audio upload file stream (PCM/WAV/MP3). |
| `role` | `string` | Yes | User authorization role: `SHO`, `SP`, or `SCRB_ADMIN`. |
| `scope_id` | `integer` | No | Scope ID (UnitID for `SHO`, DistrictID for `SP`). Required if role is SHO/SP. |
| `output_language` | `string` | No | Target output voice language (e.g. `kn-IN` for Kannada, `en-IN` for English). Default `kn-IN`. |
| `session_id` | `string` | No | Chat session ID string to group logs together. |

#### Response Sample (`200 OK`)
```json
{
  "transcript": "ಅಪರಾಧದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು ಎಲ್ಲೆಲ್ಲಿವೆ?",
  "detected_language": "kn-IN",
  "answer_text": "The hotspots of crime in Bengaluru City are concentrated around coordinates (12.95, 77.61)...",
  "audio_response": "//T1R0R2h0dHBzOi8vc2FydmFt...",
  "audit_id": 43,
  "error": null
}
```

---

### `GET /api/v1/export/{session_id}`
Compiles and exports the complete conversation/audit history linked to `session_id` into a beautifully formatted, print-ready PDF document.

#### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `session_id` | `string` | Yes | The session ID of the conversation to export. |

#### Response Headers
* `Content-Type: application/pdf`
* `Content-Disposition: attachment; filename=conversation_report_{session_id}.pdf`

#### Response Content
* Binary PDF file stream.

