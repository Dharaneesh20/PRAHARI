"""
STEP 2 — Lookup / Master Table Extraction (full 24-table schema)
===================================================================
Builds every dimension/master table in the Karnataka Police ER schema
from the Step-1 parquet, wires up surrogate keys, and loads everything
into a DuckDB database file. CaseMaster (the fact table) is built last
so its FKs can point at the dimension tables already created.

Derivation source per table:
  - State, District, Unit, UnitType        <- CSV columns (real)
  - GravityOffence                          <- CSV `FIR Type` (real: Heinous/Non Heinous)
  - CaseStatusMaster                        <- CSV `FIR_Stage` (real, 343 distinct values)
  - CrimeHead, CrimeSubHead                 <- CSV CrimeGroup_Name / CrimeHead_Name (real)
  - Act, Section, CrimeHeadActSection       <- parsed out of CSV `ActSection` free-text (real)
  - CaseCategory                            <- NOT in CSV -> synthesized (weighted: mostly "FIR")
  - CasteMaster, ReligionMaster,
    OccupationMaster, Rank, Designation     <- NOT in CSV -> synthesized static reference lists
  - Employee                                <- CSV IOName/KGID (real) + synthetic DOB/rank/etc.
  - Court                                   <- NOT in CSV -> synthesized, a handful per district
  - CaseMaster                              <- CSV, FK-wired to all of the above + generated CrimeNo/CaseNo
"""

import os
import re
import duckdb
import numpy as np
import pandas as pd
from faker import Faker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IN_PARQUET_PATH = os.path.join(BASE_DIR, "data", "processed", "fir_step1_geo.parquet")
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
LONG_ACT_PARQUET = os.path.join(BASE_DIR, "data", "processed", "_long_act_sections.parquet")
FIR_WITH_IDS_PARQUET = os.path.join(BASE_DIR, "data", "processed", "_fir_with_ids.parquet")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(os.path.dirname(LONG_ACT_PARQUET), exist_ok=True)

RANDOM_SEED = 42

fake = Faker("en_IN")
Faker.seed(RANDOM_SEED)
rng = np.random.default_rng(RANDOM_SEED)


# ======================================================================
# 1. State
# ======================================================================
def build_state() -> pd.DataFrame:
    return pd.DataFrame([{"StateID": 1, "StateName": "Karnataka", "NationalityID": 1, "Active": True}])


# ======================================================================
# 2. District  (real, from District_Name)
# ======================================================================
def build_district(df: pd.DataFrame) -> pd.DataFrame:
    names = sorted(df["District_Name"].dropna().unique())
    return pd.DataFrame({
        "DistrictID": range(1, len(names) + 1),
        "DistrictName": names,
        "StateID": 1,
        "Active": True,
    })


# ======================================================================
# 3. UnitType (synthesized small lookup, inferred from UnitName patterns)
# ======================================================================
UNIT_TYPE_ROWS = [
    (1, "Police Station", "District", 5),
    (2, "Circle Office", "District", 4),
    (3, "Sub-Division", "District", 3),
    (4, "District Armed Reserve", "District", 3),
    (5, "City Commissionerate", "City", 2),
    (6, "Traffic Police Station", "City", 5),
    (7, "Special / Statewide Unit", "State", 1),
]

def build_unit_type() -> pd.DataFrame:
    return pd.DataFrame(UNIT_TYPE_ROWS, columns=["UnitTypeID", "UnitTypeName", "CityDistState", "Hierarchy"]).assign(Active=True)


def _infer_unit_type_id(unit_name: str) -> int:
    n = unit_name.upper()
    if "TRAFFIC" in n:
        return 6
    if "CIRCLE" in n:
        return 2
    if "COMMISSIONERATE" in n or "CCB" in n or "CITY" in n:
        return 5
    if "DAR" in n or "ARMED RESERVE" in n:
        return 4
    if any(k in n for k in ["CID", "ISD", "RAILWAY", "COASTAL"]):
        return 7
    if "SUB-DIV" in n or "SUBDIVISION" in n:
        return 3
    return 1  # default: Police Station


