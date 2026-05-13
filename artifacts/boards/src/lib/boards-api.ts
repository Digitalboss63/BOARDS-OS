/**
 * boards-api.ts
 *
 * Typed fetch functions for Phase 6 endpoints that are not yet in the
 * auto-generated OpenAPI client. Pattern matches the existing customFetch usage.
 *
 * Default programId = 1 (Eastside Eagles seed program).
 * Will become dynamic in Phase 7 when auth/program-switching exists.
 */

export const DEFAULT_PROGRAM_ID = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachingEvent {
  id: number;
  programId: number;
  category: string;
  eventType: string;
  title: string;
  description: string | null;
  actorId: string;
  actorRole: string | null;
  refTable: string | null;
  refId: number | null;
  playerId: number | null;
  metadata: Record<string, unknown> | null;
  importance: number;
  occurredAt: string;
  createdAt: string;
}

export interface Recommendation {
  id: number;
  programId: number;
  playerId: number | null;
  recommendationType: string;
  priority: number;
  headline: string;
  detail: string | null;
  suggestedAction: string | null;
  status: string;
  generatedBy: string;
  expiresAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface StaffNote {
  id: number;
  programId: number;
  targetType: string;
  targetId: number | null;
  content: string;
  authorId: string;
  authorRole: string | null;
  visibility: string;
  isPinned: number;
  tag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthFull {
  server: string;
  database: string;
  ai: string;
  env: string;
  telemetry: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Coaching Events ──────────────────────────────────────────────────────────

export async function fetchCoachingTimeline(programId = DEFAULT_PROGRAM_ID): Promise<CoachingEvent[]> {
  return apiFetch<CoachingEvent[]>(`/api/coaching-events/timeline?programId=${programId}`);
}

export async function createCoachingEvent(event: {
  programId?: number;
  category: string;
  eventType: string;
  title: string;
  description?: string;
  actorId?: string;
  actorRole?: string;
  refTable?: string;
  refId?: number;
  playerId?: number;
  metadata?: Record<string, unknown>;
  importance?: number;
}): Promise<CoachingEvent> {
  return apiFetch<CoachingEvent>("/api/coaching-events", {
    method: "POST",
    body: JSON.stringify({ programId: DEFAULT_PROGRAM_ID, ...event }),
  });
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function fetchRecommendations(programId = DEFAULT_PROGRAM_ID): Promise<Recommendation[]> {
  return apiFetch<Recommendation[]>(`/api/recommendations?programId=${programId}`);
}

export async function dismissRecommendation(id: number): Promise<void> {
  return apiFetch<void>(`/api/recommendations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "dismissed", actorId: "coach" }),
  });
}

export async function acknowledgeRecommendation(id: number): Promise<void> {
  return apiFetch<void>(`/api/recommendations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "acknowledged", actorId: "coach" }),
  });
}

// ─── Staff Notes ──────────────────────────────────────────────────────────────

export async function fetchStaffNotes(params: {
  programId?: number;
  targetType?: string;
  targetId?: number;
}): Promise<StaffNote[]> {
  const { programId = DEFAULT_PROGRAM_ID, targetType, targetId } = params;
  const qs = new URLSearchParams({ programId: String(programId) });
  if (targetType) qs.set("targetType", targetType);
  if (targetId) qs.set("targetId", String(targetId));
  return apiFetch<StaffNote[]>(`/api/staff-notes?${qs}`);
}

export async function createStaffNote(note: {
  targetType: string;
  targetId?: number;
  content: string;
  authorId?: string;
  visibility?: "private" | "staff" | "program";
  tag?: string;
}): Promise<StaffNote> {
  return apiFetch<StaffNote>("/api/staff-notes", {
    method: "POST",
    body: JSON.stringify({
      programId: DEFAULT_PROGRAM_ID,
      authorId: "coach",
      visibility: "staff",
      ...note,
    }),
  });
}

// ─── System Health ─────────────────────────────────────────────────────────────

export async function fetchSystemHealthFull(): Promise<SystemHealthFull> {
  return apiFetch<SystemHealthFull>("/api/health/full");
}

// ─── Feature Tracking (fire-and-forget) ──────────────────────────────────────

/**
 * trackFeature — log a coaching event for feature usage telemetry.
 * Never throws — errors are silently swallowed.
 * Call without await.
 */
export function trackFeature(eventType: string, title: string, metadata?: Record<string, unknown>): void {
  createCoachingEvent({
    category: "system",
    eventType,
    title,
    actorId: "coach",
    importance: 1,
    metadata,
  }).catch(() => {
    // Intentionally silent — telemetry failures must never affect coaching workflows
  });
}
