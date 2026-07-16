"""
STEP 7 — Regression Test Suite
==================================
Run this after Steps 1-6 complete. It's every check that was done by
hand during development (referential integrity, held-out scoring
sanity, the noise-floor artifact, the District-column gap, the
confidence chain) turned into something you re-run automatically
instead of re-deriving manually every time the pipeline changes.

Does NOT require GROQ_API_KEY — the SQL validator/executor/schema
checks run standalone. Only actual LLM calls (router/generator/
explainer) are untestable offline; run step5's __main__ block
separately with a real key for that.

Usage: python step7_test_suite.py
Exit code 0 = all pass, 1 = at least one failure.
"""
import os
import sys
import duckdb
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
PASS, FAIL = [], []


def check(name, condition, detail=""):
    if condition:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append(name)
        print(f"  FAIL  {name}  {detail}")


# ======================================================================
# 1. Core pipeline integrity (Steps 1-3)
# ======================================================================
def test_pipeline_integrity(con):
    print("\n[1] Pipeline integrity (Steps 1-3)")

    n = con.execute("SELECT COUNT(*) FROM CaseMaster").fetchone()[0]
    check("CaseMaster row count == 1,674,734", n == 1_674_734, f"got {n:,}")

    dupes = con.execute("SELECT COUNT(*) FROM (SELECT CrimeNo FROM CaseMaster GROUP BY CrimeNo HAVING COUNT(*)>1)").fetchone()[0]
    check("CrimeNo has zero duplicates", dupes == 0, f"got {dupes} dupes")

    orphan_checks = [
        ("CaseMaster.PoliceStationID -> Unit", "CaseMaster c LEFT JOIN Unit u ON c.PoliceStationID=u.UnitID WHERE u.UnitID IS NULL"),
        ("CaseMaster.CrimeMajorHeadID -> CrimeHead", "CaseMaster c LEFT JOIN CrimeHead h ON c.CrimeMajorHeadID=h.CrimeHeadID WHERE h.CrimeHeadID IS NULL"),
        ("Accused.CaseMasterID -> CaseMaster", "Accused a LEFT JOIN CaseMaster c ON a.CaseMasterID=c.CaseMasterID WHERE c.CaseMasterID IS NULL"),
        ("ArrestSurrender.AccusedMasterID -> Accused", "ArrestSurrender ar LEFT JOIN Accused a ON ar.AccusedMasterID=a.AccusedMasterID WHERE a.AccusedMasterID IS NULL"),
    ]
    for label, q in orphan_checks:
        orphans = con.execute(f"SELECT COUNT(*) FROM {q}").fetchone()[0]
        check(f"No orphans: {label}", orphans == 0, f"got {orphans} orphans")

    repeat_rate = con.execute("SELECT AVG(CASE WHEN IsRepeatOffender THEN 1.0 ELSE 0 END) FROM Accused").fetchone()[0]
    check("Repeat-offender rate in [0.13, 0.17] (target 15%)", 0.13 <= repeat_rate <= 0.17, f"got {repeat_rate:.1%}")

    multi_fir = con.execute("""
        SELECT COUNT(*) FROM (
            SELECT RepeatPoolID FROM Accused WHERE IsRepeatOffender = true
            GROUP BY RepeatPoolID HAVING COUNT(DISTINCT CaseMasterID) > 1
        )
    """).fetchone()[0]
    check("Repeat identities spanning 2+ FIRs exist", multi_fir > 1000, f"got {multi_fir:,}")


# ======================================================================
# 2. Two-aggregate split (Step 4)
# ======================================================================
def test_two_aggregate_split(con):
    print("\n[2] Two-aggregate geo split (Step 4)")

    has_wide = con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='fact_crime_agg'").fetchone()[0]
    has_geo = con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='fact_crime_geo'").fetchone()[0]
    check("fact_crime_agg table exists", has_wide > 0)
    check("fact_crime_geo table exists", has_geo > 0)
    if not (has_wide and has_geo):
        return

    n_agg = con.execute("SELECT COUNT(*) FROM fact_crime_agg").fetchone()[0]
    n_geo = con.execute("SELECT COUNT(*) FROM fact_crime_geo").fetchone()[0]
    check("fact_crime_geo has fewer groups than fact_crime_agg (imputed rows excluded)", n_geo < n_agg,
          f"agg={n_agg:,} geo={n_geo:,}")

    has_confidence_col = "RealCoordCaseCount" in con.execute("DESCRIBE fact_crime_geo").fetchdf()["column_name"].tolist()
    check("fact_crime_geo has RealCoordCaseCount column", has_confidence_col)


