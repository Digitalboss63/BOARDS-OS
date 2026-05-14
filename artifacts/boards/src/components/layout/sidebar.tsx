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
  X,
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

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();

  const navContent = (
    <div className="w-64 border-r border-border bg-sidebar h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold tracking-wider text-primary uppercase">BOARDS</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-sans font-medium">Ops &amp; Intel</p>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
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
                      onClick={onClose}
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

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen z-30">
        {navContent}
      </div>

      {/* Mobile sidebar — slide-in drawer with backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-50 h-full">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
