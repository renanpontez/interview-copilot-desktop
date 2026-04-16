import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Header } from "@/components/layout/header";
import { WelcomeModal } from "@/components/welcome-modal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import DashboardPage from "@/routes/dashboard";
import JobsListPage from "@/routes/jobs/list";
import JobDetailPage from "@/routes/jobs/detail";
import InterviewPage from "@/routes/jobs/interview";
import ResumePage from "@/routes/resume";
import SettingsPage from "@/routes/settings";

export default function App() {
  // Restore theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <TooltipProvider>
      <HashRouter>
        <Header />
        <WelcomeModal />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsListPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route
              path="/jobs/:id/interview/:scenarioId"
              element={<InterviewPage />}
            />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </TooltipProvider>
  );
}
