import { useGetDashboardSummary, useGetUpcomingEvents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Calendar, Trophy, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { CoachingTimeline } from "@/components/coaching-timeline";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: events, isLoading: loadingEvents } = useGetUpcomingEvents();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-wide text-foreground">Command Center</h1>
        <p className="text-muted-foreground mt-1">Program health and operational overview.</p>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Players"   value={summary?.totalPlayers}   icon={Users}    loading={loadingSummary} />
        <MetricCard title="Active Teams"    value={summary?.totalTeams}     icon={Shield}   loading={loadingSummary} />
        <MetricCard title="Upcoming Games"  value={summary?.upcomingGames}  icon={Trophy}   loading={loadingSummary} />
        <MetricCard title="Scouting Intel"  value={summary?.scoutingReports} icon={Target}  loading={loadingSummary} />
      </div>

      {/* ── Main grid: Schedule + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming schedule — takes 2 cols */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm bg-card/50">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg font-display uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : events && events.length > 0 ? (
              <div className="divide-y divide-border/50">
                {events.map((event) => (
                  <div key={event.id} className="p-3 md:p-4 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-muted/30 px-2 py-1.5 md:px-3 md:py-2 rounded text-center min-w-[3rem] md:min-w-[4rem] flex-shrink-0">
                        <div className="text-[10px] md:text-xs font-semibold text-primary uppercase">
                          {new Date(event.scheduledAt).toLocaleString("en-US", { month: "short" })}
                        </div>
                        <div className="text-base md:text-lg font-display font-bold leading-none">
                          {new Date(event.scheduledAt).getDate()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-foreground text-sm md:text-base truncate">{event.title}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="truncate">{event.teamName}</span>
                          {event.location && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] md:text-xs font-mono text-muted-foreground bg-muted/20 px-1.5 md:px-2 py-1 rounded flex-shrink-0">
                      {event.type.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No upcoming events scheduled.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coaching Insights — right col */}
        <RecommendationsPanel />
      </div>

      {/* ── Program Activity Timeline ── */}
      <CoachingTimeline limit={25} />
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, loading }: {
  title: string;
  value?: number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <CardContent className="p-6 relative z-10">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className="mt-2 flex items-baseline gap-2">
          {loading ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">{value || 0}</h2>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
