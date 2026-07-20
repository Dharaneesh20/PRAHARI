"""
graph_agent.py — Helper agent to perform network analysis on co-accused graphs
=============================================================================
Provides direct helper functions for degree ranking and direct neighbor traversals,
bypassing the need for LLMs to generate graph-traversal SQL.
"""
import os
import glob
import networkx as nx
import pandas as pd
import duckdb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "db", "karnataka_fir.duckdb")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

from rbac import apply_scope_filter

def get_disclaimer(synthetic_flag: bool) -> str:
    """Constructs the synthetic disclosure notice dynamically based on the data flag."""
    if synthetic_flag:
        return "\n\n*(Disclosure: This criminal network profile and co-accused connection map is synthetically generated for demonstration purposes and does not represent real criminal records.)*"
    return ""

def find_most_connected(con, district: str, top_n: int = 5, role: str = None, scope_id: int = None) -> dict:
    """
    Queries NetworkSummary directly to find the most connected repeat offenders in a district.
    Does not load or traverse the raw GraphML file, ensuring fast performance.
    """
    sql = """
    SELECT ns.RepeatPoolID, 
           (SELECT MAX(AccusedName) FROM Accused WHERE RepeatPoolID = ns.RepeatPoolID) as AccusedName,
           ns.ConnectionCount, 
           ns.ClusterSize, 
           ns.SyntheticNetworkFlag
    FROM NetworkSummary ns
    WHERE LOWER(ns.DistrictName) = LOWER(?)
    ORDER BY ns.ConnectionCount DESC
    LIMIT ?
    """
    try:
        sql_to_run = apply_scope_filter(con, sql, role, scope_id)
        df = con.execute(sql_to_run, [district, top_n]).fetchdf()
        if df.empty:
            return {
                "status": "success",
                "message": f"No repeat offender network records found for district '{district}'.",
                "data": [],
                "disclaimer": ""
            }
            
        synthetic_flag = bool(df["SyntheticNetworkFlag"].iloc[0])
        records = df.to_dict(orient="records")
        
        # Build plain-text summary
        rows = []
        for idx, r in enumerate(records, 1):
            name = r['AccusedName'] if r['AccusedName'] else f"Offender {r['RepeatPoolID']}"
            rows.append(f"{idx}. **{name}** (ID: {r['RepeatPoolID']}) with **{r['ConnectionCount']}** co-accused links (Community size: {r['ClusterSize']})")
            
        summary = f"The most connected repeat offenders in **{district}** are:\n" + "\n".join(rows)
        summary += get_disclaimer(synthetic_flag)
        
        return {
            "status": "success",
            "message": summary,
            "data": records,
            "disclaimer": get_disclaimer(synthetic_flag)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve most connected offenders: {str(e)}",
            "data": [],
            "disclaimer": ""
        }

def find_associates(con, person_id: int, role: str = None, scope_id: int = None) -> dict:
    """
    Locates the target person's district via NetworkSummary, loads the raw GraphML file on demand,
    and returns their direct co-accused neighbors.
    """
    # 1. Look up the person's district and network stats
    sql = """
    SELECT DistrictName, NetworkClusterID, ClusterSize, SyntheticNetworkFlag
    FROM NetworkSummary
    WHERE RepeatPoolID = ?
    LIMIT 1
    """
    try:
        sql_to_run = apply_scope_filter(con, sql, role, scope_id)
        df = con.execute(sql_to_run, [person_id]).fetchdf()
        if df.empty:
            return {
                "status": "success",
                "message": f"No repeat offender record found for RepeatPoolID {person_id}.",
                "data": [],
                "disclaimer": ""
            }
            
        district = df["DistrictName"].iloc[0]
        cluster_id = df["NetworkClusterID"].iloc[0]
        cluster_size = df["ClusterSize"].iloc[0]
        synthetic_flag = bool(df["SyntheticNetworkFlag"].iloc[0])
        
        # 2. Locate and load the GraphML file for this district
        clean_dist = district.lower().replace(" ", "_")
        graph_files = glob.glob(os.path.join(OUTPUTS_DIR, f"coaccused_{clean_dist}.graphml"))
        
        if not graph_files:
            # Fallback: describe community size from the database if GraphML is missing
            msg = f"Repeat offender **ID {person_id}** is active in **{district}** (Community ID: `{cluster_id}`, size: {cluster_size} nodes). Direct link data is currently unavailable as graph file is missing."
            msg += get_disclaimer(synthetic_flag)
            return {
                "status": "success",
                "message": msg,
                "data": [],
                "disclaimer": get_disclaimer(synthetic_flag)
            }
            
        # Load graph and find neighbors
        G = nx.read_graphml(graph_files[0])
        node_id = f"R{person_id}"
        
        if node_id not in G:
            msg = f"Offender **ID {person_id}** exists in database records but was not found in the {district} co-accused network graph."
            msg += get_disclaimer(synthetic_flag)
            return {
                "status": "success",
                "message": msg,
                "data": [],
                "disclaimer": get_disclaimer(synthetic_flag)
            }
            
        # Get direct co-accused neighbors
        neighbors = list(G.neighbors(node_id))
        associates = []
        
        for n in neighbors:
            name = G.nodes[n].get("name", "Unknown Accused")
            is_repeat = G.nodes[n].get("is_repeat_offender", False)
            n_type = "Repeat Offender" if is_repeat else "Single-time Accused"
            pool_id = int(n[1:]) if is_repeat else None
            associates.append({
                "NodeID": n,
                "Name": name,
                "Type": n_type,
                "RepeatPoolID": pool_id
            })
            
        # Sort associates: repeat offenders first
        associates.sort(key=lambda x: x["Type"], reverse=True)
        
        # Build plain-text summary
        rows = []
        for a in associates:
            pool_str = f" (Pool ID: {a['RepeatPoolID']})" if a['RepeatPoolID'] else ""
            rows.append(f"- **{a['Name']}** [{a['Type']}{pool_str}]")
            
        msg = f"Repeat offender **ID {person_id}** (active in **{district}**, Community ID: `{cluster_id}`) has **{len(associates)}** direct co-accused associates:\n" + "\n".join(rows)
        msg += get_disclaimer(synthetic_flag)
        
        return {
            "status": "success",
            "message": msg,
            "data": associates,
            "disclaimer": get_disclaimer(synthetic_flag)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve associates for offender {person_id}: {str(e)}",
            "data": [],
            "disclaimer": ""
        }
