"""
STEP 2b — CaseMaster (fact table), full-spec CrimeNo
========================================================
Builds the CaseMaster table itself: FK-wires every row to the dimension
tables from Step 2, and generates CrimeNo/CaseNo per the exact spec:

    CrimeNo = 1-digit CaseCategory code + 4-digit DistrictID
              + 4-digit UnitID (police station) + 4-digit Year
              + 5-digit running serial (per station+category+year)
    CaseNo  = last 9 digits of CrimeNo (Year + serial)

Run after step2_lookup_tables.py (reuses its cached intermediate files).
"""
import os
import duckdb
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
FIR_PARQUET = os.path.join(BASE_DIR, "data", "processed", "_fir_with_ids.parquet")

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

# CaseCategory isn't in the CSV at all -> synthesize with a realistic skew
# (the vast majority of station-level filings are ordinary FIRs).
CATEGORY_WEIGHTS = {"FIR": 0.90, "UDR": 0.05, "Zero FIR": 0.02, "PAR": 0.03}


def assign_case_category(n: int, category_df: pd.DataFrame) -> pd.Series:
    names = category_df["LookupValue"].tolist()
    weights = [CATEGORY_WEIGHTS[n_] for n_ in names]
    choice = rng.choice(names, size=n, p=weights)
    lookup = dict(zip(category_df["LookupValue"], category_df["CaseCategoryID"]))
    code_lookup = dict(zip(category_df["LookupValue"], category_df["CategoryCode"]))
    cat_id = pd.Series(choice).map(lookup).to_numpy()
    cat_code = pd.Series(choice).map(code_lookup).to_numpy()
    return cat_id, cat_code


def build_crime_no(df: pd.DataFrame, category_code: np.ndarray) -> pd.DataFrame:
    df = df.copy()
    df["_cat_code"] = category_code
    df["_year"] = df["CrimeRegisteredDate"].dt.year.fillna(df["FIR_YEAR"]).astype("Int64")

    # Running serial: separate sequence per (police station, category, year)
    df["_serial"] = (
        df.groupby(["PoliceStationID", "_cat_code", "_year"]).cumcount() + 1
    )

    district_4d = df["DistrictID"].astype("Int64").astype(str).str.zfill(4)
    unit_4d = df["PoliceStationID"].astype("Int64").astype(str).str.zfill(4)
    year_4d = df["_year"].astype(str).str.zfill(4)
    serial_5d = df["_serial"].astype(str).str.zfill(5)

    df["CrimeNo"] = (
        df["_cat_code"].astype(str) + district_4d + unit_4d + year_4d + serial_5d
    )
    df["CaseNo"] = year_4d + serial_5d

    return df.drop(columns=["_cat_code", "_year", "_serial"])


