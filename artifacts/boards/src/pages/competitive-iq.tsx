import {
  AlertTriangle,
  TrendingDown,
  Users,
  Thermometer,
  Shield,
  Battery,
  Zap,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "WARNING" | "ALERT" | "INFO" | "POSITIVE";

interface Insight {
  type: string;
  severity: Severity;
  headline: string;
  detail: string;
  icon: string;
}

const insights: Insight[] = [
  {
    type: "TURNOVER TREND",
    severity: "WARNING",
    headline: "Your offense stalls when both primary ball handlers sit.",
    detail:
      "In the last 3 games, turnover rate jumps from 14% to 22% when Jordan and Marcus are off the floor together. Your third ball handler needs reps.",
    icon: "AlertTriangle",
  },
  {
    type: "REBOUNDING",
    severity: "ALERT",
    headline: "You're getting outrebounded on the offensive glass by 4.2 per game.",
    detail:
      "Teams are sealing your guards off the shot. Consider sending a third rebounder or adjusting your crash assignments.",
    icon: "TrendingDown",
  },
  {
    type: "LINEUP",
    severity: "INFO",
    headline: "Your best defensive lineup hasn't played more than 8 minutes together.",
    detail:
      "The Marcus/Tyler/Devon three-man unit has held opponents to 0.78 PPP. They need more minutes in close games.",
    icon: "Users",
  },
  {
    type: "SCORING",
    severity: "WARNING",
    headline: "Your offense goes cold in the 4th quarter — averaging 14 points in final frames.",
    detail:
      "Shot quality drops late. Whether it's fatigue or play breakdown, your closing sets need attention.",
    icon: "Thermometer",
  },
  {
    type: "DEFENSE",
    severity: "POSITIVE",
    headline: "Your half-court defense is elite — top 15% of programs at this level.",
    detail:
      "Opponents average only 0.81 PPP in your half-court sets. Your scheme is working. Don't over-adjust.",
    icon: "Shield",
  },
  {
    type: "FATIGUE",
    severity: "WARNING",
    headline: "Three rotation players are logging 30+ minutes every game.",
    detail:
      "Devon, Marcus, and Tyler are your most important players AND your most-used ones. Depth at those spots needs development.",
    icon: "Battery",
  },
  {
    type: "IDENTITY",
    severity: "POSITIVE",
    headline: "Your team plays faster than 80% of programs at your level.",
    detail:
      "Pace is your identity. When you slow down — usually in the 2nd quarter — your offense struggles. Feed the pace.",
    icon: "Zap",
  },
  {
    type: "OPPORTUNITY",
    severity: "INFO",
    headline: "Opponents' best guards are struggling against your full-court pressure.",
    detail:
      "You've forced 11 early-game turnovers in the last 4 games with your press. Consider running it more consistently to start games.",
    icon: "Target",
  },
];

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  TrendingDown,
  Users,
  Thermometer,
  Shield,
  Battery,
  Zap,
  Target,
};

function getSeverityBorderClass(severity: Severity): string {
  switch (severity) {
    case "WARNING":
      return "border-l-yellow-500";
    case "ALERT":
      return "border-l-destructive";
    case "INFO":
      return "border-l-muted-foreground/40";
    case "POSITIVE":
      return "border-l-emerald-500";
  }
}

function getSeverityBadgeClass(severity: Severity): string {
  switch (severity) {
    case "WARNING":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "ALERT":
      return "bg-destructive/20 text-destructive border-destructive/30";
    case "INFO":
      return "bg-muted/60 text-muted-foreground border-border";
    case "POSITIVE":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  }
}

export default function CompetitiveIQ() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Competitive IQ</h1>
        <p className="text-muted-foreground mt-1">
          Pattern recognition and situational awareness for your program.
        </p>
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight) => {
          const IconComponent = iconMap[insight.icon];
          return (
            <Card
              key={insight.type}
              className={cn(
                "border-border/50 bg-card/50 border-l-4 transition-colors hover:border-l-4",
                getSeverityBorderClass(insight.severity)
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
                        getSeverityBadgeClass(insight.severity)
                      )}
                    >
                      {insight.severity}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {insight.type}
                    </span>
                  </div>
                  {IconComponent && (
                    <IconComponent className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
                <p className="font-medium text-foreground mb-2 leading-snug">{insight.headline}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{insight.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Coaching focus card */}
      <Card className="border-primary/30 bg-primary/10">
        <CardContent className="p-6">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
            Coaching Focus This Week
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0 pt-0.5 min-w-[5rem]">
                Primary
              </span>
              <p className="text-sm text-foreground font-medium">
                Ball handler development — reps for your backup PG in live situations
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5 min-w-[5rem]">
                Secondary
              </span>
              <p className="text-sm text-foreground">
                Offensive rebounding assignments — film review + rep the adjustments
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5 min-w-[5rem]">
                Watch For
              </span>
              <p className="text-sm text-muted-foreground italic">
                Late-game shot quality — chart it in your next two games
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
