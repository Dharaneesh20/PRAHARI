"""
STEP 3 — Synthetic PII Generation (The Network Builder)
===========================================================
Populates ComplainantDetails, Victim, Accused, ArrestSurrender, and
ChargesheetDetails. Names/ages/demographics are 100% synthetic (Faker);
the *counts* driving how many rows to generate per FIR come from real
CSV columns wherever they exist.

Performance note: with ~3M accused / ~1.4M victims / ~1.5M arrests to
generate, per-row Faker calls would be far too slow. Instead we
pre-generate modest name pools with Faker once, then vectorize
everything else with numpy (random.choice, np.repeat) across the full
row count.

Repeat-offender design (the "Network Builder" requirement):
  - A fixed pool of ~40,000 recurring "criminal identities" is created.
  - ~15% of all generated Accused slots are filled from this pool
    instead of getting a fresh one-off identity.
  - Pool identities carry a "home crime-head bucket" (property/organized
    crime is over-weighted, per stakeholder decision) and a "home unit",
    and slot assignment prefers reusing an identity within the same
    CrimeHead bucket and, with high probability, the same UnitName —
    this is what produces multi-FIR repeat offenders concentrated in a
    police unit, ready for NetworkX co-accused graphing in Step 4.
  - Reuse frequency within the pool follows a Zipf-like skew, so a
    handful of "kingpin" identities appear across many FIRs while most
    repeat only 2-3 times — this gives Step 4's graph real hub nodes.
"""

import os
import duckdb
import numpy as np
import pandas as pd
from faker import Faker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
FIR_PARQUET = os.path.join(BASE_DIR, "data", "processed", "_fir_with_ids.parquet")
RANDOM_SEED = 42

fake = Faker("en_IN")
Faker.seed(RANDOM_SEED)
rng = np.random.default_rng(RANDOM_SEED)

REPEAT_OFFENDER_RATE = 0.15
REPEAT_POOL_SIZE = 40_000

# CrimeHead names (by CrimeGroupName text) treated as "property / organized
# crime" for repeat-offender biasing, per stakeholder decision.
PROPERTY_ORGANIZED_KEYWORDS = [
    "THEFT", "ROBBERY", "DACOITY", "BURGLARY", "CHEATING",
    "CRIMINAL BREACH OF TRUST", "CRIMINAL MISAPPROPRIATION",
    "RECEIVING OF STOLEN PROPERTY", "COUNTERFEITING", "FORGERY",
    "CRIMINAL CONSPIRACY", "NARCOTIC DRUGS", "DOCUMENTS & PROPERTY MARKS",
    "ARMS ACT",
]


# ----------------------------------------------------------------------
# Name pools (generated once with Faker, then sampled millions of times
# with numpy — this is what keeps the whole step fast).
# ----------------------------------------------------------------------
def build_name_pools(n_first=3000, n_last=2000):
    male_first = [fake.first_name_male() for _ in range(n_first)]
    female_first = [fake.first_name_female() for _ in range(n_first)]
    last = [fake.last_name() for _ in range(n_last)]
    return (np.array(male_first), np.array(female_first), np.array(last))


def synth_names(genders: np.ndarray, male_first, female_first, last_names, rng_local) -> np.ndarray:
    """genders: array of 'M'/'F'/'T'. Vectorized full-name synthesis."""
    n = len(genders)
    first = np.empty(n, dtype=object)
    is_m = genders == "M"
    is_f = genders == "F"
    is_t = ~(is_m | is_f)
    first[is_m] = rng_local.choice(male_first, size=is_m.sum())
    first[is_f] = rng_local.choice(female_first, size=is_f.sum())
    if is_t.sum():
        pool = np.concatenate([male_first, female_first])
        first[is_t] = rng_local.choice(pool, size=is_t.sum())
    last = rng_local.choice(last_names, size=n)
    return np.array([f"{f} {l}" for f, l in zip(first, last)])


