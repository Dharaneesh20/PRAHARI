"""
STEP 4 — AI Feature Engineering & Dashboard Flattening
==========================================================
Three independent deliverables:

  1. Wide table: a full 1.67M-row flattened join (materialized in
     DuckDB, for anything that needs case-level drill-down) PLUS TWO
     dashboard-sized aggregates (District x Unit x CrimeHead x Year x
     Gravity):
       - dashboard_wide_aggregated.csv   : all rows, for case/accused/
         victim/arrest/chargesheet counts (coordinate provenance doesn't
         matter for these)
       - dashboard_geo_real_only.csv     : same group-by, but restricted
         to rows with real (non-imputed) coordinates, for anything that
         plots a location. Carries RealCoordCaseCount alongside the
         group's full CaseCount so a dashboard/NL2SQL layer can show
         "hotspot based on N of M reported cases" and suppress groups
         with too few real-coordinate points instead of plotting a
         misleading single-point average from mostly-imputed data.

  2. NetworkX co-accused subgraph builder, scoped per-district or
     per-unit (a statewide graph over ~3M accused rows is impractical
     to render live in a demo).

  3. DBSCAN hotspot detection over the Step-1 latitude/longitude,
     using haversine distance so `eps` is a real distance in meters
     rather than an abstract degree value.
"""

import os
import duckdb
import numpy as np
import pandas as pd
import networkx as nx
from sklearn.cluster import DBSCAN

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
WIDE_AGG_OUT = os.path.join(BASE_DIR, "outputs", "dashboard_wide_aggregated.parquet")
WIDE_AGG_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_wide_aggregated.csv")
GEO_REAL_ONLY_OUT = os.path.join(BASE_DIR, "outputs", "dashboard_geo_real_only.parquet")
GEO_REAL_ONLY_CSV = os.path.join(BASE_DIR, "outputs", "dashboard_geo_real_only.csv")

os.makedirs(os.path.dirname(WIDE_AGG_OUT), exist_ok=True)


# ======================================================================
# 1. Wide table
# ======================================================================
WIDE_TABLE_SQL = """
CREATE OR REPLACE TABLE CaseMaster_Wide AS
SELECT
    cm.CaseMasterID, cm.CrimeNo, cm.CaseNo, cm.CrimeRegisteredDate,
    YEAR(cm.CrimeRegisteredDate) AS CrimeYear,
    d.DistrictName, u.UnitName, ut.UnitTypeName,
    ch.CrimeGroupName, csh.CrimeHeadName AS CrimeSubHeadName,
    gr.LookupValue AS Gravity, cs.CaseStatusName, cc.LookupValue AS CaseCategory,
    ct.CourtName, e.KGID AS InvestigatingOfficerKGID, e.FirstName AS InvestigatingOfficerFirstName,
    cm.Latitude, cm.Longitude, g.Lat_Imputed,
    COALESCE(acc.n_accused, 0)   AS AccusedCount,
    COALESCE(acc.n_repeat, 0)    AS RepeatOffenderCount,
    COALESCE(vic.n_victim, 0)    AS VictimCount,
    COALESCE(arr.n_arrest, 0)    AS ArrestedCount,
    COALESCE(chg.n_chargesheet, 0) AS ChargesheetedCount
FROM CaseMaster cm
LEFT JOIN Unit u          ON cm.PoliceStationID = u.UnitID
LEFT JOIN UnitType ut     ON u.TypeID = ut.UnitTypeID
LEFT JOIN District d      ON u.DistrictID = d.DistrictID
LEFT JOIN CrimeHead ch    ON cm.CrimeMajorHeadID = ch.CrimeHeadID
LEFT JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID
LEFT JOIN GravityOffence gr ON cm.GravityOffenceID = gr.GravityOffenceID
LEFT JOIN CaseStatusMaster cs ON cm.CaseStatusID = cs.CaseStatusID
LEFT JOIN CaseCategory cc ON cm.CaseCategoryID = cc.CaseCategoryID
LEFT JOIN Court ct        ON cm.CourtID = ct.CourtID
LEFT JOIN Employee e      ON cm.PolicePersonID = e.EmployeeID
LEFT JOIN GeoImputationFlag g ON cm.CaseMasterID = g.CaseMasterID
LEFT JOIN (SELECT CaseMasterID, COUNT(*) n_accused, SUM(CASE WHEN IsRepeatOffender THEN 1 ELSE 0 END) n_repeat
           FROM Accused GROUP BY CaseMasterID) acc ON cm.CaseMasterID = acc.CaseMasterID
LEFT JOIN (SELECT CaseMasterID, COUNT(*) n_victim FROM Victim GROUP BY CaseMasterID) vic
           ON cm.CaseMasterID = vic.CaseMasterID
LEFT JOIN (SELECT CaseMasterID, COUNT(*) n_arrest FROM ArrestSurrender GROUP BY CaseMasterID) arr
           ON cm.CaseMasterID = arr.CaseMasterID
LEFT JOIN (SELECT CaseMasterID, COUNT(*) n_chargesheet FROM ChargesheetDetails GROUP BY CaseMasterID) chg
           ON cm.CaseMasterID = chg.CaseMasterID
"""

