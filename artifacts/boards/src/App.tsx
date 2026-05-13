import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/dashboard";
import Roster from "@/pages/roster";
import Teams from "@/pages/teams";
import Practices from "@/pages/practices";
import Games from "@/pages/games";
import Scouting from "@/pages/scouting";
import PlayerLab from "@/pages/player-lab";
import PracticeEngine from "@/pages/practice-engine";
import GamePrep from "@/pages/game-prep";
import FilmRoom from "@/pages/film-room";
import CompetitiveIQ from "@/pages/competitive-iq";
import RecruitingBoard from "@/pages/recruiting";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/roster" component={Roster} />
        <Route path="/teams" component={Teams} />
        <Route path="/practices" component={Practices} />
        <Route path="/games" component={Games} />
        <Route path="/scouting" component={Scouting} />
        <Route path="/player-lab" component={PlayerLab} />
        <Route path="/practice-engine" component={PracticeEngine} />
        <Route path="/game-prep" component={GamePrep} />
        <Route path="/film-room" component={FilmRoom} />
        <Route path="/competitive-iq" component={CompetitiveIQ} />
        <Route path="/recruiting" component={RecruitingBoard} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
