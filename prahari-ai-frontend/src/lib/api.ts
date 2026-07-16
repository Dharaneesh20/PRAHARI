// ============================================================
// PRAHARI AI — API Client
// Single source of truth for all backend communication.
// Base URL is read from VITE_API_URL env var (falls back to localhost).
// ============================================================

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
const WS_BASE  = BASE_URL.replace(/^http/, "ws");

// ── Token management ──────────────────────────────────────────
let _token: string | null = sessionStorage.getItem("prahari_token");

export function setToken(t: string) {
  _token = t;
  sessionStorage.setItem("prahari_token", t);
}

export function clearToken() {
  _token = null;
  sessionStorage.removeItem("prahari_token");
}

export function getToken(): string | null {
  return _token;
}

// ── Core fetch wrapper ────────────────────────────────────────
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  login: (badgeId: string, password: string) =>
    apiFetch<{ token: string; user: import("./types").UserProfile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ badgeId, password }),
    }),

  logout: () =>
    apiFetch<{ status: string; message: string }>("/auth/logout", { method: "POST" }),

  session: () =>
    apiFetch<import("./types").UserProfile>("/auth/session"),
};

// ── KPI ───────────────────────────────────────────────────────
export const kpi = {
  summary: (range: "today" | "7d" | "30d" = "7d") =>
    apiFetch<import("./types").KpiSummary>(`/kpi/summary?range=${range}`),

  trend: (range: "today" | "7d" | "30d" = "7d") =>
    apiFetch<import("./types").TrendPoint[]>(`/kpi/trend?range=${range}`),

  hotspots: () =>
    apiFetch<import("./types").HotspotZone[]>("/kpi/hotspots"),
};

// ── Incidents ─────────────────────────────────────────────────
export const incidents = {
  list: (severity = "all", status = "all") =>
    apiFetch<import("./types").Incident[]>(`/incidents?severity=${severity}&status=${status}`),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ id: string; status: string; updatedAt: string }>(`/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  assign: (id: string, unitId: string) =>
    apiFetch<{ id: string; assignedUnitId: string; status: string }>(`/incidents/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ unitId }),
    }),

  /** Returns a WebSocket connected to the live incident stream */
  stream: (): WebSocket => new WebSocket(`${WS_BASE}/incidents/stream`),
};

// ── Units ─────────────────────────────────────────────────────
export const units = {
  list: () =>
    apiFetch<import("./types").PatrolUnit[]>("/units"),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ id: string; status: string }>(`/units/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** Returns a WebSocket connected to the live GPS position stream */
  stream: (): WebSocket => new WebSocket(`${WS_BASE}/units/stream`),
};

// ── Analytics ─────────────────────────────────────────────────
export const analytics = {
  patterns: () =>
    apiFetch<{ categories: import("./types").CrimeCategory[] }>("/analytics/patterns"),

  risk: () =>
    apiFetch<import("./types").RiskZone[]>("/analytics/risk"),

  stations: () =>
    apiFetch<import("./types").StationStats[]>("/analytics/stations"),

  demographics: () =>
    apiFetch<{
      ageGroups: import("./types").AgeGroup[];
      timeDistribution: import("./types").TimeSlot[];
    }>("/analytics/demographics"),
};

// ── Reports ───────────────────────────────────────────────────
export const reports = {
  list: () =>
    apiFetch<import("./types").Report[]>("/reports"),

  update: (id: string, body: { title?: string; sections?: { heading: string; content: string }[] }) =>
    apiFetch<{ status: string; updatedAt: string }>(`/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /**
   * Streams AI-generated report content via SSE.
   * Returns an EventSource — caller should listen for `message` events
   * and close() when token === "[DONE]".
   */
  generateStream: (caseId: string, type: string, notes: string): EventSource => {
    const url = new URL(`${BASE_URL}/reports/generate`);
    // EventSource doesn't support POST natively; we POST via fetch instead
    // and convert it to a ReadableStream. Use streamGenerate() for that.
    void url; // suppress lint
    throw new Error("Use reports.streamGenerate() instead");
  },

  /**
   * POST /reports/generate — returns a ReadableStream of SSE tokens.
   * Usage: for await (const token of reports.streamGenerate(...)) { ... }
   */
  streamGenerate: async function* (caseId: string, type: string, notes: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;

    const res = await fetch(`${BASE_URL}/reports/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ caseId, type, notes }),
    });

    if (!res.ok || !res.body) throw new Error(`Stream failed: HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const { token } = JSON.parse(line.slice(6));
            yield token as string;
          } catch { /* skip malformed */ }
        }
      }
    }
  },
};

// ── Settings ──────────────────────────────────────────────────
export const settings = {
  updateProfile: (email?: string, phone?: string) =>
    apiFetch<{ status: string; profile: { email?: string; phone?: string } }>("/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ email, phone }),
    }),

  auditLog: () =>
    apiFetch<import("./types").AuditEntry[]>("/audit-log"),
};

// ── ML / Analytics Engine ─────────────────────────────────────
export const ml = {
  crimeVolume: (params: { district?: string; unit?: string; crime_group?: string; gravity?: string; year?: number }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    return apiFetch<unknown>(`/api/v1/crime/volume?${qs}`);
  },

  chargesheetRates: (districts: string[], year?: number) => {
    const qs = new URLSearchParams({ districts: districts.join(","), ...(year ? { year: String(year) } : {}) });
    return apiFetch<unknown>(`/api/v1/crime/chargesheet-rates?${qs}`);
  },

  hotspots: (district: string, min_cases = 5) =>
    apiFetch<unknown>(`/api/v1/crime/hotspots?district=${encodeURIComponent(district)}&min_cases=${min_cases}`),

  clusters: (district: string) =>
    apiFetch<unknown>(`/api/v1/crime/clusters?district=${encodeURIComponent(district)}`),

  repeatOffenders: (district?: string, crime_group?: string) => {
    const qs = new URLSearchParams(Object.entries({ district, crime_group }).filter(([, v]) => v != null) as [string, string][]);
    return apiFetch<unknown>(`/api/v1/offenders/repeat-offenders?${qs}`);
  },

  coaccusedNetwork: (district: string, min_weight = 2) =>
    apiFetch<unknown>(`/api/v1/offenders/coaccused-network?district=${encodeURIComponent(district)}&min_weight=${min_weight}`),

  forecast: (district: string, crime_group: string) =>
    apiFetch<unknown>(`/api/v1/crime/forecast?district=${encodeURIComponent(district)}&crime_group=${encodeURIComponent(crime_group)}`),

  forecastBenchmarks: (district: string, crime_group: string) =>
    apiFetch<unknown>(`/api/v1/crime/forecast/benchmarks?district=${encodeURIComponent(district)}&crime_group=${encodeURIComponent(crime_group)}`),

  nl2sql: (question: string) =>
    apiFetch<{ status: string; question: string; route: string; sql: string; rows_returned: number; data: unknown[]; answer: string }>("/api/v1/search/nl2sql", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
};