AGGREGATE_SQL = """
SELECT
    DistrictName, UnitName, CrimeGroupName, CrimeYear, Gravity,
    COUNT(*) AS CaseCount,
    SUM(AccusedCount) AS TotalAccused,
    SUM(RepeatOffenderCount) AS TotalRepeatOffenders,
    SUM(VictimCount) AS TotalVictims,
    SUM(ArrestedCount) AS TotalArrests,
    SUM(ChargesheetedCount) AS TotalChargesheeted
FROM CaseMaster_Wide
GROUP BY DistrictName, UnitName, CrimeGroupName, CrimeYear, Gravity
"""

# Same group-by, restricted to real (non-imputed) coordinates only, with
# RealCoordCaseCount alongside so a dashboard can show provenance and
# gray out/suppress low-confidence groups (e.g. RealCoordCaseCount < 5).
GEO_REAL_ONLY_SQL = """
SELECT
    DistrictName, UnitName, CrimeGroupName, CrimeYear, Gravity,
    COUNT(*) AS RealCoordCaseCount,
    AVG(Latitude) AS AvgLatitude, AVG(Longitude) AS AvgLongitude
FROM CaseMaster_Wide
WHERE Lat_Imputed = false AND Longitude IS NOT NULL
GROUP BY DistrictName, UnitName, CrimeGroupName, CrimeYear, Gravity
"""


def build_wide_table(con):
    print("Building full wide table (materialized in DuckDB as CaseMaster_Wide)...")
    con.execute(WIDE_TABLE_SQL)
    n = con.execute("SELECT COUNT(*) FROM CaseMaster_Wide").fetchone()[0]
    print(f"  CaseMaster_Wide: {n:,} rows")

    print("Building dashboard-sized aggregate (District x Unit x CrimeHead x Year x Gravity)...")
    agg_df = con.execute(AGGREGATE_SQL).fetchdf()
    agg_df.to_parquet(WIDE_AGG_OUT, index=False)
    agg_df.to_csv(WIDE_AGG_CSV, index=False)
    print(f"  Aggregate (all cases): {len(agg_df):,} rows -> {WIDE_AGG_OUT} / {WIDE_AGG_CSV}")

    print("Building geo-real-only aggregate (real coordinates only)...")
    geo_df = con.execute(GEO_REAL_ONLY_SQL).fetchdf()
    geo_df.to_parquet(GEO_REAL_ONLY_OUT, index=False)
    geo_df.to_csv(GEO_REAL_ONLY_CSV, index=False)
    print(f"  Aggregate (real coords only): {len(geo_df):,} rows -> {GEO_REAL_ONLY_OUT} / {GEO_REAL_ONLY_CSV}")
    low_confidence = (geo_df["RealCoordCaseCount"] < 5).sum()
    print(f"  Groups with <5 real-coordinate cases (should be suppressed/grayed in dashboard): {low_confidence:,} / {len(geo_df):,}")

    return agg_df, geo_df


