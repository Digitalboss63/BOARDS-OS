/**
 * SystemHealthBadge — shows platform health status in coach-friendly language.
 * Used in a diagnostics/admin area. Never exposes raw error messages.
 */

import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemHealthFull, type SystemHealthFull } from "@/lib/boards-api";

type HealthScore = "healthy" | "needs_attention" | "error" | "loading";

function scoreHealth(data: SystemHealthFull): HealthScore {
  if (data.database === "error") return "error";
  if (data.telemetry === "error") return "needs_attention";
  if (data.env !== "loaded")      return "needs_attention";
  if (data.database !== "ok")     return "needs_attention";
  return "healthy";
}

const SCORE_CONFIG: Record<HealthScore, { label: string; icon: React.ElementType; className: string; detail: string }> = {
  healthy:        { label: "Platform Healthy",     icon: CheckCircle,   className: "text-emerald-400", detail: "All systems are operating normally." },
  needs_attention:{ label: "Needs Attention",      icon: AlertTriangle, className: "text-yellow-400",  detail: "One or more systems may need a check." },
  error:          { label: "Service Disruption",   icon: XCircle,       className: "text-destructive",  detail: "A core system is unavailable. Check your connection or contact support." },
  loading:        { label: "Checking…",            icon: RefreshCw,     className: "text-muted-foreground", detail: "" },
};

interface Props {
  className?: string;
  showDetail?: boolean;
}

export function SystemHealthBadge({ className, showDetail = true }: Props) {
  const [score, setScore] = useState<HealthScore>("loading");
  const [refreshing, setRefreshing] = useState(false);

  const check = async () => {
    setRefreshing(true);
    try {
      const data = await fetchSystemHealthFull();
      setScore(scoreHealth(data));
    } catch {
      setScore("error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { check(); }, []);

  const cfg = SCORE_CONFIG[score];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", cfg.className, refreshing && "animate-spin")} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", cfg.className)}>{cfg.label}</p>
        {showDetail && cfg.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">{cfg.detail}</p>
        )}
      </div>
      <button
        onClick={check}
        disabled={refreshing}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        title="Refresh status"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </button>
    </div>
  );
}