# ======================================================================
# 3. Trend forecasting (Step 6)
# ======================================================================
def test_trend_forecasting(con):
    print("\n[3] Trend forecasting (Step 6)")

    exists = con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='trend_forecast'").fetchone()[0]
    check("trend_forecast table exists", exists > 0)
    if not exists:
        return

    fc = con.execute("SELECT * FROM trend_forecast").fetchdf()
    check("trend_forecast has rows", len(fc) > 0, f"got {len(fc)}")
    check("BestModel only contains known model names",
          set(fc["BestModel"].unique()) <= {"Naive", "SARIMA", "HoltWinters", "XGBoost"},
          f"got {set(fc['BestModel'].unique())}")
    check("Naive baseline wins at least once (proves the gate isn't a no-op)",
          (fc["BestModel"] == "Naive").sum() >= 1)
    check("Not every series picks the same model (proves per-series selection, not a fixed default)",
          fc["BestModel"].nunique() > 1)
    check("LowConfidence_ReviewFlag column present", "LowConfidence_ReviewFlag" in fc.columns)
    check("Forecasts are non-negative", (fc["NextMonthForecast"] >= 0).all())

    bench = con.execute("SELECT * FROM trend_model_benchmark").fetchdf()
    check("trend_model_benchmark includes Naive rows", "Naive" in bench["Model"].unique())
    # sanity: for every series, the model picked in trend_forecast should be
    # at or below the Naive MAE in trend_model_benchmark (the gate's own rule)
    mismatches = 0
    for _, row in fc.iterrows():
        if row["BestModel"] == "Naive":
            continue
        sub = bench[(bench.District == row["District"]) & (bench.CrimeGroup == row["CrimeGroup"])]
        naive_mae = sub[sub.Model == "Naive"]["MAE"].values
        picked_mae = sub[sub.Model == row["BestModel"]]["MAE"].values
        if len(naive_mae) and len(picked_mae) and picked_mae[0] >= naive_mae[0]:
            mismatches += 1
    check("Every non-Naive winner actually beats Naive's MAE in the benchmark table", mismatches == 0,
          f"{mismatches} series violate this")


