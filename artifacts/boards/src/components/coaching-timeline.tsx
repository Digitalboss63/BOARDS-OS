/**
 * CoachingTimeline — program activity feed showing recent coaching events.
 * Grouped by date. Coaching language. Simple and readable.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Dumbbell, Film, BookOpen, Users, Trophy, Target, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCoachingTimeline, type CoachingEvent } from "@/lib/boards-api";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  practice:     { label: "Practice",     icon: Zap,          color: "text-primary" },
  workout:      { label: "Workout",      icon: Dumbbell,     color: "text-orange-400" },
  film_session: { label: "Film",         icon: Film,         color: "text-purple-400" },
  player_note:  { label: "Player Note",  icon: MessageSquare, color: "text-blue-400" },
  recruiting:   { label: "Recruiting",   icon: Users,        color: "text-emerald-400" },
  game:         { label: "Game",         icon: Trophy,       color: "text-yellow-400" },
  scouting:     { label: "Scouting",     icon: Target,       color: "text-red-400" },
  staff_action: { label: "Staff",        icon: BookOpen,     color: "text-muted-foreground" },
  system:       { label: "System",       icon: Activity,     color: "text-muted-foreground/50" },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? { label: category, icon: Activity, color: "text-muted-foreground" };
}

// ─── Date grouping ────────────────────────────────────────────────────────────

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(events: CoachingEvent[]): Array<{ label: string; events: CoachingEvent[] }> {
  const map = new Map<string, CoachingEvent[]>();
  for (const e of events) {
    const key = new Date(e.occurredAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([key, evs]) => ({
    label: formatGroupDate(evs[0].occurredAt),
    events: evs,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function CoachingTimeline({ limit = 20, showHeader = true, className }: Props) {
  const [events, setEvents] = useState<CoachingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoachingTimeline()
      .then((data) => setEvents(data.slice(0, limit)))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const groups = groupByDate(events);

  const inner = (
    <>
      {loading ? (
        <div className="p-4 space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No coaching activity logged yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Activity appears here as you use Practice Engine, Film Room, and Player Lab.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-2 bg-muted/10">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.label}</p>
              </div>
              {group.events.map((event) => {
                const cat = getCategoryConfig(event.category);
                const CatIcon = cat.icon;
                // Skip system events from visible timeline — they're noise
                if (event.category === "system") return null;
                return (
                  <div key={event.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/5 transition-colors">
                    <div className={cn("mt-0.5 flex-shrink-0", cat.color)}>
                      <CatIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {new Date(event.occurredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {event.importance >= 4 && (
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider border border-primary/30 rounded px-1 py-0.5 flex-shrink-0">
                        Key
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!showHeader) return <div className={className}>{inner}</div>;

  return (
    <Card className={cn("border-border/50 shadow-sm bg-card/50", className)}>
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-display uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Program Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {inner}
      </CardContent>
    </Card>
  );
}
