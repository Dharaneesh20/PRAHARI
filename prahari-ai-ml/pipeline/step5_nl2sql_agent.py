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

Requires: pip install anthropic duckdb pandas
Requires: ANTHROPIC_API_KEY environment variable (this sandbox has
neither the key nor internet access to test live calls — this script
is meant to be run on your own machine).
"""

import os
import re
import json
import time
import urllib.request
import urllib.error
import duckdb
import pandas as pd
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
GEO_REAL_ONLY_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_geo_real_only.csv")
WIDE_AGG_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_wide_aggregated.csv")
AUDIT_LOG_PATH = os.path.join(BASE_DIR, "outputs", "nl2sql_audit_log.jsonl")

# Standard library .env loader
def load_dotenv(filepath=".env"):
    possible_paths = [
        filepath,
        os.path.join(BASE_DIR, filepath),
        os.path.join(os.path.dirname(BASE_DIR), filepath),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
            print(f"Loaded environment variables from {path}")
            return True
    return False

load_dotenv()

MODEL = "llama-3.3-70b-versatile"

def query_groq(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set in environment or .env file.")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.0,
        "max_tokens": max_tokens
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"Groq API HTTP Error {e.code}: {err_msg}") from e
    except Exception as e:
        raise RuntimeError(f"Failed to query Groq API: {str(e)}") from e


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
  is the major category (e.g. "CRIMES AGAINST PROPERTY"), and CrimeSubHead.CrimeHeadName
  contains specific, detailed offence compound names (e.g. "House Theft", "Servant Theft",
  "House Breaking And Theft", "Temple Theft", "On Highways", "Chain Snatching").
  * Crime Category Matching Rules:
    1. Major categories (e.g., Robbery, Assault, Burglary, Cheating) are stored in CrimeHead.CrimeGroupName
       in UPPERCASE. Note that the subheads (CrimeSubHead.CrimeHeadName) under these major categories do NOT contain
       the words "robbery" or "assault" (they are named like "On Highways", "In Trains", "On Public Servant", "Chain Snatching").
       For general questions about these crime types, filter on `LOWER(ch.CrimeGroupName) LIKE '%<term>%'` or the `ILIKE` operator
       (e.g., `ch.CrimeGroupName = 'ROBBERY'` or `ch.CrimeGroupName ILIKE '%assault%'`).
    2. Minor categories/specific offences (e.g., Theft, Burglary, Cheating) are stored in CrimeSubHead.CrimeHeadName in Title Case.
       Because these are compound names, you should NEVER use an exact match (e.g., `LOWER(csh.CrimeHeadName) = 'theft'` will return 0 rows).
       Always perform case-insensitive partial matching using `LOWER(csh.CrimeHeadName) LIKE '%theft%'` or the `ILIKE` operator
       (e.g., `csh.CrimeHeadName ILIKE '%theft%'`).

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

- Table Aggregation Rule: In fact_crime_agg and fact_crime_geo, the rows represent
  pre-aggregated groups. Never use COUNT(*) to find the number of cases. Always
  use SUM(CaseCount) (for fact_crime_agg) or SUM(RealCoordCaseCount) (for fact_crime_geo)
  to get the total case count.

- District naming: Districts in Karnataka are stored with their full names. Specifically:
  * "Bengaluru" is stored as "Bengaluru City" (urban) or "Bengaluru Dist" (rural).
  * "Mysuru" is stored as "Mysuru City" (urban) or "Mysuru Dist" (rural).
  When filtering by district, ensure you use the exact names (e.g., 'Bengaluru City' and 'Mysuru City'). Never use 'Bengaluru' or 'Mysuru' directly.

- Chargesheet rate: Can be calculated on fact_crime_agg as SUM(TotalChargesheeted) * 1.0 / SUM(CaseCount) (or on fact_crime_geo as SUM(TotalChargesheeted) * 1.0 / SUM(RealCoordCaseCount)). This is much faster and simpler than joining CaseMaster with ChargesheetDetails.

- Key joins: CaseMaster.PoliceStationID -> Unit.UnitID -> Unit.DistrictID ->
  District.DistrictID. CaseMaster.CrimeMajorHeadID -> CrimeHead.CrimeHeadID.
  CaseMaster.CrimeMinorHeadID -> CrimeSubHead.CrimeSubHeadID.
  CaseMaster.PolicePersonID -> Employee.EmployeeID.
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
    system_prompt = (
        "Classify the crime-data question into exactly one label from this list, "
        f"reply with ONLY the label: {ROUTES}\n"
        "volume_trend = counts/trends over time or totals\n"
        "hotspot_geo = location, hotspot, 'where', map, clustering\n"
        "comparison = comparing districts/units/years/crime types\n"
        "network_repeat_offender = repeat offenders, co-accused, criminal networks\n"
        "lookup_detail = a specific case/person/unit lookup\n"
        "other = anything else"
    )
    try:
        label = query_groq(system_prompt, question, max_tokens=20)
        label = label.strip().strip("'\"").lower()
        # Find the route label inside the LLM response if it printed extra words
        for r in ROUTES:
            if r in label:
                return r
    except Exception as e:
        print(f"Routing error: {e}")
    return "other"


# ======================================================================
# 2. Generator — schema + glossary + route hint -> SQL only
# ======================================================================
ROUTE_HINTS = {
    "hotspot_geo": "This is a location/hotspot question. You MUST use fact_crime_geo, "
                   "never raw CaseMaster.Latitude/Longitude directly, and surface RealCoordCaseCount.",
    "network_repeat_offender": "This is a repeat-offender/network question. Use Accused.IsRepeatOffender "
                                "and Accused.RepeatPoolID. Remember this data is synthetic.",
    "volume_trend": "This is a count/trend question. Prefer fact_crime_agg unless case-level detail is needed.",
    "comparison": "This is a comparison question. Prefer fact_crime_agg unless case-level detail is needed. Aggregate with GROUP BY on the compared dimension.",
}

def generate_sql(question: str, route: str, schema_context: str) -> str:
    hint = ROUTE_HINTS.get(route, "")
    system_prompt = f"""You write DuckDB SQL for a Karnataka Police FIR analytics database.
