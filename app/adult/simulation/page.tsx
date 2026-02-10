"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { SimulationWizard } from "@/components/simulation-wizard"

export default function SimulationPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      router.push("/auth")
      return
    }

    if (!user.permissions.accessAdult && user.role !== 'admin') {
      router.push("/")
      return
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Exit Drill In The Home (EDITH)
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload a floor plan and watch AI-powered evacuation scenarios unfold
          </p>
        </div>
        <SimulationWizard />
      </main>
    </div>
  )
}