# ----------------------------------------------------------------------
# Repeat-offender pool
# ----------------------------------------------------------------------
def build_repeat_offender_pool(case_master_df, crime_head_df, unit_df,
                                male_first, female_first, last_names,
                                pool_size=REPEAT_POOL_SIZE):
    property_head_ids = crime_head_df.loc[
        crime_head_df["CrimeGroupName"].apply(lambda x: any(k in x.upper() for k in PROPERTY_ORGANIZED_KEYWORDS)),
        "CrimeHeadID"
    ].tolist()
    all_head_ids = crime_head_df["CrimeHeadID"].tolist()

    unit_ids = unit_df["UnitID"].to_numpy()
    genders = rng.choice(["M", "F"], size=pool_size, p=[0.88, 0.12])
    names = synth_names(genders, male_first, female_first, last_names, rng)
    ages = rng.integers(18, 55, size=pool_size)

    # 70% of the pool's "home" crime bucket is property/organized crime,
    # so those cases draw repeat identities far more often than average.
    home_head = np.where(
        rng.random(pool_size) < 0.70,
        rng.choice(property_head_ids, size=pool_size),
        rng.choice(all_head_ids, size=pool_size),
    )
    home_unit = rng.choice(unit_ids, size=pool_size)

    pool = pd.DataFrame({
        "pool_id": range(pool_size),
        "name": names, "gender": genders, "age": ages,
        "home_head": home_head, "home_unit": home_unit,
    })

    # Zipf-skewed "notoriety" weight -> a few identities get reused far
    # more than others, creating hub nodes for the co-accused graph.
    zipf_rank = rng.permutation(pool_size) + 1
    pool["weight"] = 1.0 / np.power(zipf_rank, 0.9)
    pool["weight"] /= pool["weight"].sum()
    return pool


# ----------------------------------------------------------------------
# Accused table
# ----------------------------------------------------------------------
def build_accused(case_master_df, crime_head_df, unit_df, repeat_pool,
                   male_first, female_first, last_names):
    counts = case_master_df["Accused Count"].fillna(0).astype(int).clip(lower=0)
    n_slots = int(counts.sum())
    print(f"  Total accused slots to generate: {n_slots:,}")

    case_idx = np.repeat(case_master_df["CaseMasterID"].to_numpy(), counts.to_numpy())
    unit_idx = np.repeat(case_master_df["PoliceStationID"].to_numpy(), counts.to_numpy())
    head_idx = np.repeat(case_master_df["CrimeMajorHeadID"].to_numpy(), counts.to_numpy())

    property_head_ids = set(crime_head_df.loc[
        crime_head_df["CrimeGroupName"].apply(lambda x: any(k in x.upper() for k in PROPERTY_ORGANIZED_KEYWORDS)),
        "CrimeHeadID"
    ])
    is_property = np.isin(head_idx, list(property_head_ids))

    # Per-slot repeat probability: biased higher for property/organized
    # crime so the *overall* rate lands close to the target 15%.
    # Calibrated against this dataset's actual mix: property/organized
    # crime is ~12.6% of all accused slots, so it needs a much higher
    # per-slot rate to pull the blended average up to 15%.
    base_p = np.where(is_property, 0.50, 0.10)
    is_repeat = rng.random(n_slots) < base_p
    actual_rate = is_repeat.mean()
    print(f"  Repeat-offender slot rate: {actual_rate:.1%} (target {REPEAT_OFFENDER_RATE:.0%})")

    n = n_slots
    accused_name = np.empty(n, dtype=object)
    accused_gender = np.empty(n, dtype=object)
    accused_age = np.empty(n, dtype=int)

    # --- Repeat slots: draw from the pool, preferring same-unit hits ---
    n_repeat = is_repeat.sum()
    if n_repeat:
        repeat_units = unit_idx[is_repeat]
        chosen_pool_idx = np.empty(n_repeat, dtype=int)
        pool_by_unit = repeat_pool.groupby("home_unit").indices  # unit -> row positions

        SAME_UNIT_PROB = 0.6
        want_same_unit = rng.random(n_repeat) < SAME_UNIT_PROB
        global_choice = rng.choice(repeat_pool.index.to_numpy(), size=n_repeat, p=repeat_pool["weight"].to_numpy())
        chosen_pool_idx[:] = global_choice
        for i in np.where(want_same_unit)[0]:
            u = repeat_units[i]
            candidates = pool_by_unit.get(u)
            if candidates is not None and len(candidates):
                chosen_pool_idx[i] = candidates[rng.integers(len(candidates))]

        picked = repeat_pool.iloc[chosen_pool_idx]
        accused_name[is_repeat] = picked["name"].to_numpy()
        accused_gender[is_repeat] = picked["gender"].to_numpy()
        accused_age[is_repeat] = picked["age"].to_numpy() + rng.integers(0, 6, size=n_repeat)  # slight age drift across years
        pool_id_col = np.full(n, -1, dtype=int)
        pool_id_col[is_repeat] = repeat_pool.iloc[chosen_pool_idx]["pool_id"].to_numpy()
    else:
        pool_id_col = np.full(n, -1, dtype=int)

    # --- Unique (one-off) slots: fresh synthetic identity each ---------
    n_unique = n - n_repeat
    if n_unique:
        u_gender = rng.choice(["M", "F", "T"], size=n_unique, p=[0.87, 0.12, 0.01])
        u_name = synth_names(u_gender, male_first, female_first, last_names, rng)
        u_age = rng.integers(18, 65, size=n_unique)
        accused_name[~is_repeat] = u_name
        accused_gender[~is_repeat] = u_gender
        accused_age[~is_repeat] = u_age

    accused_df = pd.DataFrame({
        "CaseMasterID": case_idx,
        "AccusedName": accused_name,
        "AgeYear": accused_age,
        "GenderID": accused_gender,
        "IsRepeatOffender": is_repeat,
        "RepeatPoolID": pool_id_col,
    })
    accused_df["PersonID"] = "A" + (accused_df.groupby("CaseMasterID").cumcount() + 1).astype(str)
    accused_df.insert(0, "AccusedMasterID", range(1, len(accused_df) + 1))

    return accused_df[["AccusedMasterID", "CaseMasterID", "AccusedName", "AgeYear",
                        "GenderID", "PersonID", "IsRepeatOffender", "RepeatPoolID"]]


