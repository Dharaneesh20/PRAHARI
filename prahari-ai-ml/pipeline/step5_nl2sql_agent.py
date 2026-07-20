"""
STEP 5 — NL2SQL Agent (core analytics layer)
================================================
Natural-language question -> validated read-only SQL -> DuckDB result ->
plain-English answer, grounded in the actual 21-table schema plus a
business glossary (CrimeHead hierarchy, Gravity, CaseCategory codes,
geo-provenance).

Pipeline: router -> generator -> validator -> executor -> explainer
Each stage is a plain function, not a LangGraph graph — for a single-
session hackathon demo a 5-function pipeline is easier to debug live
than a graph framework, and behaves identically. Swap in LangGraph
later if you need branching/retries beyond what's here.

Requires: pip install groq duckdb pandas
Requires: GROQ_API_KEY environment variable (this sandbox has neither the
key nor network access to api.groq.com — this script is meant to be run
on your own machine).
"""

import os
import re
import json
import time
import duckdb
import pandas as pd
import base64
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

try:
    from llm_client import complete_chat
except ImportError:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from llm_client import complete_chat

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
WIDE_AGG_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_wide_aggregated.csv")
GEO_REAL_ONLY_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_geo_real_only.csv")

AUDIT_LOG_PATH = os.path.join(BASE_DIR, "outputs", "nl2sql_audit_log.jsonl")

MODEL = "deepseek-ai/deepseek-v4-pro"


# ======================================================================
# Whitelisted tables the agent is allowed to query. Deliberately
# excludes nothing sensitive here since all PII is synthetic — but if
# you add real data later, drop it from this list, not just from the
# prompt (the validator enforces this list regardless of what the LLM
# generates).
# ======================================================================
WHITELISTED_TABLES = {
    "CaseMaster", "CaseMaster_Wide", "District", "Unit", "UnitType",
    "CrimeHead", "CrimeSubHead", "Act", "Section", "CrimeHeadActSection",
    "ActSectionAssociation", "GravityOffence", "CaseStatusMaster",
    "CaseCategory", "Court", "Employee", "Rank", "Designation",
    "CasteMaster", "ReligionMaster", "OccupationMaster",
    "ComplainantDetails", "Victim", "Accused", "ArrestSurrender",
    "ChargesheetDetails", "fact_crime_agg", "fact_crime_geo",
    "fact_crime_monthly", "trend_forecast", "trend_model_benchmark",
    "hotspot_model_benchmark", "hotspot_clusters", "hotspot_summary",
    "NetworkSummary",
}

FORBIDDEN_KEYWORDS = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|ATTACH|DETACH|COPY|PRAGMA|"
    r"CREATE|TRUNCATE|EXEC|EXECUTE|CALL|GRANT|REVOKE|VACUUM|EXPORT|IMPORT)\b",
    re.IGNORECASE,
)