# ======================================================================
# 2. NetworkX co-accused subgraph (scoped per-district or per-unit)
# ======================================================================
def build_coaccused_subgraph(con, scope_type: str = "district", scope_value: str = "Bengaluru City") -> nx.Graph:
    """
    Builds a co-accused graph for ONE district or unit: nodes are accused
    individuals (repeat offenders keep a stable RepeatPoolID so the same
    person is one node across all their FIRs); edges connect accused who
    appeared together in the same CaseMasterID, weighted by how many
    cases they share. This is the raw structure for spotting syndicates
    (dense clusters / high-degree hub nodes).
    """
    if scope_type == "district":
        where = "d.DistrictName = ?"
    elif scope_type == "unit":
        where = "u.UnitName = ?"
    else:
        raise ValueError("scope_type must be 'district' or 'unit'")

    q = f"""
    SELECT a.CaseMasterID, a.AccusedMasterID, a.AccusedName, a.IsRepeatOffender, a.RepeatPoolID
    FROM Accused a
    JOIN CaseMaster cm ON a.CaseMasterID = cm.CaseMasterID
    JOIN Unit u ON cm.PoliceStationID = u.UnitID
    JOIN District d ON u.DistrictID = d.DistrictID
    WHERE {where}
    """
    rows = con.execute(q, [scope_value]).fetchdf()
    print(f"  Scope '{scope_value}': {len(rows):,} accused rows across {rows['CaseMasterID'].nunique():,} FIRs")

    # Stable node key: repeat offenders collapse to one node (RepeatPoolID);
    # one-off accused get their own node (AccusedMasterID).
    rows["node_key"] = np.where(
        rows["IsRepeatOffender"],
        "R" + rows["RepeatPoolID"].astype(str),
        "A" + rows["AccusedMasterID"].astype(str),
    )

    G = nx.Graph()
    for key, name, is_repeat in rows[["node_key", "AccusedName", "IsRepeatOffender"]].drop_duplicates("node_key").itertuples(index=False):
        G.add_node(key, name=name, is_repeat_offender=bool(is_repeat))

    for case_id, group in rows.groupby("CaseMasterID"):
        keys = group["node_key"].unique()
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                a, b = keys[i], keys[j]
                if G.has_edge(a, b):
                    G[a][b]["weight"] += 1
                    G[a][b]["shared_cases"] += f",{case_id}"
                else:
                    G.add_edge(a, b, weight=1, shared_cases=str(case_id))

    print(f"  Graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges")
    return G


def summarize_syndicates(G: nx.Graph, top_n: int = 5):
    """Quick read on the graph: connected components ranked by size, and
    the highest-degree ('most connected') hub nodes within the largest one."""
    components = sorted(nx.connected_components(G), key=len, reverse=True)
    print(f"  Connected components: {len(components)} (largest = {len(components[0]) if components else 0} people)")
    if components:
        largest = G.subgraph(components[0])
        top_hubs = sorted(largest.degree, key=lambda x: x[1], reverse=True)[:top_n]
        print("  Top hub nodes in the largest cluster (possible syndicate ringleaders):")
        for node, deg in top_hubs:
            print(f"    {G.nodes[node]['name']:<25} degree={deg}  repeat_offender={G.nodes[node]['is_repeat_offender']}")
    return components