# ======================================================================
# 4. Unit (real, from UnitName + Unit_ID; Unit_ID confirmed 1:1 with district)
# ======================================================================
def build_unit(df: pd.DataFrame, district_df: pd.DataFrame) -> pd.DataFrame:
    unit_df = df[["Unit_ID", "UnitName", "District_Name"]].drop_duplicates(subset=["Unit_ID"]).copy()
    unit_df = unit_df.merge(district_df[["DistrictID", "DistrictName"]],
                             left_on="District_Name", right_on="DistrictName", how="left")
    unit_df["TypeID"] = unit_df["UnitName"].astype(str).map(_infer_unit_type_id)
    unit_df["StateID"] = 1
    unit_df["ParentUnit"] = pd.NA          # true station hierarchy not available in source data
    unit_df["NationalityID"] = 1
    unit_df["Active"] = True
    return unit_df.rename(columns={"Unit_ID": "UnitID"})[
        ["UnitID", "UnitName", "TypeID", "ParentUnit", "NationalityID", "StateID", "DistrictID", "Active"]
    ]


# ======================================================================
# 5. GravityOffence (real, from FIR Type: Heinous / Non Heinous)
# ======================================================================
def build_gravity_offence(df: pd.DataFrame) -> pd.DataFrame:
    vals = sorted(df["FIR Type"].dropna().unique())
    return pd.DataFrame({"GravityOffenceID": range(1, len(vals) + 1), "LookupValue": vals})


# ======================================================================
# 6. CaseStatusMaster (real, from FIR_Stage — 343 distinct values)
# ======================================================================
def build_case_status(df: pd.DataFrame) -> pd.DataFrame:
    vals = sorted(df["FIR_Stage"].dropna().unique())
    return pd.DataFrame({"CaseStatusID": range(1, len(vals) + 1), "CaseStatusName": vals})


# ======================================================================
# 7. CaseCategory (NOT in CSV -> synthesized per the CrimeNo spec's 4 categories)
# ======================================================================
CASE_CATEGORY_ROWS = [
    (1, "FIR", "1"),
    (2, "UDR", "3"),
    (3, "Zero FIR", "8"),
    (4, "PAR", "4"),
]

def build_case_category() -> pd.DataFrame:
    return pd.DataFrame(CASE_CATEGORY_ROWS, columns=["CaseCategoryID", "LookupValue", "CategoryCode"])


# ======================================================================
# 8. CrimeHead (real, from CrimeGroup_Name)
# ======================================================================
def build_crime_head(df: pd.DataFrame) -> pd.DataFrame:
    vals = sorted(df["CrimeGroup_Name"].dropna().unique())
    return pd.DataFrame({"CrimeHeadID": range(1, len(vals) + 1), "CrimeGroupName": vals, "Active": True})


# ======================================================================
# 9. CrimeSubHead (real, from CrimeHead_Name; parent = modal CrimeGroup_Name
#    since ~16% of sub-heads appear under more than one group in the raw data)
# ======================================================================
def build_crime_sub_head(df: pd.DataFrame, crime_head_df: pd.DataFrame) -> pd.DataFrame:
    parent = (
        df.dropna(subset=["CrimeHead_Name", "CrimeGroup_Name"])
          .groupby(["CrimeHead_Name", "CrimeGroup_Name"]).size()
          .reset_index(name="n")
          .sort_values("n", ascending=False)
          .drop_duplicates(subset=["CrimeHead_Name"], keep="first")
    )
    parent = parent.merge(crime_head_df[["CrimeHeadID", "CrimeGroupName"]],
                           left_on="CrimeGroup_Name", right_on="CrimeGroupName", how="left")
    parent = parent.sort_values("CrimeHead_Name").reset_index(drop=True)
    parent["CrimeSubHeadID"] = range(1, len(parent) + 1)
    parent["SeqID"] = parent.groupby("CrimeHeadID").cumcount() + 1
    return parent.rename(columns={"CrimeHead_Name": "CrimeHeadName"})[
        ["CrimeSubHeadID", "CrimeHeadID", "CrimeHeadName", "SeqID"]
    ]


