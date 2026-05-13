import { useState } from "react";
import { useListPlayers, useListTeams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

type Readiness = "READY" | "DEVELOPING" | "BUILDING";

interface DevProfile {
  strengths: string;
  devPriority: string;
  readiness: Readiness;
  nextAction: string;
}

const DEV_PROFILES: Record<string, DevProfile> = {
  PG: {
    strengths: "Court vision, ball pressure defense",
    devPriority: "Off-screen shooting, pick-and-roll reads",
    readiness: "READY",
    nextAction: "Work 15 min post feed reads before next practice",
  },
  SG: {
    strengths: "Catch-and-shoot, off-ball movement",
    devPriority: "Shot creation off dribble",
    readiness: "DEVELOPING",
    nextAction: "20 min pull-up mid-range series, film 3 clips of their footwork",
  },
  SF: {
    strengths: "Versatile defender, rebounding",
    devPriority: "Post footwork, mid-range game",
    readiness: "READY",
    nextAction: "Add post touches in early offense — set plays to feature them",
  },
  PF: {
    strengths: "Interior scoring, screen setting",
    devPriority: "Perimeter shooting, defensive rotations",
    readiness: "BUILDING",
    nextAction: "Shooting form work daily — 100 catch-and-shoot reps before practice",
  },
  C: {
    strengths: "Rim protection, rebounding",
    devPriority: "Passing out of pick-and-roll, mobility",
    readiness: "DEVELOPING",
    nextAction: "PnR passing reads — 3 live reps per practice minimum",
  },
};

const DEFAULT_PROFILE: DevProfile = {
  strengths: "Multi-position versatility",
  devPriority: "Positional skill refinement",
  readiness: "DEVELOPING",
  nextAction: "Identify primary development focus with coaching staff",
};

function getReadinessBadgeClass(readiness: Readiness): string {
  switch (readiness) {
    case "READY":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "DEVELOPING":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "BUILDING":
      return "bg-muted/60 text-muted-foreground border-border";
  }
}

export default function PlayerLab() {
  const [search, setSearch] = useState("");

  const { data: players, isLoading } = useListPlayers();
  const { data: teams } = useListTeams();

  const filtered = players?.filter((p) => {
    const q = search.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const pos = (p.position || "").toLowerCase();
    return fullName.includes(q) || pos.includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Player Lab</h1>
        <p className="text-muted-foreground mt-1">Individual development profiles and readiness tracking.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or position…"
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <Skeleton className="h-10 w-16 mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border/50 border-dashed">
          {search ? `No players match "${search}"` : "No players found. Add players in the Roster page."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map((player) => {
            const team = teams?.find((t) => t.id === player.teamId);
            const pos = player.position || "";
            const profile = DEV_PROFILES[pos] ?? DEFAULT_PROFILE;

            return (
              <Card
                key={player.id}
                className="border-border/50 bg-card/50 hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-6">
                  {/* Header: jersey + name + position */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-5xl font-display font-bold text-primary/30 leading-none min-w-[3rem] text-right">
                      {player.jerseyNumber != null ? `#${player.jerseyNumber}` : "#—"}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold uppercase tracking-wide text-lg leading-tight">
                        {player.lastName}, {player.firstName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {pos && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2">
                            {pos}
                          </Badge>
                        )}
                        {team && (
                          <span className="text-xs text-muted-foreground truncate">{team.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dev Profile */}
                  <div className="space-y-3 border-t border-border/50 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                        Strengths
                      </p>
                      <p className="text-sm text-foreground">{profile.strengths}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                        Dev Priority
                      </p>
                      <p className="text-sm text-foreground">{profile.devPriority}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Readiness
                      </p>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                          getReadinessBadgeClass(profile.readiness)
                        )}
                      >
                        {profile.readiness}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                        Next Action
                      </p>
                      <p className="text-sm italic text-muted-foreground">{profile.nextAction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