# ======================================================================
# Business glossary — this is the single biggest accuracy lever per the
# stakeholder brief. Keep it short and concrete, not exhaustive.
# ======================================================================
BUSINESS_GLOSSARY = """
BUSINESS GLOSSARY (Karnataka Police FIR data):

- CrimeHead / CrimeSubHead: two-level crime taxonomy. CrimeHead.CrimeGroupName
  is the major category (e.g. "Crimes Against Property"), CrimeSubHead.CrimeHeadName
  is the SPECIFIC, often compound offence name — e.g. there is no plain "Theft" row;
  instead there are separate rows like "House Theft", "Servant Theft", "Temple Theft".
  CaseMaster links to BOTH via CrimeMajorHeadID -> CrimeHead and
  CrimeMinorHeadID -> CrimeSubHead.

- IMPORTANT — crime name matching: crime names are stored in INCONSISTENT
  casing across columns — CrimeHead.CrimeGroupName and trend_forecast's
  CrimeGroup column are ALL CAPS (e.g. 'THEFT', 'CYBER CRIME'), while
  CrimeSubHead.CrimeHeadName is Title Case compound phrases (e.g.
  'House Theft'). When a question names a general crime type (theft,
  robbery, assault, cheating, etc.), for ANY of these columns ALWAYS wrap
  BOTH sides in LOWER() — `LOWER(column) LIKE '%theft%'` — never an exact
  match and never assume the stored casing matches how the user typed it.
  An exact or case-sensitive match will silently return 0 rows even when
  matching cases genuinely exist. DuckDB's LIKE is case-sensitive by
  default; ILIKE is also acceptable if you prefer it.

- IMPORTANT — qualify column names in joins: CaseMasterID (and several
  other columns) appear on MANY tables. Any query joining two or more
  tables MUST qualify every column reference with its table name or alias
  (e.g. `ChargesheetDetails.CaseMasterID`, not bare `CaseMasterID`) or
  DuckDB will raise an "Ambiguous reference" error. This applies especially
  to COUNT(), SUM(), and other aggregates over a joined column.

- GravityOffence: only 2 real values in this data — "Heinous" and "Non Heinous" —
  sourced from the original FIR Type field. Not a severity score, a binary flag.

- CaseCategory: FIR / UDR / Zero FIR / PAR. This field is SYNTHETICALLY assigned
  (not present in the source CSV) — treat percentages from it as illustrative,
  not authoritative.

- Repeat offenders: Accused.IsRepeatOffender = true marks a synthetically-injected
  recidivist identity (Accused.RepeatPoolID identifies the same person across
  multiple CaseMasterIDs). This is a SYNTHETIC network for demo purposes, not a
  finding about real individuals. Always caveat any "repeat offender" answer as
  demonstrating the platform's tracking capability on synthetic data, not a real
  criminal record.

- Precomputed Network Summary: The `NetworkSummary` table stores precomputed criminal
  co-accused network metrics:
  * `RepeatPoolID`: The repeat offender's pool ID (links to Accused.RepeatPoolID).
  * `DistrictName`: Mapped district name (e.g. 'Bengaluru City').
  * `ConnectionCount`: Node degree (number of distinct co-accused connections).
  * `NetworkClusterID`: Louvain community partition ID (identifies the syndicate cluster).
  * `ClusterSize`: Total number of repeat offenders in that Louvain community.
  * `SyntheticNetworkFlag`: Boolean, always `TRUE` (every connection is synthetic).
  Guidance: For any repeat offender ranking, connection counts, or cluster sizes, query
  `NetworkSummary` directly instead of querying Accused. If names are needed, join `NetworkSummary`
  with `Accused` on `RepeatPoolID`.

- Location / geo-provenance: CaseMaster.Latitude/Longitude come from TWO sources.
  ~30% are real FIR coordinates; ~70% are synthetically imputed (jittered around
  each district's centroid) because the source CSV had them NULL. For ANY question
  about hotspots, geographic clustering, or "where crime happens":
    -> use the `fact_crime_geo` table (built from real coordinates only,
       has RealCoordCaseCount showing how many real-coordinate cases back the
       average lat/long for that group). NEVER use raw CaseMaster.Latitude/
       Longitude for hotspot-style questions without filtering imputed rows,
       and never claim a location finding is backed by more cases than
       RealCoordCaseCount says.
  For questions about VOLUME/COUNTS only (how many cases, trends over time,
  district comparisons by case count) -> use `fact_crime_agg`, which covers
  all cases regardless of coordinate provenance.

- District names are EXACT, not colloquial — many carry a required suffix
  that a casual question won't mention. Never guess or strip the suffix.
  The full, exact list of all 41 valid DistrictName values is:
  'Bagalkot', 'Ballari', 'Belagavi City', 'Belagavi Dist', 'Bengaluru City',
  'Bengaluru Dist', 'Bidar', 'CID', 'Chamarajanagar', 'Chickballapura',
  'Chikkamagaluru', 'Chitradurga', 'Coastal Security Police',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
  'Hubballi Dharwad City', 'ISD Bengaluru', 'K.G.F', 'Kalaburagi',
  'Kalaburagi City', 'Karnataka Railways', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mangaluru City', 'Mysuru City', 'Mysuru Dist', 'Raichur',
  'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
  'Vijayanagara', 'Vijayapur', 'Yadgir'.
  If a question says "Bengaluru" with no qualifier, match it to
  'Bengaluru City' (the metro commissionerate) unless context suggests
  otherwise. If a question says "Belagavi" or "Mysuru" alone, prefer the
  'City' variant unless "rural"/"district" is explicitly mentioned. When
  genuinely ambiguous, use `LOWER(DistrictName) LIKE '%<term>%'` instead
  of an exact match, rather than guessing a single literal and silently
  returning 0 rows.

- IMPORTANT — Unit vs District confusion: Unit.UnitName is a POLICE STATION
  name (e.g. 'Amengad PS', 'Bagalkot Rural PS'), NEVER a district name.
  NEVER filter WHERE UnitName = 'Bengaluru City' or similar — that column
  never holds district-level values. To filter by district, always join
  through District.DistrictName (Unit.DistrictID -> District.DistrictID),
  never assume the district name appears directly on Unit or CaseMaster.

- ChargesheetDetails.cstype is a single-letter CODE, not a word:
  'A' = Chargesheet, 'B' = False Case, 'C' = Undetected. Never filter
  WHERE cstype = 'Chargesheet' — that will always return 0 rows. Use
  cstype = 'A' for chargesheeted cases.

- Key joins: CaseMaster.PoliceStationID -> Unit.UnitID -> Unit.DistrictID ->
  District.DistrictID.

- IMPORTANT — Date & Year columns: In CaseMaster table, the date column is `CrimeRegisteredDate` (TIMESTAMP/DATE) and year column is `CrimeYear` (INTEGER). There is NO `FIRDate` or `FIRYear` column on CaseMaster. On fact_crime_agg, use `CrimeYear` (INTEGER).
  District.DistrictID. CaseMaster.CrimeMajorHeadID -> CrimeHead.CrimeHeadID.
  CaseMaster.PolicePersonID -> Employee.EmployeeID.

- Column naming warning: most tables use `DistrictName` (District table,
  CaseMaster_Wide, fact_crime_agg, fact_crime_geo). But `trend_forecast`,
  `trend_model_benchmark`, `hotspot_model_benchmark`, and `hotspot_clusters`
  use the shorter column name `District` instead. Always check the exact
  schema below for the table you're querying rather than assuming.

- Trend forecasting (for "is X rising/falling", "forecast next month",
  "trend in Y"): use `trend_forecast` directly — it already has
  NextMonthForecast, Last6MonthAvg, TrendDirection (rising/falling/stable),
  BestModel (which of Naive/SARIMA/HoltWinters/XGBoost was used, selected
  per-series by held-out MAE — a "smart" model only wins if it beats the
  naive seasonal baseline), and LowConfidence_ReviewFlag (true if the
  forecast swings >85% from recent average — likely a data anomaly, e.g. an
  enforcement drive or reporting gap, not a real trend; ALWAYS mention this
  flag if true rather than stating the forecast as fact). Only the top 15
  highest-volume District x CrimeGroup series are covered — if a question
  asks about a series not present, say so rather than guessing. Full
  monthly history (not just next-month forecasts) is in `fact_crime_monthly`.

- Hotspot clustering (for "where are the hotspots", "cluster locations in
  X"): use `hotspot_summary` — this is the answer table, ALREADY aggregated
  to one row per cluster with RealCoordCaseCount (how many real-coordinate
  cases support that cluster) and LowConfidence_ReviewFlag (true if
  RealCoordCaseCount < 30 — right at HDBSCAN's minimum cluster size, meaning
  barely enough points to be called a cluster at all). ALWAYS mention
  RealCoordCaseCount and the LowConfidence flag when answering a hotspot
  question — never state a hotspot's location without its supporting case
  count, since that's what tells a commander whether to act on it. Only use
  the raw point-level `hotspot_clusters` table if a question needs
  individual CaseMasterIDs, not for summary/ranking questions. Both tables
  are restricted to real (non-imputed) coordinates already, and cover only
  the top 5 highest-volume real-coordinate districts — if asked about a
  district not covered, say so.

- IMPORTANT — which model was used for hotspot detection: use
  `hotspot_model_benchmark.IsSelectedModel = true` to find the winning
  model for a district. NEVER determine the winner via
  `ORDER BY SilhouetteScore DESC LIMIT 1` — the real selection rule
  disqualifies any model whose NoiseRatio exceeds 70%, so the
  highest-silhouette row is sometimes NOT the actual winner (confirmed
  case: Belagavi Dist — DBSCAN has the highest raw silhouette there but
  was excluded for 84% noise; the real winner is HDBSCAN). This logic is
  precomputed in IsSelectedModel specifically because it can't be
  correctly reconstructed from silhouette alone in a query. The same
  model is also stored in hotspot_clusters.Model / hotspot_summary.Model
  as a cross-check.
"""