def main():
    con = duckdb.connect(DB_PATH)

    df = pd.read_parquet(FIR_PARQUET)
    district_df = con.execute("SELECT DistrictID, DistrictName FROM District").fetchdf()
    unit_df = con.execute("SELECT UnitID FROM Unit").fetchdf()
    gravity_df = con.execute("SELECT GravityOffenceID, LookupValue FROM GravityOffence").fetchdf()
    status_df = con.execute("SELECT CaseStatusID, CaseStatusName FROM CaseStatusMaster").fetchdf()
    category_df = con.execute("SELECT CaseCategoryID, LookupValue, CategoryCode FROM CaseCategory").fetchdf()
    crime_head_df = con.execute("SELECT CrimeHeadID, CrimeGroupName FROM CrimeHead").fetchdf()
    crime_sub_head_df = con.execute("SELECT CrimeSubHeadID, CrimeHeadName FROM CrimeSubHead").fetchdf()
    court_df = con.execute("SELECT CourtID, DistrictID FROM Court").fetchdf()
    employee_df = con.execute("SELECT EmployeeID, KGID FROM Employee").fetchdf()

    n = len(df)
    print(f"Building CaseMaster for {n:,} FIR rows...")

    cm = df[["CaseMasterID", "CrimeRegisteredDate", "latitude", "longitude",
             "District_Name", "Unit_ID", "FIR Type", "FIR_Stage",
             "CrimeGroup_Name", "CrimeHead_Name", "KGID", "FIR_YEAR"]].copy()

    # --- FK: District / PoliceStation --------------------------------
    cm = cm.merge(district_df, left_on="District_Name", right_on="DistrictName", how="left")
    cm = cm.rename(columns={"Unit_ID": "PoliceStationID"})

    # --- FK: GravityOffence / CaseStatus ------------------------------
    cm = cm.merge(gravity_df, left_on="FIR Type", right_on="LookupValue", how="left")
    cm = cm.merge(status_df, left_on="FIR_Stage", right_on="CaseStatusName", how="left")

    # --- FK: CrimeHead / CrimeSubHead ---------------------------------
    cm = cm.merge(crime_head_df, left_on="CrimeGroup_Name", right_on="CrimeGroupName", how="left")
    cm = cm.rename(columns={"CrimeHeadID": "CrimeMajorHeadID"})
    cm = cm.merge(crime_sub_head_df, left_on="CrimeHead_Name", right_on="CrimeHeadName", how="left")
    cm = cm.rename(columns={"CrimeSubHeadID": "CrimeMinorHeadID"})

    # --- FK: CaseCategory (synthesized) + CrimeNo/CaseNo --------------
    cat_id, cat_code = assign_case_category(n, category_df)
    cm["CaseCategoryID"] = cat_id
    cm = build_crime_no(cm, cat_code)

    # --- FK: Court (random per-district court; no real linkage in CSV) -
    court_by_district = court_df.groupby("DistrictID")["CourtID"].apply(list).to_dict()
    cm["CourtID"] = cm["DistrictID"].map(
        lambda d: rng.choice(court_by_district[d]) if d in court_by_district and len(court_by_district[d]) else pd.NA
    )

    # --- FK: PolicePersonID (Employee, via real KGID) ------------------
    cm = cm.merge(employee_df, on="KGID", how="left")
    cm = cm.rename(columns={"EmployeeID": "PolicePersonID"})

    # --- Synthetic incident timing / narrative -------------------------
    offset_days = rng.integers(0, 4, size=n)
    cm["IncidentFromDate"] = cm["CrimeRegisteredDate"] - pd.to_timedelta(offset_days, unit="D")
    cm["IncidentToDate"] = cm["IncidentFromDate"] + pd.to_timedelta(rng.integers(0, 2, size=n), unit="D")
    cm["InfoReceivedPSDate"] = cm["CrimeRegisteredDate"]
    cm["BriefFacts"] = "Case registered under " + cm["CrimeGroup_Name"].astype(str) + \
                        " - " + cm["CrimeHead_Name"].astype(str) + "."

    case_master_df = cm[[
        "CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PolicePersonID",
        "PoliceStationID", "CaseCategoryID", "GravityOffenceID", "CrimeMajorHeadID",
        "CrimeMinorHeadID", "CaseStatusID", "CourtID", "IncidentFromDate", "IncidentToDate",
        "InfoReceivedPSDate", "latitude", "longitude", "BriefFacts",
    ]].rename(columns={"latitude": "Latitude", "longitude": "Longitude"})

    con.execute('CREATE OR REPLACE TABLE "CaseMaster" AS SELECT * FROM case_master_df')
    print(f"  CaseMaster               {len(case_master_df):>10,} rows")

    # Sanity: CrimeNo uniqueness
    dupes = case_master_df["CrimeNo"].duplicated().sum()
    print(f"  CrimeNo duplicate check: {dupes} duplicates (expect 0)")
    print(case_master_df[["CaseMasterID", "CrimeNo", "CaseNo", "PoliceStationID", "CourtID", "PolicePersonID"]].head())

    con.close()
    print(f"\nSaved -> {DB_PATH}")


if __name__ == "__main__":
    main()
