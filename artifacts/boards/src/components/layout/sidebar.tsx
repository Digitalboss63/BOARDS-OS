import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  Zap,
  BookOpen,
  Film,
  Brain,
  Target,
  Star,
  Shield,
  Trophy,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/", label: "Command Center", icon: LayoutDashboard },
      { href: "/player-lab", label: "Player Lab", icon: FlaskConical },
      { href: "/roster", label: "Roster", icon: Users },
    ],
  },
  {
    label: "Game Prep",
    items: [
      { href: "/practice-engine", label: "Practice Engine", icon: Zap },
      { href: "/game-prep", label: "Game Prep", icon: BookOpen },
      { href: "/film-room", label: "Film Room", icon: Film },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/competitive-iq", label: "Competitive IQ", icon: Brain },
      { href: "/scouting", label: "Scouting Intel", icon: Target },
    ],
  },
  {
    label: "Program",
    items: [
      { href: "/recruiting", label: "Recruiting Board", icon: Star },
      { href: "/teams", label: "Teams", icon: Shield },
      { href: "/games", label: "Games", icon: Trophy },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r border-border bg-sidebar h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-display font-bold tracking-wider text-primary uppercase">BOARDS</h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-sans font-medium">Ops &amp; Intel</p>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-3">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 pb-4">
        <div className="border-t border-border/50 pt-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest text-center">
            BOARDS-OS v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