# ======================================================================
# 3. DBSCAN hotspot detection (haversine distance -> real meters for eps)
# ======================================================================
def run_dbscan_hotspots(con, eps_meters: float = 200.0, min_samples: int = 25,
                         scope_district: str = None, max_points: int = 150_000, seed: int = 42,
                         real_coords_only: bool = True):
    """
    Clusters FIR locations into hotspots. Uses haversine metric so `eps`
    is an actual physical distance (meters), not an abstract lat/long
    delta that means different things at different latitudes.

    Data-quality guards:
      - ~20,789 statewide rows have Latitude/Longitude visibly swapped
        or otherwise outside Karnataka's bounding box (11-19N, 73-79E)
        in the SOURCE csv (not something Step 1 introduced) — these are
        dropped before clustering.
      - real_coords_only=True (default) excludes rows Step 1 imputed.
        IMPORTANT: Step 1 jitters every imputed point around ONE shared
        district centroid, so in compact districts those points cluster
        artificially near the city center — DBSCAN would report that as
        a dominant "hotspot" that's actually a geo-imputation artifact,
        not a real crime pattern. Set this False only to visualize
        imputation coverage itself, not for genuine hotspot analysis.
      - Dense districts can have tens of thousands of cases sharing the
        exact same real station coordinate, which blows up ball-tree
        memory on large point counts; if the scoped point count exceeds
        `max_points` we take a random sample.
    """
    KARNATAKA_LAT = (11.0, 19.0)
    KARNATAKA_LON = (73.0, 79.0)

    imputed_filter = "AND g.Lat_Imputed = false" if real_coords_only else ""
    join_flag = "JOIN GeoImputationFlag g ON cm.CaseMasterID = g.CaseMasterID"

    if scope_district:
        q = f"""
        SELECT cm.CaseMasterID, cm.Latitude, cm.Longitude
        FROM CaseMaster cm
        JOIN Unit u ON cm.PoliceStationID = u.UnitID
        JOIN District d ON u.DistrictID = d.DistrictID
        {join_flag}
        WHERE d.DistrictName = ? AND cm.Latitude BETWEEN ? AND ? AND cm.Longitude BETWEEN ? AND ?
        {imputed_filter}
        """
        params = [scope_district, *KARNATAKA_LAT, *KARNATAKA_LON]
    else:
        q = f"""
        SELECT cm.CaseMasterID, cm.Latitude, cm.Longitude
        FROM CaseMaster cm
        {join_flag}
        WHERE cm.Latitude BETWEEN ? AND ? AND cm.Longitude BETWEEN ? AND ?
        {imputed_filter}
        """
        params = [*KARNATAKA_LAT, *KARNATAKA_LON]

    df = con.execute(q, params).fetchdf()

    if len(df) > max_points:
        print(f"  {len(df):,} points exceeds max_points={max_points:,} (memory-safe cap in this sandbox) "
              f"-> random sampling down to {max_points:,} for hotspot detection.")
        df = df.sample(n=max_points, random_state=seed).reset_index(drop=True)

    print(f"  Running DBSCAN on {len(df):,} points (eps={eps_meters}m, min_samples={min_samples}, "
          f"real_coords_only={real_coords_only})...")

    coords_rad = np.radians(df[["Latitude", "Longitude"]].to_numpy(dtype=np.float64))
    earth_radius_m = 6_371_000
    eps_rad = eps_meters / earth_radius_m

    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine", algorithm="ball_tree",
                leaf_size=50, n_jobs=1)
    labels = db.fit_predict(coords_rad)

    df["HotspotClusterID"] = labels
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int((labels == -1).sum())
    print(f"  Found {n_clusters} hotspot clusters, {n_noise:,} noise points ({n_noise/len(df):.1%})")

    if n_clusters:
        sizes = df[df["HotspotClusterID"] != -1]["HotspotClusterID"].value_counts().head(10)
        print("  Top 10 hotspots by case count:")
        for cluster_id, size in sizes.items():
            centroid = df[df["HotspotClusterID"] == cluster_id][["Latitude", "Longitude"]].mean()
            print(f"    Cluster {cluster_id}: {size:,} cases, centroid ({centroid['Latitude']:.4f}, {centroid['Longitude']:.4f})")

    return df


# ======================================================================
GEO_FLAG_PARQUET = os.path.join(BASE_DIR, "data", "processed", "_fir_with_ids.parquet")


def ensure_geo_imputation_flag_table(con):
    """Small side table (CaseMasterID -> Lat_Imputed) so hotspot detection
    can exclude Step 1's district-centroid-jittered points by default."""
    con.execute(f"""
        CREATE OR REPLACE TABLE GeoImputationFlag AS
        SELECT CaseMasterID, Lat_Imputed FROM read_parquet('{GEO_FLAG_PARQUET}')
    """)


# ======================================================================
if __name__ == "__main__":
    con = duckdb.connect(DB_PATH)
    ensure_geo_imputation_flag_table(con)

    build_wide_table(con)

    print("\n--- NetworkX co-accused subgraph (example: Bengaluru City) ---")
    G = build_coaccused_subgraph(con, scope_type="district", scope_value="Bengaluru City")
    summarize_syndicates(G)
    coaccused_path = os.path.join(BASE_DIR, "outputs", "coaccused_bengaluru_city.graphml")
    nx.write_graphml(G, coaccused_path)
    print(f"  Saved -> {coaccused_path}")

    print("\n--- DBSCAN hotspots (example: Bengaluru City district, real coordinates only) ---")
    hotspot_df = run_dbscan_hotspots(con, eps_meters=200, min_samples=25,
                                      scope_district="Bengaluru City", real_coords_only=True)
    hotspots_path = os.path.join(BASE_DIR, "outputs", "hotspots_bengaluru_city.parquet")
    hotspot_df.to_parquet(hotspots_path, index=False)

    con.close()
