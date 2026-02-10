"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame } from "lucide-react";
import Link from "next/link";

const MODULE_TITLES: Record<string, string> = {
  "1": "Introduction to Fire Safety",
  "2": "Fire Prevention at Home",
  "3": "Fire Emergency Response",
  "4": "Fire Safety Equipment",
  "5": "Fire Safety Review & Assessment",
};

export default function SafeScapeModulePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params.moduleId as string;
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);

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

    // Validate moduleId
    const moduleNum = parseInt(moduleId);
    if (isNaN(moduleNum) || moduleNum < 1 || moduleNum > 5) {
      router.push("/kids/safescape");
      return;
    }

    setLoading(false);
  }, [isAuthenticated, user, router, moduleId, isLoading]);

  // Listen for progress updates from iframe to sync with API
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SAFESCAPE_SECTION_COMPLETE") {
        const { moduleNum, sectionData, completed } = event.data;

        try {
          await fetch("/api/kids/safescape/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moduleNum, sectionData, completed }),
          });
        } catch (error) {
          console.error("Error syncing progress:", error);
        }
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
          <p className="text-muted-foreground">Loading Module {moduleId}...</p>
        </div>
      </div>
    );
  }

  const moduleTitle = MODULE_TITLES[moduleId] || `Module ${moduleId}`;

  // Build iframe URL with user params
  const iframeSrc = user
    ? `/modules/module_${moduleId}/index.html?userId=${user.id}&userName=${encodeURIComponent(user.name)}`
    : `/modules/module_${moduleId}/index.html`;

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/kids/safescape">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Course
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Module {moduleId}</p>
                <h1 className="text-xl font-bold text-gray-800">{moduleTitle}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Iframe */}
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="relative w-full" style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>
              <iframe
                src={iframeSrc}
                className="absolute top-0 left-0 w-full h-full border-0"
                title={`SafeScape ${moduleTitle}`}
                allow="fullscreen"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