# ======================================================================
# Schema introspection (kept dynamic so it never drifts from the real DB)
# ======================================================================
def get_schema_context(con) -> str:
    lines = []
    for table in sorted(WHITELISTED_TABLES):
        try:
            cols = con.execute(f'DESCRIBE "{table}"').fetchdf()
        except duckdb.CatalogException:
            continue  # table not present in this DB (e.g. fact_crime_* not loaded yet)
        col_str = ", ".join(f"{r.column_name} {r.column_type}" for r in cols.itertuples())
        lines.append(f"{table}({col_str})")
    return "\n".join(lines)


def load_fact_tables(con):
    """Load the two dashboard aggregate CSVs as queryable DuckDB tables,
    per the two-aggregate split (fact_crime_agg = all cases, fact_crime_geo
    = real-coordinate cases only)."""
    con.execute(f"CREATE OR REPLACE TABLE fact_crime_agg AS SELECT * FROM read_csv_auto('{WIDE_AGG_CSV}')")
    con.execute(f"CREATE OR REPLACE TABLE fact_crime_geo AS SELECT * FROM read_csv_auto('{GEO_REAL_ONLY_CSV}')")
    
    # Check if AgentAuditLog needs schema upgrade
    try:
        cols = con.execute("DESCRIBE AgentAuditLog").fetchdf()["column_name"].tolist()
        if "role" not in cols:
            con.execute("DROP TABLE IF EXISTS AgentAuditLog;")
            con.execute("DROP SEQUENCE IF EXISTS audit_id_seq;")
        else:
            # Upgrade existing schema for voice logging columns if missing
            if "input_mode" not in cols:
                con.execute("ALTER TABLE AgentAuditLog ADD COLUMN input_mode VARCHAR DEFAULT 'text';")
            if "detected_language" not in cols:
                con.execute("ALTER TABLE AgentAuditLog ADD COLUMN detected_language VARCHAR DEFAULT 'en-IN';")
            if "session_id" not in cols:
                con.execute("ALTER TABLE AgentAuditLog ADD COLUMN session_id VARCHAR;")
    except Exception:
        pass

    # Initialize the AgentAuditLog table and sequence in DuckDB with RBAC and voice columns
    con.execute("CREATE SEQUENCE IF NOT EXISTS audit_id_seq;")
    con.execute("""
    CREATE TABLE IF NOT EXISTS AgentAuditLog (
        audit_id INTEGER DEFAULT nextval('audit_id_seq') PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        question VARCHAR,
        route_taken VARCHAR,
        generated_sql VARCHAR,
        model_used VARCHAR,
        row_count_returned INTEGER,
        final_answer VARCHAR,
        role VARCHAR,
        scope_id INTEGER,
        input_mode VARCHAR DEFAULT 'text',
        detected_language VARCHAR DEFAULT 'en-IN',
        session_id VARCHAR
    );
    """)


# ======================================================================
# 1. Router — classifies intent so the generator gets a scoped hint
# ======================================================================
ROUTES = ["volume_trend", "hotspot_geo", "comparison", "network_repeat_offender", "lookup_detail", "conversational", "other"]

def route_question(question: str) -> str:
    try:
        resp = complete_chat(
            messages=[
                {"role": "system", "content": (
                    "Classify the crime-data question into exactly one label from this list, "
                    f"reply with ONLY the label, nothing else: {ROUTES}\n"
                    "volume_trend = counts/trends over time or totals\n"
                    "hotspot_geo = location, hotspot, 'where', map, clustering\n"
                    "comparison = comparing districts/units/years/crime types\n"
                    "network_repeat_offender = repeat offenders, co-accused, criminal networks\n"
                    "lookup_detail = a specific case/person/unit lookup\n"
                    "conversational = general greeting, hi, hello, who are you, chitchat, thank you\n"
                    "other = anything else"
                )},
                {"role": "user", "content": question},
            ],
            max_tokens=20,
            temperature=0,
        )
        label = resp.choices[0].message.content.strip().lower()
        return label if label in ROUTES else "other"
    except Exception as exc:
        print(f"Route classification error: {exc}")
        return "other"