# ======================================================================
# 10. Act / Section / CrimeHeadActSection — parsed from free-text ActSection
# ======================================================================
_ACT_SECTION_RE = re.compile(r"([A-Za-z0-9][A-Za-z0-9,\.\(\)\s]*?)U/s:\s*([0-9A-Za-z,\(\)\.]+)\s*")

def _parse_act_sections(text: str):
    """Return list of (act_name, [section_codes]) tuples parsed out of one ActSection string."""
    if not isinstance(text, str):
        return []
    out = []
    for act_name, sections_raw in _ACT_SECTION_RE.findall(text):
        act_name = act_name.strip().rstrip(",")
        sections = [s.strip() for s in sections_raw.split(",") if s.strip()]
        if act_name and sections:
            out.append((act_name, sections))
    return out


def parse_all_act_sections(df: pd.DataFrame) -> pd.DataFrame:
    """
    One-time parse of the full ActSection column into a long table:
    CaseMasterID | ActName | SectionCode | ActOrderID | SectionOrderID
    Also carries CrimeHeadID-source (CrimeGroup_Name) so we can build
    CrimeHeadActSection from real co-occurrence.
    """
    records = []
    for cid, head, text in zip(df["CaseMasterID"], df["CrimeGroup_Name"], df["ActSection"]):
        parsed = _parse_act_sections(text)
        for act_order, (act_name, sections) in enumerate(parsed, start=1):
            for sec_order, sec in enumerate(sections, start=1):
                records.append((cid, head, act_name, sec, act_order, sec_order))
    return pd.DataFrame(records, columns=[
        "CaseMasterID", "CrimeGroup_Name", "ActName", "SectionCode", "ActOrderID", "SectionOrderID"
    ])


def build_act(long_df: pd.DataFrame) -> pd.DataFrame:
    acts = sorted(long_df["ActName"].dropna().unique())
    codes = [f"ACT{str(i).zfill(4)}" for i in range(1, len(acts) + 1)]
    short = [a.split(",")[0].split(" ")[0][:20] for a in acts]
    return pd.DataFrame({
        "ActCode": codes, "ActDescription": acts, "ShortName": short, "Active": True,
    })


def build_section(long_df: pd.DataFrame, act_df: pd.DataFrame) -> pd.DataFrame:
    name_to_code = dict(zip(act_df["ActDescription"], act_df["ActCode"]))
    sec = long_df[["ActName", "SectionCode"]].drop_duplicates().copy()
    sec["ActCode"] = sec["ActName"].map(name_to_code)
    sec["SectionDescription"] = "Section " + sec["SectionCode"].astype(str)
    sec["Active"] = True
    return sec[["ActCode", "SectionCode", "SectionDescription", "Active"]].reset_index(drop=True)


def build_crime_head_act_section(long_df: pd.DataFrame, crime_head_df: pd.DataFrame, act_df: pd.DataFrame) -> pd.DataFrame:
    """Real co-occurrence: which (Act, Section) pairs actually showed up under each CrimeHead."""
    name_to_code = dict(zip(act_df["ActDescription"], act_df["ActCode"]))
    head_to_id = dict(zip(crime_head_df["CrimeGroupName"], crime_head_df["CrimeHeadID"]))
    tmp = long_df[["CrimeGroup_Name", "ActName", "SectionCode"]].drop_duplicates().copy()
    tmp["CrimeHeadID"] = tmp["CrimeGroup_Name"].map(head_to_id)
    tmp["ActCode"] = tmp["ActName"].map(name_to_code)
    return tmp.dropna(subset=["CrimeHeadID", "ActCode"])[["CrimeHeadID", "ActCode", "SectionCode"]].reset_index(drop=True)


def build_act_section_association(long_df: pd.DataFrame, act_df: pd.DataFrame) -> pd.DataFrame:
    name_to_code = dict(zip(act_df["ActDescription"], act_df["ActCode"]))
    out = long_df.copy()
    out["ActID"] = out["ActName"].map(name_to_code)
    out["SectionID"] = out["SectionCode"]
    return out[["CaseMasterID", "ActID", "SectionID", "ActOrderID", "SectionOrderID"]]


