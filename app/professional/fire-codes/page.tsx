"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, FileText, AlertCircle, Search, BookOpen } from "lucide-react";
import { FireCodeViewer } from "@/components/ui/fire-code-viewer";

export default function FireCodesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    if (!user?.permissions.accessProfessional && user?.role !== 'admin') {
      router.push("/");
      return;
    }

    setLoading(false);
  }, [isAuthenticated, user, router, isLoading]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Fire Code & Regulations</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Philippine Fire Code of 2019 Revised - Complete reference and guidelines
          </p>
        </div>

        {/* Access Notice */}
        <Alert className="mb-6 border-primary bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            This section contains official fire safety regulations and compliance requirements.
            Information is sourced from the Philippine Fire Code of 2019 Revised.
          </AlertDescription>
        </Alert>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">Chapters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">10+</p>
              <p className="text-xs text-muted-foreground">Major sections</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-secondary">Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">100+</p>
              <p className="text-xs text-muted-foreground">Detailed provisions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-accent">Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">2019</p>
              <p className="text-xs text-muted-foreground">Latest revision</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">Searchable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Full</p>
              <p className="text-xs text-muted-foreground">Text search enabled</p>
            </CardContent>
          </Card>
        </div>

        {/* Fire Code Viewer */}
        <FireCodeViewer />

        {/* Additional Resources */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
                <CardTitle>Additional Resources</CardTitle>
              </div>
              <CardDescription>
                Supplementary materials and references for fire safety compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Implementation Guidelines</h4>
                  <p className="text-sm text-muted-foreground">
                    Practical guidance for implementing fire safety measures in compliance with the code.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Compliance Checklists</h4>
                  <p className="text-sm text-muted-foreground">
                    Tools to help ensure your facility meets all fire safety requirements.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">FAQs</h4>
                  <p className="text-sm text-muted-foreground">
                    Answers to frequently asked questions about fire code implementation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