# ----------------------------------------------------------------------
# Victim table (from real Male/Female/Boy/Girl demographic totals)
# ----------------------------------------------------------------------
def build_victim(df, male_first, female_first, last_names):
    demo = df[["CaseMasterID", "Male", "Female", "Boy", "Girl"]].fillna(0)
    rows = []
    for col, gender, is_minor in [("Male", "M", False), ("Female", "F", False),
                                    ("Boy", "M", True), ("Girl", "F", True)]:
        counts = demo[col].astype(int).clip(lower=0)
        if counts.sum() == 0:
            continue
        case_idx = np.repeat(demo["CaseMasterID"].to_numpy(), counts.to_numpy())
        n = len(case_idx)
        age = rng.integers(1, 17, size=n) if is_minor else rng.integers(18, 80, size=n)
        genders = np.full(n, gender)
        rows.append(pd.DataFrame({"CaseMasterID": case_idx, "GenderID": genders, "AgeYear": age}))

    victim_df = pd.concat(rows, ignore_index=True)
    victim_df["VictimName"] = synth_names(victim_df["GenderID"].to_numpy(), male_first, female_first, last_names, rng)
    victim_df["VictimPolice"] = rng.choice([0, 1], size=len(victim_df), p=[0.995, 0.005])
    victim_df.insert(0, "VictimMasterID", range(1, len(victim_df) + 1))
    return victim_df[["VictimMasterID", "CaseMasterID", "VictimName", "AgeYear", "GenderID", "VictimPolice"]]


