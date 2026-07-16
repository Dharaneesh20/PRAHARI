"""
STEP 6 — Crime Trend & Hotspot Detection (benchmarked, best-model-wins)
===========================================================================
Two independent benchmarks, each comparing 3 models and keeping whichever
wins per series/district rather than forcing one model statewide:

  A. TREND FORECASTING — monthly case-count series per (District,
     CrimeGroup), forecasting the next month.
     Models: SARIMA, Holt-Winters Exponential Smoothing, XGBoost (lag +
     rolling + seasonal features). Scored by MAE/RMSE/MAPE on a
     held-out trailing window (time-based split, never shuffled).

  B. HOTSPOT DETECTION — spatial clustering on REAL (non-imputed)
     coordinates only, per district.
     Models: DBSCAN, HDBSCAN, K-Means (elbow-selected k). Scored by
     silhouette score + noise ratio (DBSCAN/HDBSCAN only).

Outputs feed the dashboard: per-series winning model + forecast, and
per-district winning clustering + cluster assignments, plus a combined
benchmark scorecard so the "why this model" story is auditable.
"""

import warnings
warnings.filterwarnings("ignore")

import os
import duckdb
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import hdbscan

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
OUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

# Keep the demo scoped to the highest-volume series/districts rather than
# every District x CrimeGroup combination (~4,000+) — this is what makes
# the benchmark runnable live in a demo instead of a batch job.
TOP_N_SERIES = 15
TOP_N_DISTRICTS_FOR_HOTSPOT = 5
HOLDOUT_MONTHS = 6


# ======================================================================
# A0. Monthly aggregate (the granularity trend forecasting actually needs
#     — your existing fact_crime_agg is yearly, too coarse to forecast)
# ======================================================================
def build_monthly_aggregate(con) -> pd.DataFrame:
    q = """
    SELECT DistrictName, CrimeGroupName,
           DATE_TRUNC('month', CrimeRegisteredDate) AS YearMonth,
           COUNT(*) AS CaseCount
    FROM CaseMaster_Wide
    WHERE CrimeRegisteredDate IS NOT NULL
    GROUP BY DistrictName, CrimeGroupName, YearMonth
    ORDER BY DistrictName, CrimeGroupName, YearMonth
    """
    df = con.execute(q).fetchdf()
    df.to_parquet(f"{OUT_DIR}/fact_crime_monthly.parquet", index=False)
    print(f"  fact_crime_monthly: {len(df):,} rows -> fact_crime_monthly.parquet")
    return df


# ======================================================================
# A. Trend forecasting benchmark
# ======================================================================
def _make_xgb_features(series: pd.Series) -> pd.DataFrame:
    df = pd.DataFrame({"y": series.values}, index=series.index)
    for lag in [1, 2, 3, 6, 12]:
        df[f"lag_{lag}"] = df["y"].shift(lag)
    df["rolling_mean_3"] = df["y"].shift(1).rolling(3).mean()
    df["rolling_mean_6"] = df["y"].shift(1).rolling(6).mean()
    df["month"] = df.index.month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df.dropna()


def _score(y_true, y_pred):
    y_true, y_pred = np.array(y_true, dtype=float), np.array(y_pred, dtype=float)
    mae = np.mean(np.abs(y_true - y_pred))
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    denom = np.where(y_true == 0, 1, y_true)  # avoid div-by-zero on quiet series
    mape = np.mean(np.abs((y_true - y_pred) / denom)) * 100
    return mae, rmse, mape


def fit_sarima(train, test_len):
    try:
        model = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 1, 0, 12),
                         enforce_stationarity=False, enforce_invertibility=False)
        fit = model.fit(disp=False)
        return fit.forecast(test_len).values
    except Exception:
        return np.full(test_len, train.iloc[-6:].mean())  # fallback: recent mean


def fit_holt_winters(train, test_len):
    try:
        model = ExponentialSmoothing(train, trend="add", seasonal="add", seasonal_periods=12)
        fit = model.fit()
        return fit.forecast(test_len).values
    except Exception:
        return np.full(test_len, train.iloc[-6:].mean())


def fit_naive_seasonal(train, test_len):
    """Baseline: next month = same month last year, if available, else same
    value as the most recent month. Cheap to compute, and the whole point of
    it: if a fancier model can't beat this, it isn't earning its complexity."""
    preds = []
    for i in range(test_len):
        target_idx = len(train) - 12 + i
        if target_idx >= 0:
            preds.append(train.iloc[target_idx])
        else:
            preds.append(train.iloc[-1])
    return np.array(preds, dtype=float)


