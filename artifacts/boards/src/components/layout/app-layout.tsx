import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground dark selection:bg-primary/30">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-display font-bold tracking-wider text-primary uppercase">BOARDS</h1>
      </div>

      {/* Main content */}
      <main className="md:pl-64">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-12" />
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
