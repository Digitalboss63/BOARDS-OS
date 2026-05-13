import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Film, Clapperboard, FileText, ChevronRight } from "lucide-react";
import { trackFeature } from "@/lib/boards-api";

interface SavedNote {
  label: string;
  date: string;
  tags: string;
}

const savedNotes: SavedNote[] = [
  {
    label: "vs. Riverside — Game 4",
    date: "May 8, 2026",
    tags: "Defensive rotations, transition discipline",
  },
  {
    label: "Practice Film — Apr 28",
    date: "Apr 28, 2026",
    tags: "Ball screen coverage, offensive spacing",
  },
  {
    label: "vs. Northside — Playoff Prep",
    date: "Apr 20, 2026",
    tags: "Opponent tendencies, personnel notes",
  },
];

const correctionPriorities = [
  "Defensive rotations — help side was consistently late on skip passes",
  "Ball screen coverage — guards going under too often on pull-ups",
  "Transition defense — three players not sprinting back after made baskets",
];

const suggestedDrills = [
  "3-on-3 shell defense — emphasize help side rotation timing",
  "Ball screen coverage — go over/under decision reps",
  "Transition defense sprint drill — auto-sprint rule reinforcement",
];

export default function FilmRoom() {
  const [gameLabel, setGameLabel] = useState("");
  const [filmNotes, setFilmNotes] = useState("");
  const [showPlan, setShowPlan] = useState(false);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-foreground">Film Room</h1>
        <p className="text-muted-foreground mt-1">Turn film observations into action.</p>
      </div>

      {/* ── Section A: Film Notes → Action Plan ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Clapperboard className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Film Notes → Action Plan
          </h2>
        </div>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Game / Session Label (optional)
              </Label>
              <Input
                value={gameLabel}
                onChange={(e) => setGameLabel(e.target.value)}
                placeholder="e.g. vs. Riverside — Game 4"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Film Notes
              </Label>
              <Textarea
                value={filmNotes}
                onChange={(e) => setFilmNotes(e.target.value)}
                placeholder="Paste or type your raw film observations here…"
                className="min-h-[150px] resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!filmNotes.trim()}
                onClick={() => {
                  setShowPlan(true);
                  trackFeature("film_room.action_plan_generated", "Film notes converted to action plan", {
                    hasLabel: !!gameLabel.trim(),
                  });
                }}
                className="font-display uppercase tracking-wider font-semibold"
              >
                <Film className="mr-2 h-4 w-4" />
                Convert Notes to Action Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPlan && (
          <Card className="border-primary/30 bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Action Plan</p>
                  <h3 className="text-lg font-display font-bold uppercase tracking-wide">
                    {gameLabel || "Film Review"}
                  </h3>
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

              {/* Correction Priorities */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Correction Priorities
                </p>
                <ul className="space-y-2">
                  {correctionPriorities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Affected Players */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Affected Players
                </p>
                <p className="text-sm text-foreground">
                  Marcus (PG) — ball screen reads | Devon (SF) — help rotations | Full team — transition discipline
                </p>
              </div>

              {/* Suggested Drills */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Suggested Drills
                </p>
                <ul className="space-y-2">
                  {suggestedDrills.map((drill, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {drill}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Practice Priorities */}
              <div className="bg-muted/20 rounded border border-border/50 p-4">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                  Next Practice Priorities
                </p>
                <p className="text-sm text-foreground">
                  Open with 10 min of transition defense rules. Mid-practice: 20 min ball screen coverage. Film clip
                  review before team concept block.
                </p>
              </div>

              {/* Coaching Emphasis */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Coaching Emphasis
                </p>
                <p className="text-sm text-muted-foreground italic">
                  The breakdowns were systemic, not individual. Re-teach the concepts as a group — don't single
                  players out.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section B: Saved Film Notes ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Saved Film Notes</h2>
        </div>

        <div className="space-y-3">
          {savedNotes.map((note) => (
            <Card
              key={note.label}
              className="border-border/50 bg-card/50 hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{note.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{note.date}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {note.tags.split(", ").map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wider px-2"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 text-xs font-semibold uppercase tracking-wider">
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
