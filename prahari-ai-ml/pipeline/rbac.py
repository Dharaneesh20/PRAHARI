"""
rbac.py — Role-Based Access Control (RBAC) scoping logic
=========================================================
Defines SHO, SP, and SCRB_ADMIN roles and applies dynamic jurisdiction filters
to generated SQL queries by replacing table references with scoped subqueries.
This ensures the LLM cannot bypass or override the scope filter.
"""
import re

def get_scope_filter(role: str, scope_id: int | None) -> dict | None:
    """
    Returns the basic table column and scope ID value mapping for audit/reference.
    - SHO: Scoped to UnitID
    - SP: Scoped to DistrictID
    - SCRB_ADMIN: Statewide (None)
    """
    if role == "SHO":
        if scope_id is None:
            raise ValueError("scope_id is required for SHO role")
        return {"table_column": "UnitID", "value": int(scope_id)}
    elif role == "SP":
        if scope_id is None:
            raise ValueError("scope_id is required for SP role")
        return {"table_column": "DistrictID", "value": int(scope_id)}
    elif role == "SCRB_ADMIN":
        return None
    else:
        raise ValueError(f"Unknown role: {role}")

def resolve_scope_context(con, role: str, scope_id: int | None) -> dict:
    """
    Resolves scope IDs into names and parent IDs:
    - SP (DistrictID) -> DistrictName, UnitName list
    - SHO (UnitID) -> UnitName, DistrictID, DistrictName
    """
    context = {
        "DistrictID": None,
        "DistrictName": None,
        "UnitID": None,
        "UnitName": None,
    }
    if role == "SCRB_ADMIN":
        return context

    if role == "SP":
        context["DistrictID"] = int(scope_id)
        res = con.execute("SELECT DistrictName FROM District WHERE DistrictID = ?", [scope_id]).fetchone()
        if res:
            context["DistrictName"] = res[0]
        else:
            raise ValueError(f"DistrictID {scope_id} not found in database")

    elif role == "SHO":
        context["UnitID"] = int(scope_id)
        res = con.execute("SELECT UnitName, DistrictID FROM Unit WHERE UnitID = ?", [scope_id]).fetchone()
        if res:
            context["UnitName"] = res[0]
            context["DistrictID"] = res[1]
            res_d = con.execute("SELECT DistrictName FROM District WHERE DistrictID = ?", [res[1]]).fetchone()
            if res_d:
                context["DistrictName"] = res_d[0]
        else:
            raise ValueError(f"UnitID {scope_id} not found in database")

    return context

