"""
step4b_network_summary.py — Precompute criminal network metrics (Louvain community partitioning)
=================================================================================================
Loads precomputed co-accused GraphML networks (e.g., outputs/coaccused_bengaluru_city.graphml),
partitions them into cohesive communities (connected components + Louvain for large structures),
and populates the NetworkSummary table in DuckDB to enable instant agent queries without graph traversal.
"""
import os
import glob
import re
import time
import networkx as nx
import pandas as pd
import duckdb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

def get_real_districts(con) -> list[str]:
    """Retrieve list of valid district names from the database."""
    try:
        df = con.execute("SELECT DISTINCT DistrictName FROM District").fetchdf()
        return df["DistrictName"].tolist()
    except Exception:
        # Fallback list if DB is not fully populated
        return ["Bengaluru City", "Mysuru City", "Belagavi Dist", "Tumakuru", "Vijayapur"]

def map_filename_to_district(filename: str, real_districts: list[str]) -> str | None:
    """Map filename like coaccused_bengaluru_city.graphml to database DistrictName."""
    base = os.path.basename(filename)
    clean = base.replace("coaccused_", "").replace(".graphml", "").replace("_", " ").strip().lower()
    for d in real_districts:
        if d.lower() == clean:
            return d
    # Try partial match if exact match fails
    for d in real_districts:
        if d.lower().replace(" city", "").replace(" dist", "") == clean:
            return d
    return None

def process_graphs():
    t_start = time.time()
    print("Initializing DuckDB connection...")
    con = duckdb.connect(DB_PATH)
    real_districts = get_real_districts(con)
    
    graph_files = glob.glob(os.path.join(OUTPUTS_DIR, "*.graphml"))
    if not graph_files:
        print("No .graphml files found in outputs/ directory.")
        con.close()
        return
        
    all_rows = []
    
    for graph_file in graph_files:
        district_name = map_filename_to_district(graph_file, real_districts)
        if not district_name:
            print(f"Skipping {os.path.basename(graph_file)}: could not map to a database district.")
            continue
            
        print(f"\nProcessing graph for {district_name} ({os.path.basename(graph_file)})...")
        t0 = time.time()
        G = nx.read_graphml(graph_file)
        print(f"  Loaded graph: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges in {time.time() - t0:.2f}s.")
        
        # Partition the graph into connected components
        print("  Computing connected components...")
        t0 = time.time()
        components = list(nx.connected_components(G))
        print(f"  Connected components computed: {len(components):,} groups in {time.time() - t0:.2f}s.")
        
        # Louvain community detection on larger components
        from networkx.algorithms.community import louvain_communities
        
        node_cluster_map = {}
        node_cluster_size = {}
        
        print("  Running Louvain community detection on larger components...")
        t0 = time.time()
        for comp_idx, comp in enumerate(components):
            comp_size = len(comp)
            if comp_size < 3:
                # Small components are simple cliques
                cluster_id = f"comp_{comp_idx}"
                for node in comp:
                    node_cluster_map[node] = cluster_id
                    node_cluster_size[node] = comp_size
            else:
                # Run Louvain to find dense subgroups inside large component
                subG = G.subgraph(comp)
                try:
                    communities = louvain_communities(subG, seed=42)
                    for comm_idx, comm in enumerate(communities):
                        cluster_id = f"comm_{comp_idx}_{comm_idx}"
                        comm_size = len(comm)
                        for node in comm:
                            node_cluster_map[node] = cluster_id
                            node_cluster_size[node] = comm_size
                except Exception as e:
                    # Fallback to connected component if Louvain fails
                    cluster_id = f"comp_{comp_idx}"
                    for node in comp:
                        node_cluster_map[node] = cluster_id
                        node_cluster_size[node] = comp_size
                        
        print(f"  Communities partitioned in {time.time() - t0:.2f}s.")
        
        # Extract repeat offenders (nodes starting with 'R')
        print("  Generating records for repeat offenders...")
        for node, data in G.nodes(data=True):
            if node.startswith("R"):
                try:
                    repeat_pool_id = int(node[1:])
                except ValueError:
                    continue  # Invalid node ID format
                    
                degree = G.degree(node)
                cluster_id = node_cluster_map.get(node, "unknown")
                cluster_size = node_cluster_size.get(node, 1)
                
                all_rows.append({
                    "RepeatPoolID": repeat_pool_id,
                    "DistrictName": district_name,
                    "ConnectionCount": degree,
                    "NetworkClusterID": cluster_id,
                    "ClusterSize": cluster_size,
                    "SyntheticNetworkFlag": True
                })
                
    if all_rows:
        df = pd.DataFrame(all_rows)
        print(f"\nWriting {len(df):,} repeat-offender network records to DuckDB...")
        con.execute("CREATE OR REPLACE TABLE NetworkSummary AS SELECT * FROM df")
        # Add primary key / indexes for query speed
        con.execute("CREATE INDEX IF NOT EXISTS idx_ns_repeat ON NetworkSummary (RepeatPoolID)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_ns_district ON NetworkSummary (DistrictName)")
        print("Table 'NetworkSummary' created and indexed successfully.")
    else:
        print("No repeat offender nodes found in the graphs.")
        
    con.close()
    print(f"\nCompleted in {time.time() - t_start:.2f}s.")

if __name__ == "__main__":
    process_graphs()