# ======================================================================
# 4. Hotspot detection (Step 6) — including the noise-floor artifact check
# ======================================================================
def test_hotspot_detection(con):
    print("\n[4] Hotspot detection (Step 6)")

    for t in ["hotspot_model_benchmark", "hotspot_clusters", "hotspot_summary"]:
        exists = con.execute(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name='{t}'").fetchone()[0]
        check(f"{t} table exists", exists > 0)

    bench = con.execute("SELECT * FROM hotspot_model_benchmark").fetchdf()
    check("hotspot_model_benchmark covers 3 models", set(bench["Model"].unique()) == {"DBSCAN", "HDBSCAN", "KMeans"})

    # The specific artifact caught during development: a model should never
    # be selected purely because it discarded most data as noise. Check that
    # for every district, IF the winner's raw silhouette is not the max in
    # that district, its noise ratio must be lower than whichever model DID
    # have the max raw silhouette (i.e. it won via the floor, not by cheating).
    clusters_exist = con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='hotspot_clusters'").fetchone()[0]
    if clusters_exist:
        winners = con.execute("SELECT DISTINCT District, Model FROM hotspot_clusters").fetchdf()
        for _, row in winners.iterrows():
            district_bench = bench[bench.District == row["District"]]
            max_sil_model = district_bench.loc[district_bench["SilhouetteScore"].idxmax(), "Model"]
            winner_row = district_bench[district_bench.Model == row["Model"]].iloc[0]
            if row["Model"] != max_sil_model:
                loser_row = district_bench[district_bench.Model == max_sil_model].iloc[0]
                check(f"Floor-driven win in {row['District']} is justified by lower noise (not just arbitrary)",
                      winner_row["NoiseRatio"] < loser_row["NoiseRatio"],
                      f"winner={row['Model']} noise={winner_row['NoiseRatio']}, "
                      f"higher-silhouette-loser={max_sil_model} noise={loser_row['NoiseRatio']}")

    # District column presence (the specific gap found during review)
    hc_cols = con.execute("DESCRIBE hotspot_clusters").fetchdf()["column_name"].tolist()
    check("hotspot_clusters has a District column", "District" in hc_cols)

    # Confidence chain: hotspot_summary must carry RealCoordCaseCount + flag
    hs_cols = con.execute("DESCRIBE hotspot_summary").fetchdf()["column_name"].tolist()
    check("hotspot_summary has RealCoordCaseCount", "RealCoordCaseCount" in hs_cols)
    check("hotspot_summary has LowConfidence_ReviewFlag", "LowConfidence_ReviewFlag" in hs_cols)

    summary = con.execute("SELECT * FROM hotspot_summary").fetchdf()
    check("hotspot_summary LowConfidence_ReviewFlag correctly matches count<30 rule",
          (summary["LowConfidence_ReviewFlag"] == (summary["RealCoordCaseCount"] < 30)).all())
    check("No cluster in hotspot_summary has zero supporting cases (would indicate a broken join)",
          (summary["RealCoordCaseCount"] > 0).all())

    # Structural guarantee: every point in hotspot_clusters must be real-coordinate
    geo_flag_exists = con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='GeoImputationFlag'").fetchone()[0]
    if geo_flag_exists and clusters_exist:
        leaked_imputed = con.execute("""
            SELECT COUNT(*) FROM hotspot_clusters hc
            JOIN GeoImputationFlag g ON hc.CaseMasterID = g.CaseMasterID
            WHERE g.Lat_Imputed = true
        """).fetchone()[0]
        check("No imputed-coordinate points leaked into hotspot_clusters", leaked_imputed == 0, f"got {leaked_imputed}")


# ======================================================================
# 5. NL2SQL agent — offline-testable parts (validator, schema, executor)
# ======================================================================
def test_nl2sql_agent_offline(con):
    print("\n[5] NL2SQL agent (offline-testable parts only — no API key needed)")
    import step5_nl2sql_agent as agent  # already imported/configured in __main__

    schema_ctx = agent.get_schema_context(con)
    for t in ["trend_forecast", "hotspot_summary", "hotspot_clusters", "fact_crime_geo"]:
        check(f"Schema context includes {t}", t in schema_ctx)

    # Regression checks for the systematic 5/7 live-test failure found on
    # 2026-07 (Bengaluru vs 'Bengaluru City', UnitName-as-district bug,
    # cstype 'Chargesheet' vs 'A'). These don't prove the LLM will get it
    # right, but they prove the glossary text it's grounded on is present.
    check("Glossary contains the exact district name enum", "'Bengaluru City'" in agent.BUSINESS_GLOSSARY
          and "'Belagavi Dist'" in agent.BUSINESS_GLOSSARY)
    check("Glossary warns against Unit.UnitName as a district filter", "UnitName = 'Bengaluru City'" in agent.BUSINESS_GLOSSARY)
    check("Glossary documents cstype A/B/C codes", "'A' = Chargesheet" in agent.BUSINESS_GLOSSARY)

    # Confirm the actual DB values match what the glossary claims, so the
    # glossary itself can't silently drift out of sync with the data.
    real_districts = set(con.execute("SELECT DISTINCT DistrictName FROM District").fetchdf()["DistrictName"])
    glossary_districts = {d for d in real_districts if f"'{d}'" in agent.BUSINESS_GLOSSARY}
    check("Every real DistrictName value is present in the glossary enum",
          glossary_districts == real_districts, f"missing: {real_districts - glossary_districts}")

    real_cstypes = set(con.execute("SELECT DISTINCT cstype FROM ChargesheetDetails").fetchdf()["cstype"])
    check("Glossary's cstype codes match the real column values",
          real_cstypes == {"A", "B", "C"}, f"got {real_cstypes}")

    # Regression checks for round-2 live-test failures: CrimeGroup casing
    # (trend_forecast.CrimeGroup is ALL CAPS, e.g. 'THEFT'), ambiguous
    # CaseMasterID across joins, and the hotspot winner-inference bug
    # (Belagavi Dist: naive ORDER BY SilhouetteScore picks DBSCAN, which is
    # wrong — the real winner, HDBSCAN, only wins after the noise floor).
    check("Glossary generalizes case-insensitive matching beyond CrimeHeadName",
          "trend_forecast's" in agent.BUSINESS_GLOSSARY and "ALL CAPS" in agent.BUSINESS_GLOSSARY)
    check("Glossary warns about join column qualification", "Ambiguous reference" in agent.BUSINESS_GLOSSARY)
    check("Glossary points at IsSelectedModel, not ORDER BY silhouette",
          "IsSelectedModel" in agent.BUSINESS_GLOSSARY)

    hmb_cols = con.execute("DESCRIBE hotspot_model_benchmark").fetchdf()["column_name"].tolist()
    check("hotspot_model_benchmark has IsSelectedModel column", "IsSelectedModel" in hmb_cols)
    if "IsSelectedModel" in hmb_cols:
        per_district_winners = con.execute(
            "SELECT District, COUNT(*) as n FROM hotspot_model_benchmark WHERE IsSelectedModel GROUP BY District"
        ).fetchdf()
        check("Every district has exactly one IsSelectedModel=true row",
              (per_district_winners["n"] == 1).all(), f"got {per_district_winners.to_dict('records')}")

        # The specific case that broke live: does IsSelectedModel actually
        # match what hotspot_clusters really used?
        mismatch = con.execute("""
            SELECT b.District FROM hotspot_model_benchmark b
            JOIN hotspot_clusters hc ON b.District = hc.District AND b.Model = hc.Model
            WHERE b.IsSelectedModel = false
        """).fetchdf()
        check("IsSelectedModel agrees with the model actually used in hotspot_clusters",
              len(mismatch) == 0, f"disagreements: {mismatch['District'].tolist() if len(mismatch) else []}")

    # Case-sensitivity check: would a naive lowercase LIKE actually match
    # the real stored CrimeGroup casing without LOWER()?
    naive_match = con.execute("SELECT COUNT(*) FROM trend_forecast WHERE CrimeGroup LIKE '%theft%'").fetchone()[0]
    correct_match = con.execute("SELECT COUNT(*) FROM trend_forecast WHERE LOWER(CrimeGroup) LIKE '%theft%'").fetchone()[0]
    check("Confirms case-sensitivity trap exists (documents WHY the glossary rule matters)",
          naive_match == 0 and correct_match > 0,
          f"naive(no LOWER)={naive_match}, correct(LOWER)={correct_match} — if naive>0 the trap may no longer apply")

    validator_cases = [
        ("SELECT * FROM CaseMaster LIMIT 5", True),
        ("DROP TABLE CaseMaster", False),
        ("SELECT * FROM CaseMaster; DROP TABLE Accused", False),
        ("SELECT * FROM some_fake_table", False),
        ("SELECT DistrictName, COUNT(*) FROM fact_crime_agg GROUP BY DistrictName", True),
        ("DELETE FROM Accused WHERE 1=1", False),
        ("SELECT District, TrendDirection FROM trend_forecast", True),
        ("SELECT District, RealCoordCaseCount FROM hotspot_summary WHERE LowConfidence_ReviewFlag = false", True),
        ("SELECT EXTRACT(YEAR FROM cm.CrimeRegisteredDate) FROM CaseMaster cm", True),  # the alias-parsing bug found earlier
        ("SELECT EXTRACT(YEAR FROM x) FROM some_fake_table", False),  # adversarial: real unwhitelisted table must still be caught
        ("SELECT TRIM(BOTH ' ' FROM DistrictName) FROM District", True),  # another FROM-as-keyword function
    ]
    for sql, expect_ok in validator_cases:
        ok, reason = agent.validate_sql(sql)
        check(f"Validator: [{sql[:55]}...] -> expected {expect_ok}", ok == expect_ok, f"got ok={ok} ({reason})")

    exec_cases = [
        "SELECT District, RealCoordCaseCount, LowConfidence_ReviewFlag FROM hotspot_summary LIMIT 5",
        "SELECT District, CrimeGroup, TrendDirection, NextMonthForecast FROM trend_forecast LIMIT 5",
    ]
    for sql in exec_cases:
        df, err = agent.execute_sql(con, sql)
        check(f"Executor runs: [{sql[:55]}...]", err is None, f"error: {err}")


# ======================================================================
if __name__ == "__main__":
    con = duckdb.connect(DB_PATH)

    # fact_crime_agg / fact_crime_geo are created from CSV by
    # step5_nl2sql_agent.load_fact_tables(), not persisted directly by
    # Step 4 — load them here, once, up front, so every section below can
    # rely on them existing (this was previously only called inside
    # test_nl2sql_agent_offline(), which ran LAST — sections [2]-[4] were
    # checking for tables that hadn't been created yet).
    import os
    os.environ.setdefault("GROQ_API_KEY", "dummy_key_for_offline_testing")
    sys.path.insert(0, "/home/claude/work/pipeline")
    import step5_nl2sql_agent as agent
    agent.load_fact_tables(con)

    test_pipeline_integrity(con)
    test_two_aggregate_split(con)
    test_trend_forecasting(con)
    test_hotspot_detection(con)
    test_nl2sql_agent_offline(con)

    con.close()

    print(f"\n{'='*60}\n{len(PASS)} passed, {len(FAIL)} failed\n{'='*60}")
    if FAIL:
        print("FAILED CHECKS:")
        for f in FAIL:
            print(f"  - {f}")
        sys.exit(1)
    sys.exit(0)
