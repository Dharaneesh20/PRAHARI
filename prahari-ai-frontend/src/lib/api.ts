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
    let msg = "HTTP " + res.status;
    if (typeof err.detail === "string") {
      msg = err.detail;
    } else if (Array.isArray(err.detail)) {
      msg = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    } else if (err.detail && typeof err.detail === "object") {
      msg = JSON.stringify(err.detail);
    } else if (err.message) {
      msg = err.message;
    }
    throw new Error(msg);
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
  updateProfile: (profile: Partial<import("./types").UserProfile>) =>
    apiFetch<{ status: string; profile: import("./types").UserProfile }>("/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ status: string; message: string }>("/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: (password: string) =>
    apiFetch<{ status: string; message: string }>("/settings/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),

  get: () =>
    apiFetch<import("./types").AppSettings>("/settings"),

  update: (body: Partial<import("./types").AppSettings>) =>
    apiFetch<import("./types").AppSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  auditLog: () =>
    apiFetch<import("./types").AuditEntry[]>("/settings/audit-log"),
};

export const notifications = {
  list: () =>
    apiFetch<import("./types").NotificationItem[]>("/settings/notifications"),

  unreadCount: () =>
    apiFetch<{ count: number }>("/settings/notifications/unread-count"),

  markRead: (id: string) =>
    apiFetch<import("./types").NotificationItem>(`/settings/notifications/${id}/read`, { method: "PATCH" }),

  delete: (id: string) =>
    apiFetch<{ status: string }>(`/settings/notifications/${id}`, { method: "DELETE" }),
};

export type AdminUserPayload = {
  name: string;
  badgeId: string;
  rank: string;
  station: string;
  role: string;
  email: string;
  phone: string;
  clearance_level: number;
  password?: string;
};

export const admin = {
  users: () =>
    apiFetch<import("./types").UserProfile[]>("/admin/users"),

  createUser: (user: AdminUserPayload & { password: string }) =>
    apiFetch<import("./types").UserProfile>("/admin/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  updateUser: (badgeId: string, user: AdminUserPayload) =>
    apiFetch<import("./types").UserProfile>(`/admin/users/${encodeURIComponent(badgeId)}`, {
      method: "PUT",
      body: JSON.stringify(user),
    }),

  deleteUser: (badgeId: string) =>
    apiFetch<{ status: string; message: string }>(`/admin/users/${encodeURIComponent(badgeId)}`, {
      method: "DELETE",
    }),

  pipelineStatus: () =>
    apiFetch<{ is_running: boolean; current_step?: string; logs?: string[] }>("/admin/pipeline-status"),

  runPipeline: () =>
    apiFetch<{ message: string }>("/admin/run-pipeline", { method: "POST" }),
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

  voice: {
    speechToText: async (audioBlob: Blob, language = "kn-IN") => {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.wav");
      formData.append("language", language);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/voice/stt`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.message || `Zia STT failed (HTTP ${res.status})`);
      }
      return res.json() as Promise<{ text: string; transcript: string; language: string; provider: string; status?: string }>;
    },

    textToSpeech: async (text: string, language = "kn-IN", voice?: string, pitch = "medium", speed = 1.0, emotion = "neutral") => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/voice/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, language, voice, pitch, speed, emotion }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.message || `Zia TTS failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },

    getOptions: async () => {
      return apiFetch<{
        supported_languages: Array<{ code: string; name: string }>;
        voices: Record<string, Array<{ id: string; name: string; gender: string }>>;
        options: { pitch: string[]; speed: number[]; emotion: string[] };
      }>("/api/voice/options");
    },
  },

  ai: {
    speechToText: async (audioBlob: Blob, language = "kn-IN") => {
      const formData = new FormData();
      formData.append("file", audioBlob, "speech.wav");
      formData.append("language", language);
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/voice/stt`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.message || `Zia STT failed (HTTP ${res.status})`);
      }
      return res.json() as Promise<{ text: string; transcript: string; language: string; provider: string; status?: string }>;
    },

    textToSpeech: async (text: string, language = "kn-IN", voice?: string) => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/voice/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, language, voice }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.message || `Zia TTS failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },

    translate: async (text: string, target_lang = "kn-IN", source_lang = "en-IN") => {
      return apiFetch<{ translated_text: string; source_lang: string; target_lang: string; provider: string }>("/api/v1/ai/translate", {
        method: "POST",
        body: JSON.stringify({ text, target_lang, source_lang }),
      });
    },

    chat: async (messages: Array<{ role: string; content: string }>, model = "meta/llama-3.1-70b-instruct") => {
      return apiFetch<{ response: string; provider: string; model: string }>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages, model }),
      });
    },

    summarize: async (text: string, max_length = 250) => {
      return apiFetch<{ summary: string; provider: string }>("/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text, max_length }),
      });
    },
  },

  catalyst: {
    /**
     * Image OCR — streams extracted text tokens from Zoho Catalyst OCR.
     */
    ocrScan: async (
      imageFile: File,
      language: "en" | "kn",
      onToken: (token: string) => void,
      onDone?: () => void,
      onError?: (err: string) => void
    ) => {
      const authToken = getToken();
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      const langCode = language === "kn" ? "kan" : "eng";
      formData.append("language", langCode);

      const res = await fetch(`${BASE_URL}/api/v1/catalyst/ocr`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = typeof err.detail === "string" ? err.detail : "OCR request failed";
        onError?.(msg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError?.("Stream reader unavailable"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.status === "unconfigured") {
              onError?.(
                parsed.message ||
                "Zoho Catalyst OCR credentials are not set. Please configure CATALYST_PROJECT_ID, CATALYST_CLIENT_ID, CATALYST_CLIENT_SECRET, and CATALYST_REFRESH_TOKEN in backend .env."
              );
              return;
            }
            if (parsed.error) { onError?.(parsed.error); return; }
            if (parsed.token === "[DONE]") { onDone?.(); return; }
            if (parsed.token) onToken(parsed.token);
          } catch { /* ignore */ }
        }
      }
      onDone?.();
    },

    textAnalysis: async (text: string) => {
      return apiFetch<unknown>("/api/v1/catalyst/text-analysis", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    },

    faceAnalysis: async (imageFile: File) => {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      return apiFetch<unknown>("/api/v1/catalyst/face-analysis", {
        method: "POST",
        body: formData,
      });
    },

    objectRecognition: async (imageFile: File) => {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      return apiFetch<unknown>("/api/v1/catalyst/object-recognition", {
        method: "POST",
        body: formData,
      });
    },

    imageModeration: async (imageFile: File) => {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      return apiFetch<unknown>("/api/v1/catalyst/image-moderation", {
        method: "POST",
        body: formData,
      });
    },

    barcodeScan: async (imageFile: File) => {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      return apiFetch<unknown>("/api/v1/catalyst/barcode", {
        method: "POST",
        body: formData,
      });
    },

    identityScan: async (imageFile: File, docType = "auto") => {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name);
      formData.append("doc_type", docType);
      return apiFetch<unknown>("/api/v1/catalyst/identity", {
        method: "POST",
        body: formData,
      });
    },
  },

  mapIncidents: (district?: string, crime_group?: string) => {
    const params = new URLSearchParams();
    if (district) params.append("district", district);
    if (crime_group) params.append("crime_group", crime_group);
    return apiFetch<{
      total: number;
      incidents: Array<{
        id: string;
        district: string;
        station: string;
        crime_group: string;
        case_count: number;
        severity: "critical" | "high" | "medium" | "low";
        lat: number;
        lng: number;
      }>;
    }>(`/api/v1/map/incidents?${params.toString()}`);
  },

  exportPdf: async (sessionId: string | number) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api/v1/export/${sessionId}`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Failed to export PDF report");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation_report_${sessionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  chatSessions: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiFetch<import("./types").ChatSessionItem[]>(`/api/v1/chat/sessions${qs}`);
  },

  updateSession: (
    id: number,
    data: { title?: string; is_pinned?: boolean; is_starred?: boolean; tag_label?: string | null; tag_color?: string | null }
  ) => {
    return apiFetch<import("./types").ChatSessionItem>(`/api/v1/chat/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteSession: (id: number) => {
    return apiFetch<{ status: string }>(`/api/v1/chat/sessions/${id}`, {
      method: "DELETE",
    });
  },

  nl2sqlStream: async (
    question: string,
    onToken: (token: string) => void,
    onMeta?: (meta: { route?: string; sql?: string; rows?: number; session_id?: string }) => void,
    onError?: (err: string) => void,
    onThinking?: (thinkingToken: string) => void,
    sessionId?: string | number
  ) => {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api/v1/search/nl2sql/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, role: "SCRB_ADMIN", session_id: sessionId ? String(sessionId) : undefined }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Failed to connect to stream");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Stream reader unavailable");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.meta && onMeta) {
            onMeta(parsed.meta);
          } else if (parsed.thinking && onThinking) {
            onThinking(parsed.thinking);
          } else if (parsed.token) {
            if (parsed.token === "[DONE]") break;
            onToken(parsed.token);
          } else if (parsed.error && onError) {
            onError(parsed.error);
          }
        } catch {
          // ignore chunk parse errors
        }
      }
    }
  },
};