# ======================================================================
# 2. Generator — schema + glossary + route hint -> SQL only
# ======================================================================
ROUTE_HINTS = {
    "hotspot_geo": "This is a location/hotspot question. Use `hotspot_summary` by default (has "
                   "RealCoordCaseCount and LowConfidence_ReviewFlag per cluster already computed — "
                   "always surface both). Only drop to raw `hotspot_clusters` for individual-case "
                   "lookups. Otherwise fall back to fact_crime_geo if the district isn't covered. "
                   "Never use raw CaseMaster.Latitude/Longitude directly.",
    "network_repeat_offender": "This is a repeat-offender/network question. Use `NetworkSummary` for ranking "
                                "or connection counts (join with `Accused` on `RepeatPoolID` for names). "
                                "Always include `SyntheticNetworkFlag` in the select clause. "
                                "Remember this data is synthetic. Use LIKE, not exact match, for crime-type names.",
    "volume_trend": "This is a count/trend question. If it asks about direction/forecast/'is X rising', "
                     "use `trend_forecast` first (has TrendDirection, NextMonthForecast, "
                     "LowConfidence_ReviewFlag already computed). For historical counts/totals only, "
                     "use fact_crime_agg or fact_crime_monthly.",
    "comparison": "This is a comparison question. Aggregate with GROUP BY on the compared dimension.",
}

def get_recent_session_context(con, session_id: str | None, limit: int = 3) -> str:
    if not session_id or not con:
        return ""
    try:
        df_hist = con.execute(
            "SELECT question, generated_sql FROM AgentAuditLog WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
            [str(session_id), limit]
        ).fetchdf()
        if df_hist.empty:
            return ""
        items = []
        for _, r in df_hist.iloc[::-1].iterrows():
            q = r.get("question", "")
            s = r.get("generated_sql", "")
            if q and s:
                items.append(f"User Question: {q}\nSQL Used: {s}")
        return "\n".join(items)
    except Exception:
        return ""