# ----------------------------------------------------------------------
# ComplainantDetails (one per FIR — no count signal in CSV)
# ----------------------------------------------------------------------
def build_complainant(df, caste_df, religion_df, occupation_df, male_first, female_first, last_names):
    n = len(df)
    genders = rng.choice(["M", "F"], size=n, p=[0.75, 0.25])
    names = synth_names(genders, male_first, female_first, last_names, rng)
    comp = pd.DataFrame({
        "CaseMasterID": df["CaseMasterID"].to_numpy(),
        "ComplainantName": names,
        "AgeYear": rng.integers(18, 75, size=n),
        "OccupationID": rng.choice(occupation_df["OccupationID"], size=n),
        "ReligionID": rng.choice(religion_df["ReligionID"], size=n, p=[0.79, 0.13, 0.02, 0.02, 0.02, 0.01, 0.005, 0.005]),
        "CasteID": rng.choice(caste_df["caste_master_id"], size=n),
        "GenderID": genders,
    })
    comp.insert(0, "ComplainantID", range(1, n + 1))
    return comp


# ----------------------------------------------------------------------
# ArrestSurrender (from real Arrested Male/Female/Count aggregates,
# linked back to Accused rows generated for that case)
# ----------------------------------------------------------------------
def build_arrest_surrender(df, accused_df, case_master_df, unit_district_map):
    arrest_counts = df.set_index("CaseMasterID")["Arrested Count\tNo."].fillna(0).astype(int).clip(lower=0)
    arrest_counts = arrest_counts[arrest_counts > 0]
    if len(arrest_counts) == 0:
        return pd.DataFrame(columns=[
            "ArrestSurrenderID", "CaseMasterID", "ArrestSurrenderTypeID", "ArrestSurrenderDate",
            "ArrestSurrenderStateId", "ArrestSurrenderDistrictId", "PoliceStationID", "IOID",
            "CourtID", "AccusedMasterID", "IsAccused", "IsComplainantAccused",
        ])

    # Sample up to N accused per case (without exceeding how many accused exist for that case)
    accused_by_case = accused_df.groupby("CaseMasterID")["AccusedMasterID"].apply(list)
    rows = []
    for case_id, n_arrest in arrest_counts.items():
        pool = accused_by_case.get(case_id, [])
        if not pool:
            continue
        k = min(n_arrest, len(pool))
        chosen = rng.choice(pool, size=k, replace=False)
        for a in chosen:
            rows.append((case_id, a))

    ars = pd.DataFrame(rows, columns=["CaseMasterID", "AccusedMasterID"])
    ars = ars.merge(
        case_master_df[["CaseMasterID", "PoliceStationID", "CourtID", "PolicePersonID", "CrimeRegisteredDate"]],
        on="CaseMasterID", how="left"
    )
    n = len(ars)
    ars["ArrestSurrenderTypeID"] = rng.choice([1, 2], size=n, p=[0.88, 0.12])  # 1=Arrest, 2=Surrender
    ars["ArrestSurrenderDate"] = ars["CrimeRegisteredDate"] + pd.to_timedelta(rng.integers(0, 30, size=n), unit="D")
    ars["ArrestSurrenderStateId"] = 1
    ars["ArrestSurrenderDistrictId"] = ars["PoliceStationID"].map(unit_district_map)
    ars["IOID"] = ars["PolicePersonID"]
    ars["IsAccused"] = 1
    ars["IsComplainantAccused"] = rng.choice([0, 1], size=n, p=[0.98, 0.02])
    ars.insert(0, "ArrestSurrenderID", range(1, n + 1))

    return ars[["ArrestSurrenderID", "CaseMasterID", "ArrestSurrenderTypeID", "ArrestSurrenderDate",
                "ArrestSurrenderStateId", "ArrestSurrenderDistrictId", "PoliceStationID", "IOID",
                "CourtID", "AccusedMasterID", "IsAccused", "IsComplainantAccused"]]