# ======================================================================
# 11. CasteMaster / ReligionMaster / OccupationMaster — synthesized static lookups
#     (zero signal in CSV; standard reference lists used for realistic assignment)
# ======================================================================
def build_caste_master() -> pd.DataFrame:
    names = ["General", "OBC", "SC", "ST", "Category-I", "Category-IIA", "Category-IIB", "Category-IIIA", "Category-IIIB", "Not Disclosed"]
    return pd.DataFrame({"caste_master_id": range(1, len(names) + 1), "caste_master_name": names})


def build_religion_master() -> pd.DataFrame:
    names = ["Hindu", "Muslim", "Christian", "Jain", "Sikh", "Buddhist", "Others", "Not Disclosed"]
    return pd.DataFrame({"ReligionID": range(1, len(names) + 1), "ReligionName": names})


def build_occupation_master() -> pd.DataFrame:
    names = ["Farmer", "Daily Wage Labourer", "Government Employee", "Private Employee", "Business/Self-Employed",
             "Student", "Homemaker", "Unemployed", "Driver", "Domestic Worker", "Retired", "Others"]
    return pd.DataFrame({"OccupationID": range(1, len(names) + 1), "OccupationName": names})


# ======================================================================
# 12. Rank / Designation — synthesized standard Karnataka Police lists
# ======================================================================
def build_rank() -> pd.DataFrame:
    ranks = ["DGP", "ADGP", "IGP", "DIG", "SP", "Addl. SP", "DySP", "Inspector",
             "Sub-Inspector", "Asst. Sub-Inspector", "Head Constable", "Police Constable"]
    return pd.DataFrame({
        "RankID": range(1, len(ranks) + 1), "RankName": ranks,
        "Hierarchy": range(1, len(ranks) + 1), "Active": True,
    })


def build_designation() -> pd.DataFrame:
    desigs = ["Investigating Officer", "Station House Officer", "Reporting Officer",
              "Supervising Officer", "Circle Inspector", "Beat Officer"]
    return pd.DataFrame({
        "DesignationID": range(1, len(desigs) + 1), "DesignationName": desigs,
        "Active": True, "SortOrder": range(1, len(desigs) + 1),
    })


# ======================================================================
# 13. Employee — real IOName/KGID, synthetic DOB/rank/designation/etc.
#     One employee row per distinct real KGID (per stakeholder decision).
# ======================================================================
def build_employee(df: pd.DataFrame, unit_df: pd.DataFrame, district_df: pd.DataFrame,
                    rank_df: pd.DataFrame, designation_df: pd.DataFrame) -> pd.DataFrame:
    emp = df[["KGID", "IOName", "Unit_ID"]].dropna(subset=["KGID"]).drop_duplicates(subset=["KGID"]).copy()
    emp = emp.merge(unit_df[["UnitID", "DistrictID"]], left_on="Unit_ID", right_on="UnitID", how="left")

    n = len(emp)
    emp["EmployeeID"] = range(1, n + 1)
    emp["RankID"] = rng.choice(rank_df["RankID"], size=n, p=_rank_weights(rank_df))
    emp["DesignationID"] = rng.choice(designation_df["DesignationID"], size=n)
    emp["FirstName"] = emp["IOName"].astype(str).str.split().str[0]
    dob_years = rng.integers(1965, 2003, size=n)
    dob_days = rng.integers(0, 365, size=n)
    emp["EmployeeDOB"] = [pd.Timestamp(int(y), 1, 1) + pd.Timedelta(days=int(d)) for y, d in zip(dob_years, dob_days)]
    emp["GenderID"] = rng.choice([1, 2], size=n, p=[0.82, 0.18])  # M/F, roughly reflects police force composition
    emp["BloodGroupID"] = rng.integers(1, 9, size=n)
    emp["PhysicallyChallenged"] = rng.choice([0, 1], size=n, p=[0.98, 0.02])
    appt_years = np.minimum(dob_years + rng.integers(21, 30, size=n), 2024)
    emp["AppointmentDate"] = [pd.Timestamp(int(y), int(rng.integers(1, 13)), 1) for y in appt_years]

    return emp.rename(columns={"KGID": "KGID"})[[
        "EmployeeID", "DistrictID", "UnitID", "RankID", "DesignationID", "KGID", "FirstName",
        "EmployeeDOB", "GenderID", "BloodGroupID", "PhysicallyChallenged", "AppointmentDate",
    ]]


