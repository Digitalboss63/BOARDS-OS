import { Link } from "wouter";
import {
  useListScoutingReports,
  useListTeams,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type PrepStatus = "COMPLETE" | "IN PROGRESS" | "PENDING";

function getPrepStatus(report: {
  adjustments?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
}): PrepStatus {
  const has = (v: string | null | undefined) => !!v && v.trim().length > 0;
  if (has(report.adjustments) && has(report.strengths) && has(report.weaknesses)) return "COMPLETE";
  if (has(report.adjustments) || has(report.strengths) || has(report.weaknesses)) return "IN PROGRESS";
  return "PENDING";
}

function getPrepBadgeClass(status: PrepStatus): string {
  switch (status) {
    case "COMPLETE":
      return "bg-primary/20 text-primary border-primary/30";
    case "IN PROGRESS":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "PENDING":
      return "bg-muted/60 text-muted-foreground border-border";
  }
}

export default function GamePrep() {
  const { data: reports, isLoading } = useListScoutingReports();
  const { data: teams } = useListTeams();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Game Prep</h1>
        <p className="text-muted-foreground mt-1">Everything your staff needs before tip-off.</p>
      </div>

      <Tabs defaultValue="active-reports">
        <TabsList className="mb-6">
          <TabsTrigger value="active-reports" className="font-display uppercase tracking-wider text-xs">
            Active Reports
          </TabsTrigger>
          <TabsTrigger value="game-day-sheet" className="font-display uppercase tracking-wider text-xs">
            Game Day Sheet
          </TabsTrigger>
        </TabsList>

        {/* ── ACTIVE REPORTS ── */}
        <TabsContent value="active-reports" className="space-y-6">
          <div className="flex justify-end">
            <Link href="/scouting">
              <Button variant="outline" className="font-display uppercase tracking-wider text-xs font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                Add New Report
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="border-border/50 bg-card/50">
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))
            ) : reports?.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
                No scouting reports found.{" "}
                <Link href="/scouting">
                  <span className="text-primary underline cursor-pointer">Add a report</span>
                </Link>{" "}
                to start prepping.
              </div>
            ) : (
              reports?.map((report) => {
                const prepStatus = getPrepStatus(report);
                return (
                  <Card
                    key={report.id}
                    className="border-border/50 shadow-sm bg-card/50 hover:border-primary/50 transition-colors flex flex-col"
                  >
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted/20 rounded border border-border/50">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-display font-bold uppercase tracking-wide">
                              {report.opponentName}
                            </CardTitle>
                            {report.gameDate && (
                              <CardDescription className="text-xs font-mono mt-1">
                                Target: {new Date(report.gameDate).toLocaleDateString()}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            getPrepBadgeClass(prepStatus)
                          )}
                        >
                          {prepStatus}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-muted/10 p-3 rounded border border-border/50">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                            Offensive Sys
                          </p>
                          <p className="text-sm font-medium">{report.offensiveSystem || "Unknown"}</p>
                        </div>
                        <div className="bg-muted/10 p-3 rounded border border-border/50">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                            Defensive Sys
                          </p>
                          <p className="text-sm font-medium">{report.defensiveSystem || "Unknown"}</p>
                        </div>
                      </div>
                      {report.keyPlayers && (
                        <div>
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                            Key Personnel
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{report.keyPlayers}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── GAME DAY SHEET ── */}
        <TabsContent value="game-day-sheet">
          <Card className="bg-card/50 border border-primary/20">
            <CardContent className="p-8">
              {/* Header */}
              <div className="border-b border-primary/20 pb-6 mb-6">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                  Pre-Game Document
                </p>
                <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-foreground">
                  Game Day Sheet
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  Home Team vs. Riverside Academy · Tuesday, May 13, 2026 · 7:00 PM
                </p>
              </div>

              <div className="space-y-6">
                {/* Keys to Win */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Keys to Win
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Control the glass — win offensive rebounds in second-chance possessions",
                      "Limit live-ball turnovers — no careless passes in transition or ball screens",
                      "Execute your closing sets — stay disciplined in the final 4 minutes",
                    ].map((key, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary font-bold shrink-0">→</span>
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Their Threats */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Their Threats
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "#3 Williams — high-volume shooter, lethal off catch-and-shoot. Stay attached on all movements.",
                      "Their transition offense — they push every missed free throw. Sprint back immediately.",
                    ].map((threat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-yellow-500 font-bold shrink-0">⚠</span>
                        {threat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Defensive Game Plan */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Defensive Game Plan
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Run your base man-to-man with aggressive help rotations. Force everything middle — take away
                    the right baseline. Deny their primary ball handler on re-entry. Switch all ball screens on the
                    strong side and communicate early.
                  </p>
                </div>

                {/* Offensive Game Plan */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Offensive Game Plan
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Push pace off every made basket and turnover — they struggle in transition defense. In half-court,
                    attack their help rotations with DHO actions on the weak side. Feature your post in early offense;
                    they are undersized at the 4. Protect the ball and execute your primary sets.
                  </p>
                </div>

                {/* Special Situations */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Special Situations
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "Late-game BLOB: run your primary box-out-of-bounds set — they help aggressively on baseline cuts.",
                      "Press break: stay composed, use your outlet pass rules, and look for the early advantage.",
                    ].map((sit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary font-bold shrink-0">◆</span>
                        {sit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-primary/20 text-center">
                <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-widest">
                  BOARDS-OS · Competitive Intelligence Platform
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
