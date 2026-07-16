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
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from groq import Groq
client = Groq()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
WIDE_AGG_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_wide_aggregated.csv")
GEO_REAL_ONLY_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_geo_real_only.csv")

AUDIT_LOG_PATH = os.path.join(BASE_DIR, "outputs", "nl2sql_audit_log.jsonl")

MODEL = "llama-3.3-70b-versatile"

client = Groq()  # reads GROQ_API_KEY from env


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


# ======================================================================
# 1. Router — classifies intent so the generator gets a scoped hint
# ======================================================================
ROUTES = ["volume_trend", "hotspot_geo", "comparison", "network_repeat_offender", "lookup_detail", "other"]

def route_question(question: str) -> str:
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=20,
        temperature=0,
        messages=[
            {"role": "system", "content": (
                "Classify the crime-data question into exactly one label from this list, "
                f"reply with ONLY the label, nothing else: {ROUTES}\n"
                "volume_trend = counts/trends over time or totals\n"
                "hotspot_geo = location, hotspot, 'where', map, clustering\n"
                "comparison = comparing districts/units/years/crime types\n"
                "network_repeat_offender = repeat offenders, co-accused, criminal networks\n"
                "lookup_detail = a specific case/person/unit lookup\n"
                "other = anything else"
            )},
            {"role": "user", "content": question},
        ],
    )
    label = resp.choices[0].message.content.strip().lower()
    return label if label in ROUTES else "other"


# ======================================================================
# 2. Generator — schema + glossary + route hint -> SQL only
# ======================================================================
ROUTE_HINTS = {
    "hotspot_geo": "This is a location/hotspot question. Use `hotspot_summary` by default (has "
                   "RealCoordCaseCount and LowConfidence_ReviewFlag per cluster already computed — "
                   "always surface both). Only drop to raw `hotspot_clusters` for individual-case "
                   "lookups. Otherwise fall back to fact_crime_geo if the district isn't covered. "
                   "Never use raw CaseMaster.Latitude/Longitude directly.",
    "network_repeat_offender": "This is a repeat-offender/network question. Use Accused.IsRepeatOffender "
                                "and Accused.RepeatPoolID. Remember this data is synthetic. Use LIKE, not "
                                "exact match, for any general crime-type name (see glossary).",
    "volume_trend": "This is a count/trend question. If it asks about direction/forecast/'is X rising', "
                     "use `trend_forecast` first (has TrendDirection, NextMonthForecast, "
                     "LowConfidence_ReviewFlag already computed). For historical counts/totals only, "
                     "use fact_crime_agg or fact_crime_monthly.",
    "comparison": "This is a comparison question. Aggregate with GROUP BY on the compared dimension.",
}

def generate_sql(question: str, route: str, schema_context: str) -> str:
    hint = ROUTE_HINTS.get(route, "")
    system = f"""You write DuckDB SQL for a Karnataka Police FIR analytics database.
Only these tables/columns exist — never invent columns:

{schema_context}

{BUSINESS_GLOSSARY}

{hint}

Rules:
- Output ONLY the SQL query. No markdown fences, no explanation, no comments.
- SELECT statements only, read-only.
- Always add a reasonable LIMIT (e.g. 200) unless the question clearly wants an aggregate scalar.
"""
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=500,
        temperature=0,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
    )
    sql = resp.choices[0].message.content.strip()
    sql = re.sub(r"^```sql\s*|\s*```$", "", sql, flags=re.IGNORECASE | re.MULTILINE).strip()
    return sql


# ======================================================================
# 3. Validator — read-only, whitelist-only, before anything touches the DB
# ======================================================================
FUNCTION_FROM_PATTERN = re.compile(
    r"\b(EXTRACT|TRIM|SUBSTRING|OVERLAY|POSITION)\s*\([^)]*\bFROM\b[^)]*\)",
    re.IGNORECASE,
)


def validate_sql(sql: str) -> tuple[bool, str]:
    stripped = sql.strip().rstrip(";")
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

    referenced = set(re.findall(r"\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)", table_scan_text, re.IGNORECASE))
    unknown = {t for t in referenced if t not in WHITELISTED_TABLES}
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
    provenance_note = (
        "\nIMPORTANT: mention that this location answer is backed by RealCoordCaseCount "
        "real-coordinate cases (not all reported cases), if that column is present."
        if route == "hotspot_geo" else
        "\nIMPORTANT: mention that repeat-offender identities are synthetically generated "
        "for demo purposes, not real criminal records."
        if route == "network_repeat_offender" else ""
    )
    system = (
        "You explain SQL query results to a police analyst in plain English. "
        "Be concise (3-5 sentences), lead with the direct answer, cite specific numbers "
        "from the data below." + provenance_note
    )
    user = f"Question: {question}\n\nSQL used:\n{sql}\n\nResult ({len(df)} rows, showing up to 20):\n{preview}"
    resp = client.chat.completions.create(
        model=MODEL,
        max_tokens=400,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content.strip()


# ======================================================================
# Audit log
# ======================================================================
def log_audit(question, route, sql, row_count, error, elapsed_s, repaired=False):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question, "route": route, "sql": sql,
        "row_count": row_count, "error": error, "elapsed_s": round(elapsed_s, 2),
        "repaired": repaired,
    }
    with open(AUDIT_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


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
    resp = client.chat.completions.create(
        model=MODEL, max_tokens=500, temperature=0,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    sql = resp.choices[0].message.content.strip()
    return re.sub(r"^```sql\s*|\s*```$", "", sql, flags=re.IGNORECASE | re.MULTILINE).strip()


def answer_question(con, question: str, schema_context: str, max_repair_attempts: int = 1) -> dict:
    t0 = time.time()
    route = route_question(question)
    sql = generate_sql(question, route, schema_context)

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
            log_audit(question, route, sql, None, err, time.time() - t0, repaired=attempts > 0)
            return {"question": question, "route": route, "sql": sql, "error": err,
                    "answer": None, "repaired": attempts > 0}

        attempts += 1
        sql = repair_sql(question, sql, err, schema_context, route)

    answer = explain_result(question, sql, df, route)
    log_audit(question, route, sql, len(df), None, time.time() - t0, repaired=attempts > 0)
    return {"question": question, "route": route, "sql": sql, "error": None,
            "answer": answer, "result_df": df, "repaired": attempts > 0}


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
        result = answer_question(con, q, schema_context)
        repair_note = " [SELF-REPAIRED]" if result.get("repaired") else ""
        if result["error"]:
            print(f"  ERROR (after repair attempt): {result['error']}\n  SQL: {result['sql']}")
        else:
            print(f"  Route: {result['route']}{repair_note}")
            print(f"  SQL: {result['sql']}")
            print(f"  Answer: {result['answer']}")

    con.close()