def _rank_weights(rank_df: pd.DataFrame):
    """Pyramid-shaped rank distribution: mostly constables, very few DGP-level."""
    n = len(rank_df)
    w = np.geomspace(1, 40, n)[::-1]  # heaviest at the bottom (Constable) end
    return w / w.sum()


# ======================================================================
# 14. Court — synthesized, a handful per district (no CSV signal)
# ======================================================================
COURT_TYPES = ["Civil Judge & JMFC Court", "Principal District & Sessions Court",
               "Additional District & Sessions Court", "Fast Track Court", "Family Court"]

def build_court(district_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    court_id = 1
    for _, d in district_df.iterrows():
        n_courts = rng.integers(1, 4)
        chosen = rng.choice(COURT_TYPES, size=n_courts, replace=False)
        for ct in chosen:
            rows.append((court_id, f"{ct}, {d['DistrictName']}", d["DistrictID"], d["StateID"], True))
            court_id += 1
    return pd.DataFrame(rows, columns=["CourtID", "CourtName", "DistrictID", "StateID", "Active"])


# ======================================================================
# Orchestration
# ======================================================================
def main():
    df = pd.read_parquet(IN_PARQUET_PATH)

    state_df = build_state()
    district_df = build_district(df)
    unit_type_df = build_unit_type()
    unit_df = build_unit(df, district_df)
    gravity_df = build_gravity_offence(df)
    status_df = build_case_status(df)
    category_df = build_case_category()
    crime_head_df = build_crime_head(df)
    crime_sub_head_df = build_crime_sub_head(df, crime_head_df)

    print("Parsing ActSection free-text column (this scans all rows once)...")
    long_act_df = parse_all_act_sections(df)
    act_df = build_act(long_act_df)
    section_df = build_section(long_act_df, act_df)
    crime_head_act_section_df = build_crime_head_act_section(long_act_df, crime_head_df, act_df)
    act_section_assoc_df = build_act_section_association(long_act_df, act_df)

    caste_df = build_caste_master()
    religion_df = build_religion_master()
    occupation_df = build_occupation_master()
    rank_df = build_rank()
    designation_df = build_designation()
    employee_df = build_employee(df, unit_df, district_df, rank_df, designation_df)
    court_df = build_court(district_df)

    if os.path.exists(DB_PATH):
        try:
            test_con = duckdb.connect(DB_PATH)
            test_con.close()
        except Exception:
            print(f"Existing DB file at {DB_PATH} is invalid or corrupted. Removing it...")
            try:
                os.remove(DB_PATH)
            except Exception as e:
                print(f"Error removing corrupted database file: {e}")

    con = duckdb.connect(DB_PATH)
    tables = {
        "State": state_df, "District": district_df, "UnitType": unit_type_df, "Unit": unit_df,
        "GravityOffence": gravity_df, "CaseStatusMaster": status_df, "CaseCategory": category_df,
        "CrimeHead": crime_head_df, "CrimeSubHead": crime_sub_head_df,
        "Act": act_df, "Section": section_df, "CrimeHeadActSection": crime_head_act_section_df,
        "ActSectionAssociation": act_section_assoc_df,
        "CasteMaster": caste_df, "ReligionMaster": religion_df, "OccupationMaster": occupation_df,
        "Rank": rank_df, "Designation": designation_df, "Employee": employee_df, "Court": court_df,
    }
    for name, tdf in tables.items():
        con.execute(f'CREATE OR REPLACE TABLE "{name}" AS SELECT * FROM tdf')
        print(f"  {name:<24} {len(tdf):>10,} rows")

    con.close()
    print(f"\nSaved {len(tables)} tables -> {DB_PATH}")

    # Stash intermediate frames for Step 3 to reuse without recomputation
    long_act_df.to_parquet(LONG_ACT_PARQUET, index=False)
    df.to_parquet(FIR_WITH_IDS_PARQUET, index=False)


if __name__ == "__main__":
    main()