def fit_xgboost(full_series, test_len):
    feat_df = _make_xgb_features(full_series)
    train_feat = feat_df.iloc[:-test_len]
    test_feat = feat_df.iloc[-test_len:]
    if len(train_feat) < 12:
        return np.full(test_len, full_series.iloc[-6:].mean())

    X_train, y_train = train_feat.drop(columns="y"), train_feat["y"]
    model = XGBRegressor(n_estimators=200, max_depth=3, learning_rate=0.05,
                          random_state=RANDOM_SEED, verbosity=0)
    model.fit(X_train, y_train)
    preds = model.predict(test_feat.drop(columns="y"))
    return preds


def benchmark_trend_forecasting(monthly_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    print(f"\n  Selecting top {TOP_N_SERIES} District x CrimeGroup series by volume...")
    volume = (monthly_df.groupby(["DistrictName", "CrimeGroupName"])["CaseCount"]
              .sum().sort_values(ascending=False).head(TOP_N_SERIES))

    benchmark_rows, forecast_rows = [], []
    for (district, crime_group), _ in volume.items():
        series = (monthly_df[(monthly_df.DistrictName == district) & (monthly_df.CrimeGroupName == crime_group)]
                  .set_index("YearMonth")["CaseCount"].asfreq("MS").fillna(0))
        if len(series) < 24:  # need enough history for a seasonal model + holdout
            continue

        train, test = series.iloc[:-HOLDOUT_MONTHS], series.iloc[-HOLDOUT_MONTHS:]

        preds = {
            "Naive": fit_naive_seasonal(train, HOLDOUT_MONTHS),
            "SARIMA": fit_sarima(train, HOLDOUT_MONTHS),
            "HoltWinters": fit_holt_winters(train, HOLDOUT_MONTHS),
            "XGBoost": fit_xgboost(series, HOLDOUT_MONTHS),
        }

        scores = {}
        for name, pred in preds.items():
            mae, rmse, mape = _score(test.values, pred)
            scores[name] = mae
            benchmark_rows.append({
                "District": district, "CrimeGroup": crime_group, "Model": name,
                "MAE": round(mae, 2), "RMSE": round(rmse, 2), "MAPE_pct": round(mape, 1),
            })

        # Only let a "smart" model win if it actually beats the naive
        # baseline — otherwise the naive baseline wins, since there's no
        # point deploying model complexity that doesn't earn its keep.
        smart_models = {k: v for k, v in scores.items() if k != "Naive"}
        best_smart_model = min(smart_models, key=smart_models.get)
        beats_baseline = smart_models[best_smart_model] < scores["Naive"]
        best_model = best_smart_model if beats_baseline else "Naive"

        # Refit the winning model on the FULL series to forecast next month
        if best_model == "Naive":
            next_pred = fit_naive_seasonal(series, 1)[0]
        elif best_model == "SARIMA":
            next_pred = fit_sarima(series, 1)[0]
        elif best_model == "HoltWinters":
            next_pred = fit_holt_winters(series, 1)[0]
        else:
            feat_df = _make_xgb_features(series)
            model = XGBRegressor(n_estimators=200, max_depth=3, learning_rate=0.05,
                                  random_state=RANDOM_SEED, verbosity=0)
            model.fit(feat_df.drop(columns="y"), feat_df["y"])
            last_row = _make_xgb_features(pd.concat([series, pd.Series([np.nan], index=[series.index[-1] + pd.DateOffset(months=1)])])).iloc[[-1]]
            next_pred = model.predict(last_row.drop(columns="y"))[0] if len(last_row) else series.iloc[-6:].mean()

        recent_avg = series.iloc[-6:].mean()
        trend_direction = "rising" if next_pred > recent_avg * 1.1 else \
                           "falling" if next_pred < recent_avg * 0.9 else "stable"

        # Guardrail: a forecast that swings wildly from recent behavior (e.g.
        # a volatile series with a one-off spike/data anomaly confusing
        # SARIMA's seasonal fit) shouldn't be trusted silently — flag it for
        # human review instead of feeding it straight to a dashboard.
        low_confidence = (recent_avg > 0) and (abs(next_pred - recent_avg) > recent_avg * 0.85)

        forecast_rows.append({
            "District": district, "CrimeGroup": crime_group, "BestModel": best_model,
            "NextMonthForecast": round(max(0, next_pred), 1),
            "Last6MonthAvg": round(recent_avg, 1), "TrendDirection": trend_direction,
            "LowConfidence_ReviewFlag": low_confidence,
        })

    benchmark_df = pd.DataFrame(benchmark_rows)
    forecast_df = pd.DataFrame(forecast_rows)
    return benchmark_df, forecast_df


# ======================================================================
# B. Hotspot detection benchmark
# ======================================================================
def benchmark_hotspot_detection(con) -> tuple[pd.DataFrame, dict]:
    top_districts = con.execute("""
        SELECT d.DistrictName, COUNT(*) n
        FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID
        JOIN District d ON u.DistrictID = d.DistrictID
        JOIN GeoImputationFlag g ON cm.CaseMasterID = g.CaseMasterID
        WHERE g.Lat_Imputed = false AND cm.Latitude BETWEEN 11 AND 19 AND cm.Longitude BETWEEN 73 AND 79
        GROUP BY d.DistrictName ORDER BY n DESC LIMIT ?
    """, [TOP_N_DISTRICTS_FOR_HOTSPOT]).fetchdf()

    benchmark_rows = []
    cluster_results = {}

    for district in top_districts["DistrictName"]:
        pts = con.execute("""
            SELECT cm.CaseMasterID, cm.Latitude, cm.Longitude
            FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID
            JOIN District d ON u.DistrictID = d.DistrictID
            JOIN GeoImputationFlag g ON cm.CaseMasterID = g.CaseMasterID
            WHERE d.DistrictName = ? AND g.Lat_Imputed = false
              AND cm.Latitude BETWEEN 11 AND 19 AND cm.Longitude BETWEEN 73 AND 79
        """, [district]).fetchdf()

        if len(pts) > 60_000:  # memory-safe cap, same rationale as Step 4
            pts = pts.sample(n=60_000, random_state=RANDOM_SEED).reset_index(drop=True)

        coords_rad = np.radians(pts[["Latitude", "Longitude"]].to_numpy(dtype=np.float64))
        earth_radius_m = 6_371_000
        eps_rad = 200 / earth_radius_m

        labels_by_model = {}

        db = DBSCAN(eps=eps_rad, min_samples=25, metric="haversine", algorithm="ball_tree", n_jobs=1)
        labels_by_model["DBSCAN"] = db.fit_predict(coords_rad)

        hdb = hdbscan.HDBSCAN(min_cluster_size=25, metric="haversine")
        labels_by_model["HDBSCAN"] = hdb.fit_predict(coords_rad)

        best_k, best_sil = 5, -1
        for k in [5, 10, 15, 20]:
            km_labels = KMeans(n_clusters=k, random_state=RANDOM_SEED, n_init=10).fit_predict(coords_rad)
            sil = silhouette_score(coords_rad, km_labels, sample_size=min(5000, len(coords_rad)), random_state=RANDOM_SEED)
            if sil > best_sil:
                best_k, best_sil = k, sil
        labels_by_model["KMeans"] = KMeans(n_clusters=best_k, random_state=RANDOM_SEED, n_init=10).fit_predict(coords_rad)

        for name, labels in labels_by_model.items():
            mask = labels != -1
            noise_ratio = (labels == -1).mean()
            n_clusters = len(set(labels[mask])) if mask.sum() else 0
            sil = silhouette_score(coords_rad[mask], labels[mask],
                                    sample_size=min(5000, mask.sum()), random_state=RANDOM_SEED) if n_clusters > 1 else -1
            benchmark_rows.append({
                "District": district, "Model": name, "NumClusters": n_clusters,
                "NoiseRatio": round(noise_ratio, 3), "SilhouetteScore": round(sil, 3),
                "NumPoints": len(pts),
            })

        # Model selection: raw silhouette on clustered points, but with a
        # noise-ratio eligibility floor. NOT a coverage multiplier — that
        # was tried and rejected, because it systematically favors K-Means,
        # which structurally cannot produce noise (every point gets forced
        # into some cluster, even a genuinely isolated one-off incident).
        # For hotspot detection specifically, correctly labeling a point as
        # "not a hotspot" is a feature, not a flaw to penalize. The actual
        # problem this guards against is a model like DBSCAN discarding
        # >70% of a district's data and then getting a flattering silhouette
        # on the small, easy remainder — that's excluded outright rather
        # than partially discounted.
        NOISE_RATIO_FLOOR = 0.70
        district_rows = [r for r in benchmark_rows if r["District"] == district]
        eligible = {r["Model"]: r["SilhouetteScore"] for r in district_rows if r["NoiseRatio"] <= NOISE_RATIO_FLOOR}
        best_model = max(eligible, key=eligible.get) if eligible else \
            max({r["Model"]: r["SilhouetteScore"] for r in district_rows}, key=lambda k: k)
        pts["ClusterID"] = labels_by_model[best_model]
        pts["Model"] = best_model
        pts["District"] = district
        cluster_results[district] = pts
        winner_row = next(r for r in district_rows if r["Model"] == best_model)
        print(f"  {district}: best model = {best_model} "
              f"(silhouette={winner_row['SilhouetteScore']}, noise_ratio={winner_row['NoiseRatio']})")

    return pd.DataFrame(benchmark_rows), cluster_results


def load_into_duckdb(con, monthly_df, trend_bench_df, forecast_df, hotspot_bench_df, cluster_results):
    """Persist benchmark outputs as real DuckDB tables so the NL2SQL agent
    (Step 5) can query them directly instead of the pipeline shipping CSVs
    the agent never actually sees."""
    con.execute("CREATE OR REPLACE TABLE fact_crime_monthly AS SELECT * FROM monthly_df")
    con.execute("CREATE OR REPLACE TABLE trend_forecast AS SELECT * FROM forecast_df")
    con.execute("CREATE OR REPLACE TABLE trend_model_benchmark AS SELECT * FROM trend_bench_df")
    con.execute("CREATE OR REPLACE TABLE hotspot_model_benchmark AS SELECT * FROM hotspot_bench_df")
    all_clusters = pd.concat(cluster_results.values(), ignore_index=True) if cluster_results else pd.DataFrame()
    con.execute("CREATE OR REPLACE TABLE hotspot_clusters AS SELECT * FROM all_clusters")

    # Pre-computed cluster-level summary — the actual answer surface for
    # "where are the hotspots" questions. Doing this aggregation here, once,
    # means the NL2SQL agent doesn't have to remember to GROUP BY + COUNT
    # correctly on every question, and the LowConfidence flag is guaranteed
    # present rather than depending on the LLM choosing to compute it.
    con.execute("""
        CREATE OR REPLACE TABLE hotspot_summary AS
        SELECT District, Model, ClusterID,
               COUNT(*) AS RealCoordCaseCount,
               AVG(Latitude) AS CentroidLatitude, AVG(Longitude) AS CentroidLongitude,
               (COUNT(*) < 30) AS LowConfidence_ReviewFlag
        FROM hotspot_clusters
        WHERE ClusterID != -1
        GROUP BY District, Model, ClusterID
        ORDER BY District, RealCoordCaseCount DESC
    """)
    print("  Loaded into DuckDB: fact_crime_monthly, trend_forecast, trend_model_benchmark, "
          "hotspot_model_benchmark, hotspot_clusters, hotspot_summary")


# ======================================================================
if __name__ == "__main__":
    con = duckdb.connect(DB_PATH)

    print("Building monthly aggregate...")
    monthly_df = build_monthly_aggregate(con)

    print("\nBenchmarking trend forecasting models (SARIMA / Holt-Winters / XGBoost)...")
    trend_bench_df, forecast_df = benchmark_trend_forecasting(monthly_df)
    trend_bench_df.to_csv(f"{OUT_DIR}/trend_model_benchmark.csv", index=False)
    forecast_df.to_csv(f"{OUT_DIR}/trend_forecast_next_month.csv", index=False)
    print(f"\n  Model win counts:\n{forecast_df['BestModel'].value_counts().to_string()}")
    print(f"\n  Sample forecasts:\n{forecast_df.head(8).to_string(index=False)}")

    print("\nBenchmarking hotspot detection models (DBSCAN / HDBSCAN / KMeans)...")
    hotspot_bench_df, cluster_results = benchmark_hotspot_detection(con)
    hotspot_bench_df.to_csv(f"{OUT_DIR}/hotspot_model_benchmark.csv", index=False)
    for district, df in cluster_results.items():
        fname = f"{OUT_DIR}/hotspot_clusters_{district.replace(' ', '_')}.parquet"
        df.to_parquet(fname, index=False)
    print(f"\n{hotspot_bench_df.to_string(index=False)}")

    load_into_duckdb(con, monthly_df, trend_bench_df, forecast_df, hotspot_bench_df, cluster_results)

    con.close()
    print("\nDone.")
