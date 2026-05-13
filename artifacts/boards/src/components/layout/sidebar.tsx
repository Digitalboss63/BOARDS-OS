import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Calendar, 
  Trophy, 
  Target 
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Command Center", icon: LayoutDashboard },
    { href: "/roster", label: "Roster", icon: Users },
    { href: "/teams", label: "Teams", icon: Shield },
    { href: "/practices", label: "Practices", icon: Calendar },
    { href: "/games", label: "Games", icon: Trophy },
    { href: "/scouting", label: "Scouting", icon: Target },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-display font-bold tracking-wider text-primary uppercase">BOARDS</h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-sans font-medium">Ops & Intel</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
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
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
