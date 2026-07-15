"""
STEP 1 — Geography & Imputation Engine
========================================
Loads the raw Kaggle FIR CSV, maps each District_Name to a real-world
central lat/long, and fills ONLY the missing coordinates with a jittered
point around that district's centroid. Rows that already have real
coordinates (~30% of this dataset) are left untouched.

Jitter radius is scaled per-district by approximate district area, so
compact districts (or urban police-commissionerate units like "Mysuru
City") get a tighter scatter than large rural districts like Uttara
Kannada — this keeps synthetic points from drifting outside plausible
district bounds.

Also mints a synthetic surrogate key `CaseMasterID` since the source file
has no FIR-number / case-ID column of its own.
"""

import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CSV_PATH = os.path.join(BASE_DIR, "data", "raw", "FIR_Details_Data.csv")
OUT_PARQUET_PATH = os.path.join(BASE_DIR, "data", "processed", "fir_step1_geo.parquet")

os.makedirs(os.path.dirname(OUT_PARQUET_PATH), exist_ok=True)

RANDOM_SEED = 42

# Jitter radius bounds (degrees). A district's jitter is derived from its
# approximate area, then clamped to this range so no district ever gets a
# scatter that's unrealistically tiny or unrealistically huge.
MIN_JITTER_DEG = 0.01   # ~1.1 km  floor (small/urban units)
MAX_JITTER_DEG = 0.08   # ~8.9 km  ceiling (large rural districts)
# Fraction of a district's "equivalent circle radius" (sqrt(area/pi)) used
# as the jitter radius, so points stay well within the district rather
# than scattering to its outer edge.
AREA_SHRINK_FACTOR = 0.35

# ---------------------------------------------------------------------
# 1. District -> approximate central (lat, long) coordinates
#    Real-world town/district-HQ coordinates. The four non-geographic
#    "districts" (CID, ISD Bengaluru, Karnataka Railways, Coastal
#    Security Police) are statewide units, so they're pinned to
#    Bengaluru (state HQ) as a reasonable fallback centroid.
# ---------------------------------------------------------------------
DISTRICT_COORDS = {
    "Bagalkot": (16.1691, 75.6636),
    "Ballari": (15.1394, 76.9214),
    "Belagavi City": (15.8497, 74.4977),
    "Belagavi Dist": (15.8497, 74.4977),
    "Bengaluru City": (12.9716, 77.5946),
    "Bengaluru Dist": (13.0827, 77.5877),
    "Bidar": (17.9104, 77.5199),
    "CID": (12.9716, 77.5946),                      # statewide unit -> Bengaluru
    "Chamarajanagar": (11.9236, 76.9456),
    "Chickballapura": (13.4355, 77.7315),
    "Chikkamagaluru": (13.3161, 75.7720),
    "Chitradurga": (14.2251, 76.3980),
    "Coastal Security Police": (13.3409, 74.7421),  # pinned near Mangaluru coast
    "Dakshina Kannada": (12.8438, 75.2479),
    "Davanagere": (14.4644, 75.9218),
    "Dharwad": (15.4589, 75.0078),
    "Gadag": (15.4167, 75.6167),
    "Hassan": (13.0072, 76.0962),
    "Haveri": (14.7935, 75.4048),
    "Hubballi Dharwad City": (15.3647, 75.1240),
    "ISD Bengaluru": (12.9716, 77.5946),             # statewide unit -> Bengaluru
    "K.G.F": (12.9564, 78.2681),
    "Kalaburagi": (17.3297, 76.8343),
    "Kalaburagi City": (17.3297, 76.8343),
    "Karnataka Railways": (12.9716, 77.5946),        # statewide unit -> Bengaluru
    "Kodagu": (12.4244, 75.7382),
    "Kolar": (13.1362, 78.1298),
    "Koppal": (15.3547, 76.1548),
    "Mandya": (12.5242, 76.8958),
    "Mangaluru City": (12.9141, 74.8560),
    "Mysuru City": (12.2958, 76.6394),
    "Mysuru Dist": (12.2958, 76.6394),
    "Raichur": (16.2076, 77.3463),
    "Ramanagara": (12.7217, 77.2812),
    "Shivamogga": (13.9299, 75.5681),
    "Tumakuru": (13.3379, 77.1173),
    "Udupi": (13.3409, 74.7421),
    "Uttara Kannada": (14.7936, 74.6982),
    "Vijayanagara": (15.2350, 76.4600),
    "Vijayapur": (16.8302, 75.7100),
    "Yadgir": (16.7690, 77.1380),
}


# ---------------------------------------------------------------------
# 1b. Approximate district/unit area in km^2 (public-domain figures,
#     rounded). Urban commissionerate units (…City) use the municipal
#     corporation footprint, not the surrounding revenue district.
#     Statewide special units get a small placeholder area since they
#     aren't geographically bounded in the first place.
# ---------------------------------------------------------------------
DISTRICT_AREA_KM2 = {
    "Bagalkot": 6572, "Ballari": 8447, "Belagavi City": 90, "Belagavi Dist": 13415,
    "Bengaluru City": 741, "Bengaluru Dist": 2079, "Bidar": 5448, "CID": 300,
    "Chamarajanagar": 5101, "Chickballapura": 4244, "Chikkamagaluru": 7201,
    "Chitradurga": 8440, "Coastal Security Police": 300, "Dakshina Kannada": 4559,
    "Davanagere": 5924, "Dharwad": 4260, "Gadag": 4656, "Hassan": 6814,
    "Haveri": 4823, "Hubballi Dharwad City": 213, "ISD Bengaluru": 300,
    "K.G.F": 100, "Kalaburagi": 10951, "Kalaburagi City": 150,
    "Karnataka Railways": 300, "Kodagu": 4102, "Kolar": 4012, "Koppal": 5559,
    "Mandya": 4961, "Mangaluru City": 170, "Mysuru City": 155, "Mysuru Dist": 6700,
    "Raichur": 6827, "Ramanagara": 3516, "Shivamogga": 8477, "Tumakuru": 10598,
    "Udupi": 3880, "Uttara Kannada": 10291, "Vijayanagara": 5850,
    "Vijayapur": 10498, "Yadgir": 5273,
}