Only these tables/columns exist — never invent columns:

{schema_context}

{BUSINESS_GLOSSARY}

{hint}

Rules:
- Output ONLY the SQL query. No markdown fences, no explanation, no comments.
- SELECT statements only, read-only.
- Always add a reasonable LIMIT (e.g. 200) unless the question clearly wants an aggregate scalar.
"""
    sql = query_groq(system_prompt, question, max_tokens=500)
    sql = re.sub(r"^```sql\s*|\s*```$", "", sql, flags=re.IGNORECASE | re.MULTILINE).strip()
    return sql


# ======================================================================
# 3. Validator — read-only, whitelist-only, before anything touches the DB
# ======================================================================
def validate_sql(sql: str) -> tuple[bool, str]:
    stripped = sql.strip().rstrip(";")
    if not re.match(r"^\s*(SELECT|WITH)\b", stripped, re.IGNORECASE):
        return False, "Only SELECT/WITH queries are allowed."
    if FORBIDDEN_KEYWORDS.search(stripped):
        return False, "Query contains a forbidden keyword (DDL/DML/admin statement)."
    if ";" in stripped:
        return False, "Multiple statements are not allowed."

    # Remove function-level FROM clauses (e.g. EXTRACT(field FROM source)) so they aren't parsed as tables
    clean_sql = re.sub(r"\bEXTRACT\s*\(\s*[A-Za-z_]+\s+FROM\b", "", stripped, flags=re.IGNORECASE)
    clean_sql = re.sub(r"\b(?:YEAR|MONTH|DAY)\s+FROM\b", "", clean_sql, flags=re.IGNORECASE)
    
    referenced = set(re.findall(r"\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)", clean_sql, re.IGNORECASE))
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
    system_prompt = (
        "You explain SQL query results to a police analyst in plain English. "
        "Be concise (3-5 sentences), lead with the direct answer, cite specific numbers "
        "from the data below." + provenance_note
    )
    user_prompt = f"Question: {question}\n\nSQL used:\n{sql}\n\nResult ({len(df)} rows, showing up to 20):\n{preview}"
    answer = query_groq(system_prompt, user_prompt, max_tokens=400)
    return answer


# ======================================================================
# Audit log
# ======================================================================
def log_audit(question, route, sql, row_count, error, elapsed_s):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": question, "route": route, "sql": sql,
        "row_count": row_count, "error": error, "elapsed_s": round(elapsed_s, 2),
    }
    with open(AUDIT_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


# ======================================================================
# Orchestration
# ======================================================================
def answer_question(con, question: str, schema_context: str) -> dict:
    t0 = time.time()
    route = route_question(question)
    sql = generate_sql(question, route, schema_context)
    ok, reason = validate_sql(sql)

    if not ok:
        log_audit(question, route, sql, None, reason, time.time() - t0)
        return {"question": question, "route": route, "sql": sql, "error": reason, "answer": None}

    df, err = execute_sql(con, sql)
    if err:
        log_audit(question, route, sql, None, err, time.time() - t0)
        return {"question": question, "route": route, "sql": sql, "error": err, "answer": None}

    answer = explain_result(question, sql, df, route)
    log_audit(question, route, sql, len(df), None, time.time() - t0)
    return {"question": question, "route": route, "sql": sql, "error": None,
            "answer": answer, "result_df": df}


if __name__ == "__main__":
    con = duckdb.connect(DB_PATH)
    load_fact_tables(con)
    schema_context = get_schema_context(con)

    test_questions = [
        "Which district had the most FIRs in 2023?",
        "Where are the crime hotspots in Bengaluru City?",
        "Show me repeat offenders linked to theft cases in Mysuru City.",
        "Compare chargesheet rates between Bengaluru City and Mysuru City for 2022.",
    ]
    for q in test_questions:
        print(f"\nQ: {q}")
        result = answer_question(con, q, schema_context)
        if result["error"]:
            print(f"  ERROR: {result['error']}\n  SQL: {result['sql']}")
        else:
            print(f"  Route: {result['route']}")
            print(f"  SQL: {result['sql']}")
            print(f"  Answer: {result['answer']}")
        time.sleep(6.0)  # Sleep 6 seconds to avoid Groq rate limit on free keys

    con.close()
