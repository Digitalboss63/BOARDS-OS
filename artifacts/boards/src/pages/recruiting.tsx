import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Prospect {
  name: string;
  height: string;
  pos: string;
  classYear: number;
  school: string;
  fit: number;
  note: string;
}

type Pipeline = Record<string, Prospect[]>;

const prospects: Pipeline = {
  IDENTIFIED: [
    {
      name: "Darius Cole",
      height: "6'4\"",
      pos: "SG",
      classYear: 2027,
      school: "Jefferson HS",
      fit: 72,
      note: "Athletic off-guard with upside. Needs to see more film.",
    },
    {
      name: "Malik Thompson",
      height: "6'7\"",
      pos: "PF",
      classYear: 2026,
      school: "Northside HS",
      fit: 65,
      note: "Interior presence. Academic eligibility concern.",
    },
  ],
  EVALUATING: [
    {
      name: "Jordan Reese",
      height: "6'1\"",
      pos: "PG",
      classYear: 2027,
      school: "Eastview Prep",
      fit: 84,
      note: "Elite floor general. Top 50 in state. High academic profile.",
    },
    {
      name: "Cam Williams",
      height: "6'3\"",
      pos: "SG",
      classYear: 2026,
      school: "Metro Academy",
      fit: 78,
      note: "Scorer. Has 3 other offers. Need to move fast.",
    },
    {
      name: "Tyler Brooks",
      height: "6'6\"",
      pos: "SF",
      classYear: 2027,
      school: "Regional Charter",
      fit: 70,
      note: "Long, athletic. Raw but projectable. Program fit is strong.",
    },
  ],
  HIGH_INTEREST: [
    {
      name: "Devon Harris",
      height: "6'2\"",
      pos: "PG",
      classYear: 2026,
      school: "Westside Prep",
      fit: 91,
      note: "Best PG in class. Elite IQ. Visit scheduled.",
    },
    {
      name: "Marcus Reid",
      height: "6'5\"",
      pos: "SF",
      classYear: 2027,
      school: "Eastside Eagles",
      fit: 88,
      note: "Current player considering staying. 4-star upside.",
    },
  ],
  COMMITTED: [
    {
      name: "James Carter",
      height: "6'0\"",
      pos: "PG",
      classYear: 2026,
      school: "Lincoln Academy",
      fit: 95,
      note: "Program fit is perfect. Early commit. Honor roll student.",
    },
  ],
};

const columnLabels: Record<string, string> = {
  IDENTIFIED: "Identified",
  EVALUATING: "Evaluating",
  HIGH_INTEREST: "High Interest",
  COMMITTED: "Committed",
};

function getFitClass(fit: number): string {
  if (fit >= 90) return "text-emerald-400 font-bold";
  if (fit >= 75) return "text-primary font-bold";
  return "text-muted-foreground font-semibold";
}

export default function RecruitingBoard() {
  const columns = Object.keys(prospects);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">
          Recruiting Board
        </h1>
        <p className="text-muted-foreground mt-1">Prospect tracking and program pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colProspects = prospects[col];
          const isCommitted = col === "COMMITTED";
          return (
            <div key={col} className="flex flex-col gap-3">
              {/* Column header */}
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded border",
                  isCommitted
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/20 border-border/50"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    isCommitted ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {columnLabels[col]}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    isCommitted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {colProspects.length}
                </span>
              </div>

              {/* Cards */}
              {colProspects.map((p) => (
                <Card
                  key={p.name}
                  className={cn(
                    "border-border/50 bg-card/50 hover:border-primary/50 transition-colors",
                    isCommitted && "border-primary/20"
                  )}
                >
                  <CardContent className="p-4">
                    {/* Name */}
                    <h3 className="font-display font-bold uppercase tracking-wide text-sm leading-tight mb-1">
                      {p.name}
                    </h3>

                    {/* Height + Pos */}
                    <p className="text-xs text-muted-foreground mb-2">
                      {p.height} · {p.pos}
                    </p>

                    {/* Class year badge */}
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider mb-2">
                      Class of {p.classYear}
                    </Badge>

                    {/* School */}
                    <p className="text-xs text-muted-foreground mb-3">{p.school}</p>

                    {/* Fit score */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Fit
                      </span>
                      <span className={cn("text-base", getFitClass(p.fit))}>{p.fit}</span>
                      <span className="text-[10px] text-muted-foreground">/100</span>
                    </div>

                    {/* Note */}
                    <p className="text-xs italic text-muted-foreground leading-relaxed">{p.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