def apply_scope_filter(con, sql: str, role: str, scope_id: int | None) -> str:
    """
    Rewrites the generated SQL to scope it to the role's jurisdiction.
    Uses regex table replacement with scoped subqueries to ensure complete enforcement.
    """
    if role == "SCRB_ADMIN":
        return sql

    # 1. Resolve scope context names/IDs
    ctx = resolve_scope_context(con, role, scope_id)
    dist_name = ctx["DistrictName"]
    dist_id = ctx["DistrictID"]
    unit_id = ctx["UnitID"]
    unit_name = ctx["UnitName"]

    # 2. Define the table-to-filter mapping
    # Maps each whitelisted table to its replacement subquery text based on the role
    mappings = {}

    if role == "SP":
        mappings = {
            "CaseMaster": f"(SELECT * FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id}))",
            "CaseMaster_Wide": f"(SELECT * FROM CaseMaster_Wide WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "fact_crime_agg": f"(SELECT * FROM fact_crime_agg WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "fact_crime_geo": f"(SELECT * FROM fact_crime_geo WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "fact_crime_monthly": f"(SELECT * FROM fact_crime_monthly WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "NetworkSummary": f"(SELECT * FROM NetworkSummary WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "trend_forecast": f"(SELECT * FROM trend_forecast WHERE LOWER(District) = LOWER('{dist_name}'))",
            "trend_model_benchmark": f"(SELECT * FROM trend_model_benchmark WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_model_benchmark": f"(SELECT * FROM hotspot_model_benchmark WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_clusters": f"(SELECT * FROM hotspot_clusters WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_summary": f"(SELECT * FROM hotspot_summary WHERE LOWER(District) = LOWER('{dist_name}'))",
            "Accused": f"(SELECT * FROM Accused WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id})))",
            "ArrestSurrender": f"(SELECT * FROM ArrestSurrender WHERE AccusedMasterID IN (SELECT AccusedMasterID FROM Accused WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id}))))",
            "ChargesheetDetails": f"(SELECT * FROM ChargesheetDetails WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id})))",
            "ComplainantDetails": f"(SELECT * FROM ComplainantDetails WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id})))",
            "Victim": f"(SELECT * FROM Victim WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id})))",
            "Unit": f"(SELECT * FROM Unit WHERE DistrictID = {dist_id})",
            "District": f"(SELECT * FROM District WHERE DistrictID = {dist_id})",
            "Employee": f"(SELECT * FROM Employee WHERE DistrictID = {dist_id})",
            "Court": f"(SELECT * FROM Court WHERE DistrictID = {dist_id})",
            "ActSectionAssociation": f"(SELECT * FROM ActSectionAssociation WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID IN (SELECT UnitID FROM Unit WHERE DistrictID = {dist_id})))",
        }
    elif role == "SHO":
        mappings = {
            "CaseMaster": f"(SELECT * FROM CaseMaster WHERE PoliceStationID = {unit_id})",
            "CaseMaster_Wide": f"(SELECT * FROM CaseMaster_Wide WHERE LOWER(UnitName) = LOWER('{unit_name}'))",
            # Precomputed tables are district-level; resolve UnitID -> DistrictID (dist_name)
            "fact_crime_agg": f"(SELECT * FROM fact_crime_agg WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "fact_crime_geo": f"(SELECT * FROM fact_crime_geo WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "fact_crime_monthly": f"(SELECT * FROM fact_crime_monthly WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "NetworkSummary": f"(SELECT * FROM NetworkSummary WHERE LOWER(DistrictName) = LOWER('{dist_name}'))",
            "trend_forecast": f"(SELECT * FROM trend_forecast WHERE LOWER(District) = LOWER('{dist_name}'))",
            "trend_model_benchmark": f"(SELECT * FROM trend_model_benchmark WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_model_benchmark": f"(SELECT * FROM hotspot_model_benchmark WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_clusters": f"(SELECT * FROM hotspot_clusters WHERE LOWER(District) = LOWER('{dist_name}'))",
            "hotspot_summary": f"(SELECT * FROM hotspot_summary WHERE LOWER(District) = LOWER('{dist_name}'))",
            # Raw tables filter directly on UnitID
            "Accused": f"(SELECT * FROM Accused WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id}))",
            "ArrestSurrender": f"(SELECT * FROM ArrestSurrender WHERE AccusedMasterID IN (SELECT AccusedMasterID FROM Accused WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id})))",
            "ChargesheetDetails": f"(SELECT * FROM ChargesheetDetails WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id}))",
            "ComplainantDetails": f"(SELECT * FROM ComplainantDetails WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id}))",
            "Victim": f"(SELECT * FROM Victim WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id}))",
            "Unit": f"(SELECT * FROM Unit WHERE UnitID = {unit_id})",
            "District": f"(SELECT * FROM District WHERE DistrictID = {dist_id})",
            "Employee": f"(SELECT * FROM Employee WHERE UnitID = {unit_id})",
            "Court": f"(SELECT * FROM Court WHERE DistrictID = {dist_id})",
            "ActSectionAssociation": f"(SELECT * FROM ActSectionAssociation WHERE CaseMasterID IN (SELECT CaseMasterID FROM CaseMaster WHERE PoliceStationID = {unit_id}))",
        }

    # 3. Apply the replacements using word-boundary matching preceded by FROM or JOIN
    rewritten_sql = sql
    for table, subquery in mappings.items():
        # Match only whole word table names preceded by FROM or JOIN
        pattern = re.compile(rf"\b(FROM|JOIN)\s+[\"`]?{table}[\"`]?\b", re.IGNORECASE)
        rewritten_sql = pattern.sub(rf"\1 {subquery}", rewritten_sql)

    return rewritten_sql