def generate_sql(question: str, route: str, schema_context: str, clearance_level: int, conversation_context: str = "") -> str:
    hint = ROUTE_HINTS.get(route, "")
    rbac_rule = ""
    if clearance_level < 3:
        rbac_rule = "\n- RBAC RESTRICTION: User clearance < 3. DO NOT return raw PII (names, phones) of Victims, Complainants, or Accused. Redact or exclude them."
    
    context_str = ""
    if conversation_context:
        context_str = f"\nRECENT CONVERSATION HISTORY (Use this to resolve implicit references like 'there', 'in that location', 'that district', 'those cases'):\n{conversation_context}\n"

    system = f"""You write DuckDB SQL for a Karnataka Police FIR analytics database.
Only these tables/columns exist — never invent columns:

{schema_context}

{BUSINESS_GLOSSARY}

{hint}
{context_str}
Rules:{rbac_rule}
- Output ONLY the SQL query. No markdown fences, no explanation, no comments.
- SELECT statements only, read-only.
- AGGREGATION RULE: For questions asking about counts, volume, totals, or breakdowns (e.g., 'how many cases', 'any theft cases', 'breakdown of crimes'), ALWAYS write aggregated SQL using COUNT(*), SUM(CaseCount), and GROUP BY (e.g. GROUP BY CrimeGroupName or CrimeHeadName). Do NOT SELECT raw individual unaggregated rows for summary questions.
- Always add a reasonable LIMIT (e.g. 200) unless the question clearly wants an aggregate scalar.
"""
    resp = complete_chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
        max_tokens=1000,
        temperature=0,
    )
    raw_content = resp.choices[0].message.content.strip()
    # Remove <think>...</think> tags if present
    cleaned = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL | re.IGNORECASE).strip()
    # Remove markdown code block markers
    cleaned = re.sub(r"```(?:sql)?", "", cleaned, flags=re.IGNORECASE).replace("```", "").strip()

    # Extract query starting at first SELECT or WITH keyword
    match = re.search(r'\b(SELECT|WITH)\b.*', cleaned, flags=re.DOTALL | re.IGNORECASE)
    sql = match.group(0).strip() if match else cleaned

    # Auto-correct common column hallucinations (e.g. FIRDate -> CrimeRegisteredDate)
    sql = re.sub(r'\bFIRDate\b', 'CrimeRegisteredDate', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bFIRYear\b', 'CrimeYear', sql, flags=re.IGNORECASE)
    return sql


# ======================================================================
# 3. Validator — read-only, whitelist-only, before anything touches the DB
# ======================================================================
FUNCTION_FROM_PATTERN = re.compile(
    r"\b(EXTRACT|TRIM|SUBSTRING|OVERLAY|POSITION)\s*\([^)]*\bFROM\b[^)]*\)",
    re.IGNORECASE,
)


def validate_sql(sql: str) -> tuple[bool, str]:
    # Strip <think> tags and code fences if present
    cleaned = re.sub(r'<think>.*?</think>', '', sql, flags=re.DOTALL | re.IGNORECASE).strip()
    cleaned = re.sub(r"```(?:sql)?", "", cleaned, flags=re.IGNORECASE).replace("```", "").strip()

    match = re.search(r'\b(SELECT|WITH)\b.*', cleaned, flags=re.DOTALL | re.IGNORECASE)
    if match:
        stripped = match.group(0).strip().rstrip(";")
    else:
        stripped = cleaned.strip().rstrip(";")

    if not re.match(r"^\s*(SELECT|WITH)\b", stripped, re.IGNORECASE):
        return False, "Only SELECT/WITH queries are allowed."
    if FORBIDDEN_KEYWORDS.search(stripped):
        return False, "Query contains a forbidden keyword (DDL/DML/admin statement)."
    if ";" in stripped:
        return False, "Multiple statements are not allowed."

    # SQL functions like EXTRACT(YEAR FROM col), TRIM(x FROM y), and
    # SUBSTRING(x FROM y) use FROM as a keyword, not a table introducer.
    # Strip those spans before scanning for table references, or the
    # regex below misreads "cm" in "EXTRACT(YEAR FROM cm.Col)" as a
    # non-whitelisted table and rejects a perfectly valid query.
    table_scan_text = FUNCTION_FROM_PATTERN.sub(" ", stripped)

    # Extract CTE defined aliases so CTE names like WITH filtered AS (...), total AS (...) are recognized
    cte_names = set(re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\(", stripped, re.IGNORECASE))

    referenced = set(re.findall(r"\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)", table_scan_text, re.IGNORECASE))
    unknown = {t for t in referenced if t not in WHITELISTED_TABLES and t not in cte_names}
    if unknown:
        return False, f"Query references non-whitelisted table(s): {unknown}"

    return True, "ok"


# ======================================================================
# 4. Executor
# ======================================================================
def execute_sql(con, sql: str) -> tuple[pd.DataFrame | None, str | None]:
    try:
        df = con.execute(sql.rstrip(";")).fetchdf()
        return df, None
    except Exception as e:
        return None, str(e)


# ======================================================================
# 5. Explainer
# ======================================================================
def explain_result(question: str, sql: str, df: pd.DataFrame, route: str) -> str:
    preview = df.head(20).to_csv(index=False)
    
    is_synthetic = False
    if df is not None and not df.empty and "SyntheticNetworkFlag" in df.columns:
        is_synthetic = bool(df["SyntheticNetworkFlag"].iloc[0])
        
    provenance_note = ""
    if route == "hotspot_geo":
        provenance_note = (
            "\nIMPORTANT: mention that this location answer is backed by RealCoordCaseCount "
            "real-coordinate cases (not all reported cases), if that column is present."
        )
    elif is_synthetic or route == "network_repeat_offender":
        provenance_note = (
            "\nIMPORTANT: you MUST include this exact disclosure notice at the end of your response: "
            "\"Disclosure: This criminal network profile and co-accused connection map is synthetically "
            "generated for demonstration purposes and does not represent real criminal records.\""
        )
    system = (
        "You are Prahari AI, a senior intelligence analyst copilot for Karnataka State Police.\n"
        "Provide a clear, balanced, and natural response (middle ground: informative yet concise).\n\n"
        "RESPONSE FORMAT & GUIDELINES:\n"
        "1. Natural Summary: Start with 1-2 clear, conversational sentences directly answering the question with key numbers in bold.\n"
        "2. Tables for Multi-row Data ONLY: Use clean Markdown tables (| Column | ... |) ONLY when presenting multi-row breakdowns, category distributions, or lists. For single metrics or counts, use natural text or bullet points instead of forcing a 1-row table.\n"
        "3. Key Insights: Include 2-3 brief bullet points highlighting notable patterns, top categories, or context from the data.\n"
        "4. Tone: Be helpful, professional, and balanced. Avoid cold 1-line database dumps and avoid long multi-paragraph essays." + provenance_note
    )
    user = f"Question: {question}\n\nSQL used:\n{sql}\n\nResult ({len(df)} rows, showing up to 30):\n{preview}"
    resp = complete_chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=768,
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()


def explain_result_stream(question: str, sql: str, df: pd.DataFrame, route: str):
    preview = df.head(30).to_csv(index=False) if df is not None and not df.empty else "No data returned."
    
    is_synthetic = False
    if df is not None and not df.empty and "SyntheticNetworkFlag" in df.columns:
        is_synthetic = bool(df["SyntheticNetworkFlag"].iloc[0])
        
    provenance_note = ""
    if route == "hotspot_geo":
        provenance_note = (
            "\nIMPORTANT: mention that this location answer is backed by RealCoordCaseCount "
            "real-coordinate cases (not all reported cases), if that column is present."
        )
    elif is_synthetic or route == "network_repeat_offender":
        provenance_note = (
            "\nIMPORTANT: you MUST include this exact disclosure notice at the end of your response: "
            "\"Disclosure: This criminal network profile and co-accused connection map is synthetically "
            "generated for demonstration purposes and does not represent real criminal records.\""
        )
    system = (
        "You are Prahari AI, a senior intelligence analyst copilot for Karnataka State Police.\n"
        "Provide a clear, balanced, and natural response (middle ground: informative yet concise).\n\n"
        "RESPONSE FORMAT & GUIDELINES:\n"
        "1. Natural Summary: Start with 1-2 clear, conversational sentences directly answering the question with key numbers in bold.\n"
        "2. Tables for Multi-row Data ONLY: Use clean Markdown tables (| Column | ... |) ONLY when presenting multi-row breakdowns, category distributions, or lists. For single metrics or counts, use natural text or bullet points instead of forcing a 1-row table.\n"
        "3. Key Insights: Include 2-3 brief bullet points highlighting notable patterns, top categories, or context from the data.\n"
        "4. Tone: Be helpful, professional, and balanced. Avoid cold 1-line database dumps and avoid long multi-paragraph essays." + provenance_note
    )
    user = f"Question: {question}\n\nSQL used:\n{sql}\n\nResult ({len(df) if df is not None else 0} rows, showing up to 30):\n{preview}"
    
    try:
        stream_resp = complete_chat(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=768,
            temperature=0.2,
            stream=True
        )
        
        in_think_tag = False
        for chunk in stream_resp:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                
                # Check for reasoning_content / reasoning attribute from reasoning models
                reasoning = getattr(delta, "reasoning_content", None) or getattr(delta, "reasoning", None)
                if reasoning:
                    yield {"type": "thinking", "content": reasoning}
                
                content = getattr(delta, "content", None)
                if content:
                    if "<think>" in content:
                        in_think_tag = True
                        content = content.replace("<think>", "")
                    if "</think>" in content:
                        in_think_tag = False
                        parts = content.split("</think>")
                        if parts[0]:
                            yield {"type": "thinking", "content": parts[0]}
                        if len(parts) > 1 and parts[1]:
                            yield {"type": "token", "content": parts[1]}
                        continue
                    
                    if content:
                        if in_think_tag:
                            yield {"type": "thinking", "content": content}
                        else:
                            yield {"type": "token", "content": content}
    except Exception as stream_err:
        logger.warning("LLM stream interrupted or timed out: %s", stream_err)


# ======================================================================
# Audit log
# ======================================================================
def log_audit(con, question, route, sql, row_count, error, elapsed_s, repaired=False, model_used=None, final_answer=None, role=None, scope_id=None, input_mode="text", detected_language="en-IN", session_id=None):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question, "route": route, "sql": sql,
        "row_count": row_count, "error": error, "elapsed_s": round(elapsed_s, 2),
        "repaired": repaired,
        "role": role,
        "scope_id": scope_id,
        "input_mode": input_mode,
        "detected_language": detected_language,
        "session_id": session_id
    }
    with open(AUDIT_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
        
    # DuckDB audit table logging
    insert_sql = """
    INSERT INTO AgentAuditLog (timestamp, question, route_taken, generated_sql, model_used, row_count_returned, final_answer, role, scope_id, input_mode, detected_language, session_id)
    VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING audit_id
    """
    audit_id = None
    try:
        res_db = con.execute(insert_sql, [question, route, sql, model_used, row_count, final_answer, role, scope_id, input_mode, detected_language, session_id]).fetchone()
        if res_db:
            audit_id = res_db[0]
    except Exception as e:
        # Gracefully handle missing audit log table by initializing and retrying once
        try:
            load_fact_tables(con)
            res_db = con.execute(insert_sql, [question, route, sql, model_used, row_count, final_answer, role, scope_id, input_mode, detected_language, session_id]).fetchone()
            if res_db:
                audit_id = res_db[0]
        except Exception as inner_e:
            print(f"Failed to insert audit log in DuckDB: {inner_e}")
    return audit_id


# ======================================================================
# Orchestration
# ======================================================================
def repair_sql(question: str, broken_sql: str, error: str, schema_context: str, route: str) -> str:
    """
    One-shot self-repair: feed the exact failure back to the model and ask
    for a corrected query. Added after the same "Ambiguous reference to
    CaseMasterID" error recurred TWICE despite an explicit glossary
    instruction — proof that prompt-only fixes don't reliably hold for
    this model on every generation, so the pipeline needs to recover from
    the mistake rather than just try to prevent it harder.
    """
    hint = ROUTE_HINTS.get(route, "")
    system = f"""You write DuckDB SQL for a Karnataka Police FIR analytics database.
Only these tables/columns exist — never invent columns:

{schema_context}

{BUSINESS_GLOSSARY}

{hint}

Your previous SQL failed. Fix ONLY the specific problem in the error message —
don't rewrite the query from scratch, don't change its intent. A common cause:
an unqualified column name (e.g. bare `CaseMasterID`) that exists on multiple
joined tables — qualify it with the correct table name/alias.

Output ONLY the corrected SQL query. No markdown fences, no explanation.
"""
    user = f"Question: {question}\n\nPrevious SQL:\n{broken_sql}\n\nError:\n{error}\n\nCorrected SQL:"
    resp = complete_chat(
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=1000,
        temperature=0,
    )
    sql = resp.choices[0].message.content.strip()
    return re.sub(r"^```sql\s*|\s*```$", "", sql, flags=re.IGNORECASE | re.MULTILINE).strip()


def answer_question(con, question: str, schema_context: str, role: str, scope_id: int | None = None, clearance_level: int = 1, max_repair_attempts: int = 1, session_id: str | None = None) -> dict:
    t0 = time.time()
    
    # Validation check: reject if SHO/SP but scope_id is missing
    if role in ["SHO", "SP"] and scope_id is None:
        err_msg = f"scope_id is required for role: {role}"
        audit_id = log_audit(con, question, "other", sql="", row_count=0, error=err_msg, 
                  elapsed_s=0, role=role, scope_id=scope_id, session_id=session_id)
        return {"question": question, "route": "other", "sql": "", "error": err_msg,
                "answer": None, "result_df": None, "repaired": False, "audit_id": audit_id}
                
    route = route_question(question)
    
    if route == "conversational":
        answer = "Hello! I am PRAHARI AI. I am here to assist you with analyzing crime data, tracking hotspots, identifying repeat offenders, and running predictive models. How can I help you today?"
        audit_id = log_audit(con, question, route, sql="", row_count=0, error=None, 
                  elapsed_s=time.time() - t0, repaired=False, model_used="ConversationalRule", 
                  final_answer=answer, role=role, scope_id=scope_id, session_id=session_id)
        return {"question": question, "route": route, "sql": "", "error": None,
                "answer": answer, "result_df": None, "repaired": False, "audit_id": audit_id}
                
    # Check if network_repeat_offender has optimized helper shortcuts
    if route == "network_repeat_offender":
        # Look up real districts dynamically
        try:
            real_districts = con.execute("SELECT DISTINCT DistrictName FROM District").fetchdf()["DistrictName"].tolist()
        except Exception:
            real_districts = ["Bengaluru City", "Mysuru City", "Belagavi Dist", "Tumakuru", "Vijayapur"]
            
        # Parse for specific associates lookup: e.g. "known associates of ID" or "network around ID"
        id_match = re.search(r'\b(?:associates of|network around|offender)\s*#?(\d+)\b', question, re.IGNORECASE)
        if not id_match:
            # Check if there is any 4 to 6 digit integer in the prompt (usually the repeat pool ID)
            id_match = re.search(r'\b(\d{4,6})\b', question)
            
        if id_match:
            person_id = int(id_match.group(1))
            try:
                import sys
                pipeline_path = os.path.dirname(os.path.abspath(__file__))
                if pipeline_path not in sys.path:
                    sys.path.insert(0, pipeline_path)
                import graph_agent
                res = graph_agent.find_associates(con, person_id, role, scope_id)
                answer = res["message"]
                audit_id = log_audit(con, question, route, sql="", row_count=len(res["data"]), error=None, 
                          elapsed_s=time.time() - t0, repaired=False, model_used="graph_agent/NetworkX", 
                          final_answer=answer, role=role, scope_id=scope_id, session_id=session_id)
                return {"question": question, "route": route, "sql": "", "error": None,
                        "answer": answer, "result_df": pd.DataFrame(res["data"]) if res["data"] else None, "repaired": False, "audit_id": audit_id}
            except Exception as graph_err:
                print(f"Graph agent find_associates failed: {graph_err}. Falling back to LLM SQL.")
                
        # Parse for degree ranking/most connected lookup: e.g. "most connections" or "most connected"
        if any(k in question.lower() for k in ["most connected", "most connections", "most criminal connections"]):
            district_name = None
            for dist in real_districts:
                if dist.lower() in question.lower():
                    district_name = dist
                    break
            if not district_name:
                district_name = "Bengaluru City"  # Default fallback
                
            try:
                import sys
                pipeline_path = os.path.dirname(os.path.abspath(__file__))
                if pipeline_path not in sys.path:
                    sys.path.insert(0, pipeline_path)
                import graph_agent
                res = graph_agent.find_most_connected(con, district_name, 5, role, scope_id)
                answer = res["message"]
                audit_id = log_audit(con, question, route, sql="", row_count=len(res["data"]), error=None, 
                          elapsed_s=time.time() - t0, repaired=False, model_used="graph_agent/NetworkSummary", 
                          final_answer=answer, role=role, scope_id=scope_id, session_id=session_id)
                return {"question": question, "route": route, "sql": "", "error": None,
                        "answer": answer, "result_df": pd.DataFrame(res["data"]) if res["data"] else None, "repaired": False, "audit_id": audit_id}
            except Exception as graph_err:
                print(f"Graph agent find_most_connected failed: {graph_err}. Falling back to LLM SQL.")

    conv_ctx = get_recent_session_context(con, session_id)
    sql = generate_sql(question, route, schema_context, clearance_level, conversation_context=conv_ctx)
    
    # Apply RBAC Scope Filter on the generated SQL query
    from rbac import apply_scope_filter
    sql = apply_scope_filter(con, sql, role, scope_id)

    attempts = 0
    while True:
        ok, reason = validate_sql(sql)
        err = None if ok else reason
        df = None
        if ok:
            df, err = execute_sql(con, sql)

        if err is None:
            break  # success
        if attempts >= max_repair_attempts:
            audit_id = log_audit(con, question, route, sql, None, err, time.time() - t0, repaired=attempts > 0, 
                      model_used=MODEL, final_answer=None, role=role, scope_id=scope_id, session_id=session_id)
            return {"question": question, "route": route, "sql": sql, "error": err,
                    "answer": None, "repaired": attempts > 0, "audit_id": audit_id}

        attempts += 1
        sql = repair_sql(question, sql, err, schema_context, route)
        sql = apply_scope_filter(con, sql, role, scope_id)

    # Automatically extract model used from DuckDB result if applicable
    model_used = MODEL
    if df is not None and not df.empty:
        if "BestModel" in df.columns:
            model_used = str(df["BestModel"].iloc[0])
        elif "Model" in df.columns:
            model_used = str(df["Model"].iloc[0])

    answer = explain_result(question, sql, df, route)
    audit_id = log_audit(con, question, route, sql, len(df), None, time.time() - t0, repaired=attempts > 0, 
              model_used=model_used, final_answer=answer, role=role, scope_id=scope_id, session_id=session_id)
    return {"question": question, "route": route, "sql": sql, "error": None,
            "answer": answer, "result_df": df, "repaired": attempts > 0, "audit_id": audit_id}


def answer_question_stream(
    con,
    question: str,
    role: str = "SCRB_ADMIN",
    scope_id: int | None = None,
    max_repair_attempts: int = 2,
    clearance_level: int = 3,
    session_id: str | None = None,
):
    """
    Generator that streams execution metadata followed by real-time LLM answer tokens.
    Yields dict objects:
      - {"type": "meta", "route": ..., "sql": ..., "rows": ...}
      - {"type": "token", "content": "..."}
      - {"type": "error", "error": "..."}
    """
    t0 = time.time()
    schema_context = get_schema_context(con)
    route = route_question(question)

    if route == "conversational":
        system = "You are Prahari AI, an intelligence copilot for Karnataka State Police. Answer general chitchat warmly, concisely, and professionally."
        resp_stream = complete_chat(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": question}],
            max_tokens=256,
            temperature=0.7,
            stream=True,
        )
        yield {"type": "meta", "route": route, "sql": "", "rows": 0}
        full_text = []
        for chunk in resp_stream:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if delta and getattr(delta, "content", None):
                    token = delta.content
                    full_text.append(token)
                    yield {"type": "token", "content": token}
        ans_str = "".join(full_text)
        log_audit(con, question, route, sql="", row_count=0, error=None, elapsed_s=time.time() - t0, repaired=False, model_used=MODEL, final_answer=ans_str, role=role, scope_id=scope_id, session_id=session_id)
        return

    conv_ctx = get_recent_session_context(con, session_id)
    try:
        sql = generate_sql(question, route, schema_context, clearance_level, conversation_context=conv_ctx)
    except Exception as exc:
        logger.error("LLM generation failed: %s", exc)
        yield {"type": "meta", "route": route, "sql": "", "rows": 0}
        yield {"type": "token", "content": "⚠️ All AI reasoning model providers are currently experiencing high network latency or temporary timeouts. Please re-submit your question in a moment."}
        log_audit(con, question, route, sql="", row_count=0, error=str(exc), elapsed_s=time.time() - t0, repaired=False, model_used=MODEL, final_answer="LLM Timeout", role=role, scope_id=scope_id, session_id=session_id)
        return

    from rbac import apply_scope_filter
    sql = apply_scope_filter(con, sql, role, scope_id)

    attempts = 0
    df = None
    err = None
    while True:
        ok, reason = validate_sql(sql)
        err = None if ok else reason
        if ok:
            df, err = execute_sql(con, sql)

        if err is None:
            break
        if attempts >= max_repair_attempts:
            yield {"type": "error", "error": f"SQL Error: {err}", "route": route, "sql": sql}
            log_audit(con, question, route, sql, None, err, time.time() - t0, repaired=attempts > 0, model_used=MODEL, final_answer=None, role=role, scope_id=scope_id, session_id=session_id)
            return

        attempts += 1
        sql = repair_sql(question, sql, err, schema_context, route)
        sql = apply_scope_filter(con, sql, role, scope_id)

    row_cnt = len(df) if df is not None else 0
    yield {"type": "meta", "route": route, "sql": sql, "rows": row_cnt}

    full_tokens = []
    for item in explain_result_stream(question, sql, df, route):
        if isinstance(item, dict):
            if item.get("type") == "token":
                full_tokens.append(item.get("content", ""))
            yield item
        else:
            full_tokens.append(str(item))
            yield {"type": "token", "content": str(item)}

    ans_str = "".join(full_tokens)
    log_audit(con, question, route, sql, row_cnt, None, time.time() - t0, repaired=attempts > 0, model_used=MODEL, final_answer=ans_str, role=role, scope_id=scope_id, session_id=session_id)



def answer_question_voice(con, audio_bytes: bytes, role: str, scope_id: int | None = None, output_language: str = "kn-IN", session_id: str | None = None) -> dict:
    """
     Kannada Voice Input/Output Orchestrator Wrapper.
    1. Transcribes voice input using Sarvam Speech-to-Text (auto-detects language).
    2. Translates to English if transcription language is not English.
    3. Passes to the core answer_question() pipeline unchanged.
    4. Translates the English answer to the target language and synthesizes speech via Sarvam TTS.
    5. Returns text answers, base64-encoded audio bytes, and details of the operation.
    """
    t0 = time.time()
    try:
        import voice_service
    except ImportError:
        import sys
        pipeline_path = os.path.dirname(os.path.abspath(__file__))
        if pipeline_path not in sys.path:
            sys.path.insert(0, pipeline_path)
        import voice_service

    # 1. Transcribe the audio input (auto-detect language)
    transcript, detected_lang = voice_service.transcribe(audio_bytes, language_hint=None)
    
    if not transcript:
        err_msg = "Voice input could not be transcribed or was empty."
        log_audit(con, "voice_input_empty", "other", sql="", row_count=0, error=err_msg, 
                  elapsed_s=time.time() - t0, role=role, scope_id=scope_id, 
                  input_mode="voice", detected_language=detected_lang, session_id=session_id)
        return {
            "transcript": "",
            "detected_language": detected_lang,
            "answer_text": "Could not understand audio input.",
            "audio_response": "",
            "audit_id": None,
            "error": err_msg
        }

    # 2. Translate to English if the input language is not English
    english_query = transcript
    if detected_lang and not detected_lang.lower().startswith("en"):
        english_query = voice_service.translate_to_english(transcript, source_lang=detected_lang)

    # 3. Call the existing answer_question() pipeline unchanged
    schema_ctx = get_schema_context(con)
    res_agent = answer_question(con, english_query, schema_ctx, role, scope_id, session_id=session_id)
    
    answer_en = res_agent.get("answer") or res_agent.get("error") or "No answer generated."
    audit_id = res_agent.get("audit_id")

    # 4. Synthesize voice response in target language (speak)
    audio_response_bytes = b""
    try:
        audio_response_bytes = voice_service.translate_and_speak(answer_en, target_lang=output_language)
    except Exception as tts_err:
        print(f"Failed to generate voice response audio: {tts_err}")

    # Encode audio to base64
    audio_response_b64 = base64.b64encode(audio_response_bytes).decode("utf-8") if audio_response_bytes else ""

    # 5. Update the specific row by audit_id (no MAX(audit_id) or most-recent-row updates!)
    if audit_id is not None:
        try:
            con.execute("""
            UPDATE AgentAuditLog 
            SET input_mode = 'voice', detected_language = ? 
            WHERE audit_id = ?
            """, [detected_lang, audit_id])
        except Exception as audit_err:
            print(f"Failed to update audit log by explicit audit_id {audit_id}: {audit_err}")

    return {
        "transcript": transcript,
        "detected_language": detected_lang,
        "answer_text": answer_en,
        "audio_response": audio_response_b64,
        "audit_id": audit_id,
        "error": res_agent.get("error")
    }


if __name__ == "__main__":
    con = duckdb.connect(DB_PATH)
    load_fact_tables(con)
    schema_context = get_schema_context(con)

    test_questions = [
        "Which district had the most FIRs in 2023?",
        "Where are the crime hotspots in Bengaluru City?",
        "Show me repeat offenders linked to theft cases in Mysuru City.",
        "Compare chargesheet rates between Bengaluru City and Mysuru City for 2022.",
        "Is theft rising or falling in Bengaluru City, and what's the forecast for next month?",
        "Which model was used to detect hotspots in Belagavi district, and why?",
    ]
    for q in test_questions:
        print(f"\nQ: {q}")
        result = answer_question(con, q, schema_context, role="SCRB_ADMIN")
        repair_note = " [SELF-REPAIRED]" if result.get("repaired") else ""
        if result["error"]:
            print(f"  ERROR (after repair attempt): {result['error']}\n  SQL: {result['sql']}")
        else:
            print(f"  Route: {result['route']}{repair_note}")
            print(f"  SQL: {result['sql']}")
            print(f"  Answer: {result['answer']}")

    con.close()
