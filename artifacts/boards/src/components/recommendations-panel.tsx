/**
 * RecommendationsPanel — surfaces pending coaching recommendations.
 * Used on the Command Center dashboard.
 * Coaching language only. No developer/admin jargon.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, X, CheckCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchRecommendations,
  dismissRecommendation,
  acknowledgeRecommendation,
  type Recommendation,
} from "@/lib/boards-api";

const PRIORITY_CONFIG: Record<number, { label: string; className: string }> = {
  5: { label: "Urgent",  className: "bg-destructive/20 text-destructive border-destructive/30" },
  4: { label: "High",    className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  3: { label: "Notable", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  2: { label: "Low",     className: "bg-muted/60 text-muted-foreground border-border" },
  1: { label: "Info",    className: "bg-muted/40 text-muted-foreground border-border" },
};

function getPriority(p: number) {
  return PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG[1];
}

export function RecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchRecommendations()
      .then(setRecommendations)
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = async (id: number) => {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDismissing((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleAcknowledge = async (id: number) => {
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await acknowledgeRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDismissing((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm bg-card/50">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg font-display uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm bg-card/50">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-lg font-display uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Coaching Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Your program is on track. No action items right now.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Insights appear here when your program needs attention.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm bg-card/50">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Coaching Insights
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">{recommendations.length} active</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/50">
        {recommendations.map((rec) => {
          const priority = getPriority(rec.priority);
          const busy = dismissing.has(rec.id);

          return (
            <div key={rec.id} className="p-4 group hover:bg-muted/5 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                      priority.className
                    )}>
                      {priority.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug">{rec.headline}</p>
                  {rec.detail && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.detail}</p>
                  )}
                  {rec.suggestedAction && (
                    <div className="flex items-center gap-1 mt-2">
                      <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                      <p className="text-xs text-primary font-medium">{rec.suggestedAction}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => handleAcknowledge(rec.id)}
                    disabled={busy}
                    title="Got it"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDismiss(rec.id)}
                    disabled={busy}
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