# ----------------------------------------------------------------------
# ChargesheetDetails (from real Accused_ChargeSheeted Count / FIR_Stage)
# ----------------------------------------------------------------------
def build_chargesheet(df, case_master_df):
    cs = df[["CaseMasterID", "Accused_ChargeSheeted Count", "FIR_Stage"]].copy()
    cs = cs[cs["Accused_ChargeSheeted Count"].fillna(0) > 0]

    def stage_to_type(stage):
        s = str(stage).upper()
        if "FALSE CASE" in s:
            return "B"
        if "UNDETECTED" in s or "UN TRACED" in s or "UNTRACED" in s:
            return "C"
        return "A"

    cs["cstype"] = cs["FIR_Stage"].apply(stage_to_type)
    cs = cs.merge(case_master_df[["CaseMasterID", "CrimeRegisteredDate", "PolicePersonID"]], on="CaseMasterID", how="left")
    n = len(cs)
    cs["csdate"] = cs["CrimeRegisteredDate"] + pd.to_timedelta(rng.integers(15, 120, size=n), unit="D")
    cs.insert(0, "CSID", range(1, n + 1))
    return cs.rename(columns={"PolicePersonID": "PolicePersonID"})[["CSID", "CaseMasterID", "csdate", "cstype", "PolicePersonID"]]


# ----------------------------------------------------------------------
def main():
    con = duckdb.connect(DB_PATH)
    df = pd.read_parquet(FIR_PARQUET)
    case_master_df = con.execute("SELECT * FROM CaseMaster").fetchdf()
    crime_head_df = con.execute("SELECT CrimeHeadID, CrimeGroupName FROM CrimeHead").fetchdf()
    unit_df = con.execute("SELECT UnitID FROM Unit").fetchdf()
    caste_df = con.execute("SELECT caste_master_id FROM CasteMaster").fetchdf()
    religion_df = con.execute("SELECT ReligionID FROM ReligionMaster").fetchdf()
    occupation_df = con.execute("SELECT OccupationID FROM OccupationMaster").fetchdf()

    print("Building name pools...")
    male_first, female_first, last_names = build_name_pools()

    print("Building repeat-offender pool...")
    repeat_pool = build_repeat_offender_pool(case_master_df, crime_head_df, unit_df, male_first, female_first, last_names)

    print("Building Accused...")
    accused_df = build_accused(case_master_df.merge(df[["CaseMasterID", "Accused Count"]], on="CaseMasterID"),
                                crime_head_df, unit_df, repeat_pool, male_first, female_first, last_names)

    print("Building Victim...")
    victim_df = build_victim(df, male_first, female_first, last_names)

    print("Building ComplainantDetails...")
    complainant_df = build_complainant(df, caste_df, religion_df, occupation_df, male_first, female_first, last_names)

    print("Building ArrestSurrender...")
    unit_district_df = con.execute("SELECT UnitID, DistrictID FROM Unit").fetchdf()
    unit_district_map = dict(zip(unit_district_df["UnitID"], unit_district_df["DistrictID"]))
    arrest_df = build_arrest_surrender(df, accused_df, case_master_df, unit_district_map)

    print("Building ChargesheetDetails...")
    chargesheet_df = build_chargesheet(df, case_master_df)

    tables = {
        "Accused": accused_df, "Victim": victim_df, "ComplainantDetails": complainant_df,
        "ArrestSurrender": arrest_df, "ChargesheetDetails": chargesheet_df,
    }
    for name, tdf in tables.items():
        con.execute(f'CREATE OR REPLACE TABLE "{name}" AS SELECT * FROM tdf')
        print(f"  {name:<24} {len(tdf):>10,} rows")

    # Sanity: repeat-offender identities that actually span >1 CaseMasterID
    multi_case = (accused_df[accused_df["IsRepeatOffender"]]
                  .groupby("RepeatPoolID")["CaseMasterID"].nunique())
    print(f"\nRepeat-offender identities spanning 2+ FIRs: {(multi_case > 1).sum():,} / {multi_case.shape[0]:,} used identities")
    print(f"Overall repeat-offender share of Accused rows: {accused_df['IsRepeatOffender'].mean():.1%}")

    con.close()
    print(f"\nSaved -> {DB_PATH}")


if __name__ == "__main__":
    main()
