import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Briefcase,
  Settings,
  Moon,
  Sun,
  FileText,
  Coins,
  LayoutDashboard,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/resume", label: "Base CV", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    refreshCosts();
  }, []);

  useEffect(() => {
    function onCostUpdate() {
      refreshCosts();
    }
    window.addEventListener("ic:cost-updated", onCostUpdate);
    return () => window.removeEventListener("ic:cost-updated", onCostUpdate);
  }, []);

  async function refreshCosts() {
    try {
      const costs = await api.costs.get();
      setTotalCost(costs.totalCostUsd);
      setTotalTokens(costs.totalPromptTokens + costs.totalCompletionTokens);
    } catch {
      // Bridge not ready
    }
  }

  function toggleDark() {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
    localStorage.setItem("theme", !dark ? "dark" : "light");
  }

  async function resetCostsAndRefresh() {
    if (confirm("Reset cost tracker to $0?")) {
      try {
        await api.costs.reset();
      } catch {
        // ignore
      }
      setTotalCost(0);
      setTotalTokens(0);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        <Link to="/dashboard" className="mr-8 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <span className="hidden sm:inline font-bold text-sm">Interview Copilot</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2 rounded-full h-8 px-3 text-muted-foreground hover:text-foreground",
                    isActive && "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[13px]">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {totalTokens > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={resetCostsAndRefresh}
                    className="flex items-center gap-1.5 rounded-full h-8 px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span className="font-mono">${totalCost < 0.01 ? totalCost.toFixed(4) : totalCost.toFixed(2)}</span>
                  </button>
                }
              />
              <TooltipContent side="bottom">
                <p className="text-xs">{totalTokens.toLocaleString()} tokens used</p>
                <p className="text-xs text-muted-foreground">Click to reset</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="rounded-full h-8 w-8 text-muted-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
