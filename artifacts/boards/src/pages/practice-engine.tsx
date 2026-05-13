import { useState } from "react";
import { Link } from "wouter";
import { useListPractices, useListTeams } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Zap, Clock, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FocusArea = "Offense" | "Defense" | "Transition" | "Special Situations" | "Full Team" | "Individual Development";

export default function PracticeEngine() {
  const [practiceLength, setPracticeLength] = useState<string>("90");
  const [teamLevel, setTeamLevel] = useState<string>("Varsity");
  const [recentIssue, setRecentIssue] = useState<string>("");
  const [opponentConcern, setOpponentConcern] = useState<string>("");
  const [focusArea, setFocusArea] = useState<FocusArea>("Full Team");
  const [showPlan, setShowPlan] = useState(false);

  const { data: practices, isLoading: practicesLoading } = useListPractices();
  const { data: teams } = useListTeams();

  const getSkillDevelopmentDesc = (): string => {
    switch (focusArea) {
      case "Defense":
        return "Defensive slides, help rotations, closeout technique";
      case "Offense":
        return "Shooting off movement, DHO series, screening actions";
      case "Transition":
        return "Transition offense reads, outlet passes, numbers advantages";
      default:
        return "Fundamental skill work — position-specific development";
    }
  };

  const getTeamConceptDesc = (): string => {
    if (opponentConcern.trim()) {
      return "Opponent-specific preparation: " + opponentConcern.trim().slice(0, 60);
    }
    return "5-on-5 half-court, emphasizing execution of primary sets";
  };

  const getCoachingEmphasis = (): string => {
    if (recentIssue.trim()) {
      return (
        "Based on recent film: address " +
        recentIssue.trim().slice(0, 80) +
        ". Reps fix habits — run it until it's automatic."
      );
    }
    return "Focus on communication and effort-based execution today.";
  };

  const planSections = [
    {
      name: "WARMUP",
      duration: "10 min",
      desc: "Dynamic movement, ballhandling series, competitive layup lines",
    },
    {
      name: "SKILL DEVELOPMENT",
      duration: "25 min",
      desc: getSkillDevelopmentDesc(),
    },
    {
      name: "TEAM CONCEPT",
      duration: "30 min",
      desc: getTeamConceptDesc(),
    },
    {
      name: "COMPETITIVE DRILL",
      duration: "20 min",
      desc: "3-on-3 shell, live transition, or competitive scrimmage segment",
    },
    {
      name: "CONDITIONING",
      duration: "10 min",
      desc: "Suicides, court sprints, or competitive conditioning game",
    },
    {
      name: "COACHING EMPHASIS",
      duration: null,
      desc: getCoachingEmphasis(),
    },
    {
      name: "CLOSING MESSAGE",
      duration: null,
      desc: "Every rep counts. Championship habits are built in practice.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Practice Engine</h1>
        <p className="text-muted-foreground mt-1">Build smarter practice plans. Run better sessions.</p>
      </div>

      <Tabs defaultValue="plan-builder">
        <TabsList className="mb-6">
          <TabsTrigger value="plan-builder" className="font-display uppercase tracking-wider text-xs">
            Plan Builder
          </TabsTrigger>
          <TabsTrigger value="session-library" className="font-display uppercase tracking-wider text-xs">
            Session Library
          </TabsTrigger>
        </TabsList>

        {/* ── PLAN BUILDER ── */}
        <TabsContent value="plan-builder" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Practice Length
                  </Label>
                  <Select value={practiceLength} onValueChange={setPracticeLength}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                      <SelectItem value="150">150 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team Level
                  </Label>
                  <Select value={teamLevel} onValueChange={setTeamLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Varsity">Varsity</SelectItem>
                      <SelectItem value="JV">JV</SelectItem>
                      <SelectItem value="Freshman">Freshman</SelectItem>
                      <SelectItem value="Youth">Youth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Focus Area
                  </Label>
                  <Select value={focusArea} onValueChange={(v) => setFocusArea(v as FocusArea)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Offense">Offense</SelectItem>
                      <SelectItem value="Defense">Defense</SelectItem>
                      <SelectItem value="Transition">Transition</SelectItem>
                      <SelectItem value="Special Situations">Special Situations</SelectItem>
                      <SelectItem value="Full Team">Full Team</SelectItem>
                      <SelectItem value="Individual Development">Individual Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Issue from Film (optional)
                  </Label>
                  <Textarea
                    value={recentIssue}
                    onChange={(e) => setRecentIssue(e.target.value)}
                    placeholder="e.g. Defensive rotations were late on skip passes..."
                    className="min-h-[90px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Opponent Concern (optional)
                  </Label>
                  <Textarea
                    value={opponentConcern}
                    onChange={(e) => setOpponentConcern(e.target.value)}
                    placeholder="e.g. They run a lot of ball screen action..."
                    className="min-h-[90px] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setShowPlan(true)}
                  className="font-display uppercase tracking-wider font-semibold"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Practice Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {showPlan && (
            <Card className="border-primary/30 bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                      Generated Plan
                    </p>
                    <h2 className="text-xl font-display font-bold uppercase tracking-wide">
                      {teamLevel} — {focusArea} Focus · {practiceLength} min
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlan(false)}
                    className="text-muted-foreground text-xs uppercase tracking-wider"
                  >
                    Clear
                  </Button>
                </div>

                <div className="space-y-0">
                  {planSections.map((section, i) => (
                    <div
                      key={section.name}
                      className={cn(
                        "flex gap-4 pl-4 border-l-2 border-primary pb-5",
                        i === planSections.length - 1 && "pb-0"
                      )}
                    >
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {section.name}
                          </span>
                          {section.duration && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider px-2 py-0">
                              <Clock className="h-2.5 w-2.5 mr-1" />
                              {section.duration}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{section.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── SESSION LIBRARY ── */}
        <TabsContent value="session-library" className="space-y-6">
          <div className="flex justify-end">
            <Link href="/practices">
              <Button variant="outline" className="font-display uppercase tracking-wider text-xs font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                Schedule New Session
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {practicesLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="border-border/50 bg-card/50">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
            ) : practices?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
                No sessions yet. Schedule one in the Practices page.
              </div>
            ) : (
              practices?.map((practice) => {
                const team = teams?.find((t) => t.id === practice.teamId);
                const date = new Date(practice.scheduledAt);
                return (
                  <Card
                    key={practice.id}
                    className="border-border/50 shadow-sm bg-card/50 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-40 bg-muted/20 p-5 flex flex-col justify-center items-center border-r border-border/50 text-center shrink-0">
                        <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                          {format(date, "MMM")}
                        </div>
                        <div className="text-4xl font-display font-bold leading-none mb-1">
                          {format(date, "dd")}
                        </div>
                        <div className="flex items-center text-muted-foreground text-xs font-medium">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(date, "h:mm a")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{practice.durationMinutes} mins</div>
                      </div>
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-display font-bold uppercase tracking-wide">
                            {team ? team.name : "Unknown Team"}
                          </h3>
                          <Badge
                            variant={
                              practice.status === "completed"
                                ? "secondary"
                                : practice.status === "cancelled"
                                ? "destructive"
                                : "default"
                            }
                            className="uppercase text-[10px] tracking-wider"
                          >
                            {practice.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                            Focus:
                          </span>
                          <span className="text-sm text-foreground font-medium">{practice.focus}</span>
                        </div>
                        {practice.drills && (
                          <div className="mt-2 bg-background/50 border border-border/50 rounded p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Script
                            </p>
                            <p className="text-xs whitespace-pre-wrap font-mono text-muted-foreground line-clamp-2">
                              {practice.drills}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
