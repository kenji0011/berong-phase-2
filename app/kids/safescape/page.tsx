"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, BookOpen, Trophy } from "lucide-react";
import Link from "next/link";

interface ProgressData {
  progress: Record<number, {
    moduleNum: number;
    sectionData: Record<string, boolean>;
    completed: boolean;
    completedAt: string | null;
  }>;
  overallProgress: number;
  completedModules: number;
}

export default function SafeScapeHubPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    if (!user?.permissions.accessKids && user?.role !== 'admin') {
      router.push("/");
      return;
    }

    // Fetch user progress
    fetchProgress();
    setLoading(false);
  }, [isAuthenticated, user, router, isLoading]);

  const fetchProgress = async () => {
    try {
      const response = await fetch("/api/kids/safescape/progress");
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  // Listen for progress updates from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SAFESCAPE_PROGRESS_UPDATE") {
        fetchProgress(); // Refresh progress when iframe reports update
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading SafeScape...</p>
        </div>
      </div>
    );
  }

  // Build iframe URL with user params
  const iframeSrc = user
    ? `/modules/index.html?userId=${user.id}&userName=${encodeURIComponent(user.name)}`
    : "/modules/index.html";

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/kids/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-800">SafeScape Fire Safety Course</h1>
            </div>
          </div>

          {/* Progress Summary */}
          {progressData && (
            <div className="flex items-center gap-4 bg-white rounded-lg px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">
                  {progressData.completedModules}/5 Modules
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">
                  {progressData.overallProgress}% Complete
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Iframe */}
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="relative w-full" style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>
              <iframe
                src={iframeSrc}
                className="absolute top-0 left-0 w-full h-full border-0"
                title="SafeScape Fire Safety Course"
                allow="fullscreen"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
