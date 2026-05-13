/**
 * StaffNotesPanel — display and create staff notes for a target entity.
 * Used inside Player Lab cards and practice detail views.
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin, Plus, Lock, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchStaffNotes,
  createStaffNote,
  type StaffNote,
} from "@/lib/boards-api";

// ─── Visibility config ─────────────────────────────────────────────────────────

const VISIBILITY_CONFIG = {
  private: { label: "Private",  icon: Lock,  className: "text-muted-foreground" },
  staff:   { label: "Staff",    icon: Users, className: "text-blue-400" },
  program: { label: "Program",  icon: Globe, className: "text-emerald-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  targetType: string;
  targetId?: number;
  targetLabel?: string;   // e.g. "Marcus Williams" for empty state messaging
  maxHeight?: string;
}

export function StaffNotesPanel({ targetType, targetId, targetLabel, maxHeight = "max-h-72" }: Props) {
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "staff" | "program">("staff");

  useEffect(() => {
    fetchStaffNotes({ targetType, targetId })
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const note = await createStaffNote({
        targetType,
        targetId,
        content: draft.trim(),
        visibility,
      });
      setNotes((prev) => [note, ...prev]);
      setDraft("");
      setComposing(false);
    } catch {
      // Non-fatal — user can retry
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Staff Notes {notes.length > 0 && <span className="text-primary ml-1">({notes.length})</span>}
        </p>
        {!composing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setComposing(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {/* Compose area */}
      {composing && (
        <div className="space-y-2 rounded border border-border/50 bg-background/50 p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a coaching note…"
            className="min-h-[72px] text-sm resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
            autoFocus
          />
          <div className="flex items-center justify-between">
            {/* Visibility toggle */}
            <div className="flex gap-1">
              {(["private", "staff", "program"] as const).map((v) => {
                const cfg = VISIBILITY_CONFIG[v];
                const VIcon = cfg.icon;
                return (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded border transition-colors",
                      visibility === v
                        ? "border-primary/50 text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <VIcon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setComposing(false); setDraft(""); }}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving || !draft.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !composing ? (
        <p className="text-xs text-muted-foreground italic">
          No notes yet{targetLabel ? ` on ${targetLabel}` : ""}. Add one to start tracking observations.
        </p>
      ) : (
        <div className={cn("space-y-2 overflow-y-auto", maxHeight)}>
          {notes.map((note) => {
            const visCfg = VISIBILITY_CONFIG[note.visibility as keyof typeof VISIBILITY_CONFIG] ?? VISIBILITY_CONFIG.staff;
            const VisIcon = visCfg.icon;
            return (
              <div key={note.id} className="rounded border border-border/40 bg-muted/10 p-3">
                <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {note.isPinned === 1 && <Pin className="h-2.5 w-2.5 text-primary" />}
                  <VisIcon className={cn("h-2.5 w-2.5", visCfg.className)} />
                  <span className={cn("text-[10px] uppercase tracking-wider", visCfg.className)}>{visCfg.label}</span>
                  {note.tag && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-border" />
                      <span className="text-[10px] text-muted-foreground">{note.tag}</span>
                    </>
                  )}
                  <span className="w-0.5 h-0.5 rounded-full bg-border ml-auto" />
                  <span className="text-[10px] font-mono text-muted-foreground/70">
                    {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