def build_jitter_lookup(
    area_km2: dict = DISTRICT_AREA_KM2,
    min_deg: float = MIN_JITTER_DEG,
    max_deg: float = MAX_JITTER_DEG,
    shrink: float = AREA_SHRINK_FACTOR,
) -> dict:
    """
    Convert each district's area into a jitter radius in degrees:
    equivalent_circle_radius_km = sqrt(area / pi)
    jitter_km = equivalent_circle_radius_km * shrink
    jitter_deg = jitter_km / 111.0   (~111 km per degree of latitude)
    then clamp to [min_deg, max_deg].
    """
    lookup = {}
    for district, area in area_km2.items():
        radius_km = np.sqrt(area / np.pi) * shrink
        radius_deg = radius_km / 111.0
        lookup[district] = float(np.clip(radius_deg, min_deg, max_deg))
    return lookup


def load_raw_csv(path: str = RAW_CSV_PATH) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    df.insert(0, "CaseMasterID", range(1, len(df) + 1))
    return df


def impute_coordinates(
    df: pd.DataFrame,
    district_coords: dict = DISTRICT_COORDS,
    jitter_lookup: dict = None,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Fill only missing Latitude/Longitude values with a jittered point
    around the district's centroid, using a PER-DISTRICT jitter radius
    scaled to that district's approximate area. Existing real
    coordinates are kept as-is.
    """
    if jitter_lookup is None:
        jitter_lookup = build_jitter_lookup()

    rng = np.random.default_rng(seed)
    df = df.copy()

    df["Lat_Imputed"] = False
    df["Long_Imputed"] = False

    missing_mask = df["Latitude"].isna() | df["Longitude"].isna()
    n_missing = missing_mask.sum()

    centroid_lat = df["District_Name"].map(lambda d: district_coords.get(d, (np.nan, np.nan))[0])
    centroid_lon = df["District_Name"].map(lambda d: district_coords.get(d, (np.nan, np.nan))[1])
    district_jitter = df["District_Name"].map(lambda d: jitter_lookup.get(d, MIN_JITTER_DEG)).to_numpy()

    jitter_lat = rng.uniform(-1.0, 1.0, size=len(df)) * district_jitter
    jitter_lon = rng.uniform(-1.0, 1.0, size=len(df)) * district_jitter

    imputed_lat = centroid_lat + jitter_lat
    imputed_lon = centroid_lon + jitter_lon

    df.loc[missing_mask, "Latitude"] = imputed_lat[missing_mask]
    df.loc[missing_mask, "Longitude"] = imputed_lon[missing_mask]
    df.loc[missing_mask, "Lat_Imputed"] = True
    df.loc[missing_mask, "Long_Imputed"] = True

    unmapped = df.loc[missing_mask & df["Latitude"].isna(), "District_Name"].unique()
    if len(unmapped):
        print(f"WARNING: {len(unmapped)} district(s) had no coordinate mapping: {list(unmapped)}")

    print(f"Imputed coordinates for {n_missing:,} / {len(df):,} rows "
          f"({n_missing / len(df):.1%}), jitter radius scaled per district "
          f"(range {MIN_JITTER_DEG}°-{MAX_JITTER_DEG}°). Real coordinates preserved for the rest.")

    return df


def add_crime_registered_date(df: pd.DataFrame) -> pd.DataFrame:
    """
    Schema wants a single CrimeRegisteredDate (DATE). Source CSV only has
    FIR_YEAR / FIR_MONTH / FIR_Day as separate int columns, so we
    reconstruct it with a vectorized pd.to_datetime call (row-wise
    .apply() over 1.67M rows is too slow/memory-heavy). Invalid
    combinations (e.g. Feb 30, month=0) become NaT rather than raising.
    """
    df = df.copy()
    date_str = (
        df["FIR_YEAR"].astype("Int64").astype(str) + "-"
        + df["FIR_MONTH"].astype("Int64").astype(str) + "-"
        + df["FIR_Day"].astype("Int64").astype(str)
    )
    df["CrimeRegisteredDate"] = pd.to_datetime(date_str, format="%Y-%m-%d", errors="coerce")

    n_bad = df["CrimeRegisteredDate"].isna().sum()
    if n_bad:
        print(f"NOTE: {n_bad:,} rows had unparseable FIR_YEAR/MONTH/Day and got NaT for CrimeRegisteredDate.")
    return df


def rename_to_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Align column casing/naming with the target ER schema (lowercase
    latitude/longitude on CaseMaster)."""
    return df.rename(columns={"Latitude": "latitude", "Longitude": "longitude"})


def main():
    df = load_raw_csv()
    df = impute_coordinates(df)
    df = add_crime_registered_date(df)
    df = rename_to_schema(df)
    df.to_parquet(OUT_PARQUET_PATH, index=False)
    print(f"Saved -> {OUT_PARQUET_PATH}  shape={df.shape}")
    print(df[["CaseMasterID", "District_Name", "latitude", "longitude", "Lat_Imputed", "CrimeRegisteredDate"]].head())


if __name__ == "__main__":
    main()
