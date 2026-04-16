import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HardDrive, Key, ShieldCheck, Database } from "lucide-react";
import { api } from "@/lib/api";

const items = [
  {
    icon: Database,
    text: "Your data stays on this device",
    sub: "Local SQLite, never sent to any server",
  },
  {
    icon: Key,
    text: "Bring your own API key",
    sub: "OpenAI or Anthropic — stored in macOS Keychain",
  },
  {
    icon: ShieldCheck,
    text: "No accounts, no tracking",
    sub: "Free & open source",
  },
  {
    icon: HardDrive,
    text: "Export backups regularly",
    sub: "Settings → Export Data",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.settings.isWelcomeDismissed().then((dismissed) => {
      if (!dismissed) setOpen(true);
    }).catch(() => {
      // Bridge not ready — no-op
    });
  }, []);

  async function dismiss() {
    try {
      await api.settings.dismissWelcome();
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            Welcome to Interview Copilot
          </DialogTitle>
          <DialogDescription className="text-center">
            100% free & open source
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 my-2">
          {items.map((item) => (
            <li key={item.text} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button onClick={dismiss} className="w-full rounded-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
