"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Grid3x3, Settings, Play, Loader2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Pencil, FolderOpen } from "lucide-react"
import { FloorPlanUpload } from "@/components/floor-plan-upload"
import { FloorPlanCanvas } from "@/components/floor-plan-canvas"
import { SimulationSetup } from "@/components/simulation-setup"
import { SimulationResults } from "@/components/simulation-results"
import { FabricFloorPlanBuilder } from "@/components/fabric-floor-plan-builder"

type Stage = "upload" | "exits" | "setup" | "running" | "results"

interface Exit {
  id: string
  x: number
  y: number
  pixelX: number
  pixelY: number
}

interface AssemblyPoint {
  x: number
  y: number
}

interface SimulationData {
  imageFile: File | null
  grid: number[][] | null
  originalImage: string | null
  gridSize: { width: number; height: number } | null
  userExits: Exit[]
  assemblyPoint: AssemblyPoint | null
  config: {
    numAgents: number
    firePosition: [number, number] | null
    agentPositions: [number, number][]
    burnUntilComplete: boolean // Continue fire until entire space is burned
    materialType: "concrete" | "wood"
  }
  jobId: string | null
  results: any | null
}

export function SimulationWizard() {
  const [stage, setStage] = useState<Stage>("upload")
  const [inputMode, setInputMode] = useState<'upload' | 'plans' | 'draw'>('upload')
  const [exitMode, setExitMode] = useState<'view' | 'add-exit' | 'add-assembly'>('view')
  const [data, setData] = useState<SimulationData>({
    imageFile: null,
    grid: null,
    originalImage: null,
    gridSize: null,
    userExits: [],
    assemblyPoint: null,
    config: {
      numAgents: 5,
      firePosition: null,
      agentPositions: [],
      burnUntilComplete: true, // Default to true for extended fire demo
      materialType: "concrete"
    },
    jobId: null,
    results: null
  })
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [pollingInfo, setPollingInfo] = useState({ elapsedSeconds: 0, lastStatus: "starting" })

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sim-wizard-state', JSON.stringify({
        stage,
        data: {
          ...data,
          imageFile: null, // Can't serialize File
          results: data.results ? 'cached' : null
        }
      }))
    }
  }, [stage, data])

  // Restore state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sim-wizard-state')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.data.grid) {
            setData(prev => ({
              ...prev,
              ...parsed.data,
              imageFile: null,
              config: {
                ...parsed.data.config,
                materialType: parsed.data.config.materialType || "concrete"
              }
            }))
            // Don't auto-restore stage to prevent confusion
          }
        } catch (e) {
          console.error('Failed to restore state:', e)
          // Clear invalid state
          localStorage.removeItem('sim-wizard-state')
        }
      }
    }
  }, [])

  const stages = [
    { id: "upload", label: "Upload Floor Plan", icon: Upload },
    { id: "exits", label: "Place Exits", icon: Grid3x3 },
    { id: "setup", label: "Configure Simulation", icon: Settings },
    { id: "results", label: "View Results", icon: Play }
  ]

  const currentStageIndex = stages.findIndex(s => s.id === stage || (stage === "running" && s.id === "results"))
  const progress = ((currentStageIndex + 1) / stages.length) * 100

  const handleImageUpload = async (file: File, directGrid?: number[][]) => {
    setProcessing(true)
    setError(null)

    // Manual Drawing Mode Bypass (Skip Backend U-Net)
    if (directGrid) {
      try {


        // Convert blob/file to base64 for display
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64data = reader.result as string

          // Add Padding locally (mimic inference.py)
          const PADDING = 20
          const paddedGrid = addPadding(directGrid, PADDING)



          setData(prev => ({
            ...prev,
            imageFile: file,
            grid: paddedGrid,
            originalImage: base64data,
            gridSize: { width: paddedGrid.length, height: paddedGrid.length }
          }))
          setStage("exits")
          setExitMode('add-exit')
          setProcessing(false)
        }
        reader.readAsDataURL(file)
        return
      } catch (err) {
        console.error("Direct grid error:", err)
        setError("Failed to process drawn floor plan")
        setProcessing(false)
        return
      }
    }

    // Standard Upload Mode (Backend U-Net)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/simulation/process-image", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Backend error:', errorData)
        throw new Error(errorData.error || "Failed to process image")
      }

      const result = await response.json()


      // Auto-flip grid if wall percentage is abnormally high (>50%)
      // In a typical floor plan, walls are thin lines (~10-20% of area)
      // If walls > 50%, the detection is likely inverted
      let processedGrid = result.grid
      const total = processedGrid.length * processedGrid[0].length
      const wallCount = processedGrid.flat().filter((c: number) => c === 1).length
      const wallPercentage = (wallCount / total) * 100



      if (wallPercentage > 50) {

        processedGrid = processedGrid.map((row: number[]) =>
          row.map((cell: number) => {
            if (cell === 0) return 1
            if (cell === 1) return 0
            return cell // Keep doors (2) and windows (3) unchanged
          })
        )
        const newWallCount = processedGrid.flat().filter((c: number) => c === 1).length

      }

      setData(prev => ({
        ...prev,
        imageFile: file,
        grid: processedGrid,
        originalImage: result.originalImage,
        gridSize: result.gridSize
      }))
      setStage("exits")
      setExitMode('add-exit') // Auto-enable exit placement mode
    } catch (err) {
      console.error('Image upload error:', err)
      setError(err instanceof Error ? err.message : "Failed to process image")
    } finally {
      setProcessing(false)
    }
  }

  const handleConfigUpdate = (config: Partial<SimulationData["config"]>) => {
    setData(prev => ({
      ...prev,
      config: { ...prev.config, ...config }
    }))
  }

  const handleRunSimulation = async () => {
    setProcessing(true)
    setError(null)
    setStage("running")

    try {
      // Convert user exits to [row, col] format (exit.y = row, exit.x = col)
      const exitsForBackend = data.userExits.map(exit => [exit.y, exit.x] as [number, number])



      // Convert assembly point to [row, col] format
      const assemblyForBackend = data.assemblyPoint
        ? [data.assemblyPoint.y, data.assemblyPoint.x] as [number, number]
        : null

      // Submit simulation job
      const response = await fetch("/api/simulation/run-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grid: data.grid,
          exits: exitsForBackend.length > 0 ? exitsForBackend : null,
          fire_position: data.config.firePosition,
          agent_positions: data.config.agentPositions,
          assembly_point: assemblyForBackend,
          extended_fire_steps: data.config.burnUntilComplete ? 500 : 0, // Continue fire until building fully burned
          material_type: data.config.materialType || "concrete"
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Simulation start error:', errorData)
        throw new Error(errorData.error || "Failed to start simulation")
      }

      const { job_id } = await response.json()

      setData(prev => ({ ...prev, jobId: job_id }))

      // Poll for results
      await pollSimulationStatus(job_id)
    } catch (err) {
      console.error('Run simulation error:', err)
      setError(err instanceof Error ? err.message : "Failed to run simulation")
      setStage("setup")
    } finally {
      setProcessing(false)
    }
  }

  const pollSimulationStatus = async (jobId: string) => {
    const maxDurationMs = 5 * 60 * 1000 // 5 minutes max
    const maxConsecutiveErrors = 15 // More lenient - backend may be CPU-busy
    let consecutiveErrors = 0
    const startTime = Date.now()

    setPollingInfo({ elapsedSeconds: 0, lastStatus: "processing" })

    // Exponential backoff: start at 2s, increase to max 8s
    let pollInterval = 2000
    const maxPollInterval = 8000

    while (Date.now() - startTime < maxDurationMs) {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000)

      try {
        const response = await fetch(`/api/simulation/status/${jobId}`)

        if (!response.ok) {
          consecutiveErrors++
          console.warn(`Status check failed (${consecutiveErrors}/${maxConsecutiveErrors}):`, response.status)
          setPollingInfo({ elapsedSeconds: elapsedSec, lastStatus: "server busy, retrying..." })

          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Backend unavailable after ${maxConsecutiveErrors} attempts. Please check if the simulation server is running.`)
          }

          // Back off more aggressively on errors
          await new Promise(resolve => setTimeout(resolve, Math.min(pollInterval * 2, 10000)))
          continue
        }

        // Reset consecutive errors on success
        consecutiveErrors = 0
        // Reset interval on success
        pollInterval = 2000

        const status = await response.json()

        setPollingInfo({ elapsedSeconds: elapsedSec, lastStatus: status.status || "processing" })

        if (status.status === "complete") {
          if (!status.result || !status.result.agent_results) {
            console.warn('Received incomplete results:', status.result)
          }

          setData(prev => ({ ...prev, results: status.result }))
          setStage("results")
          return
        }

        if (status.status === "failed") {
          console.error('Simulation failed:', status.error)
          throw new Error(status.error || "Simulation failed")
        }

        if (status.status === "not_found") {
          consecutiveErrors++
          if (consecutiveErrors >= 5) {
            throw new Error("Simulation job not found. The backend may have restarted.")
          }
        }

        // Exponential backoff: increase interval gradually
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        pollInterval = Math.min(pollInterval * 1.3, maxPollInterval)
      } catch (err) {
        console.error('Poll error:', err)
        throw err
      }
    }

    throw new Error("Simulation timeout after 5 minutes. Please try again with a simpler configuration.")
  }

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sim-wizard-state')
    }

    setData({
      imageFile: null,
      grid: null,
      originalImage: null,
      gridSize: null,
      userExits: [],
      assemblyPoint: null,
      config: {
        numAgents: 5,
        firePosition: null,
        agentPositions: [],
        burnUntilComplete: true,
        materialType: "concrete"
      },
      jobId: null,
      results: null
    })
    setStage("upload")
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              {stages.map((s, idx) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 ${idx <= currentStageIndex ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  <s.icon className="h-5 w-5" />
                  <span className="text-sm font-medium hidden md:inline">{s.label}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stage Content */}
      {stage === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Floor Plan Input</CardTitle>
            <CardDescription>
              Upload an existing floor plan image or draw your own using our built-in editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'plans' | 'draw')}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Image
                </TabsTrigger>
                <TabsTrigger value="plans" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Sample Plans
                </TabsTrigger>
                <TabsTrigger value="draw" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Draw Floor Plan
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-0">
                <FloorPlanUpload onUpload={handleImageUpload} processing={processing} />
              </TabsContent>
              <TabsContent value="plans" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Floor Plans</CardTitle>
                    <CardDescription>
                      Choose from our pre-loaded sample floor plans to quickly get started
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { src: "/Floor Plan 1.png", name: "Floor Plan 1" },
                        { src: "/Floor Plan 2.png", name: "Floor Plan 2" },
                        { src: "/Floor Plan 3.png", name: "Floor Plan 3" },
                      ].map((sample) => (
                        <button
                          key={sample.src}
                          type="button"
                          disabled={processing}
                          onClick={async () => {
                            try {
                              const response = await fetch(sample.src)
                              const blob = await response.blob()
                              const file = new File([blob], sample.name + ".jpg", { type: "image/jpeg" })
                              handleImageUpload(file)
                            } catch (err) {
                              console.error("Failed to load sample:", err)
                            }
                          }}
                          className="relative aspect-[4/3] border-2 border-muted rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 group"
                        >
                          <img
                            src={sample.src}
                            alt={sample.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-sm font-medium py-2 px-3 text-center">
                            {sample.name}
                          </div>
                          {processing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="draw" className="mt-0">
                <FabricFloorPlanBuilder
                  onExport={(blob, grid) => {
                    const file = new File([blob], 'drawn-floorplan.png', { type: 'image/png' })
                    handleImageUpload(file, grid)
                  }}
                  processing={processing}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {stage === "exits" && data.grid && data.originalImage && data.gridSize && (
        <div className="space-y-4">
          <FloorPlanCanvas
            originalImage={data.originalImage}
            grid={data.grid}
            gridSize={data.gridSize}
            exits={data.userExits}
            onExitsChange={(exits) => setData(prev => ({ ...prev, userExits: exits }))}
            assemblyPoint={data.assemblyPoint}
            onAssemblyPointChange={(point) => setData(prev => ({ ...prev, assemblyPoint: point }))}
            mode={exitMode}
            onModeChange={setExitMode}
          />
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2 justify-between">
                <Button variant="outline" onClick={() => setStage("upload")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Upload Different Plan
                </Button>
                <Button
                  onClick={() => setStage("setup")}
                  disabled={data.userExits.length === 0 || !data.assemblyPoint}
                >
                  Configure Simulation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              {(data.userExits.length === 0 || !data.assemblyPoint) && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Required: {data.userExits.length === 0 && 'At least 1 exit'}
                  {data.userExits.length === 0 && !data.assemblyPoint && ' and '}
                  {!data.assemblyPoint && 'Assembly point'}
                </p>
              )}
              {data.userExits.length > 0 && data.assemblyPoint && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {data.userExits.length} exit{data.userExits.length !== 1 ? 's' : ''} and assembly point set
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {stage === "setup" && data.grid && (
        <SimulationSetup
          key={`grid-${data.grid.flat().slice(0, 100).reduce((a, b) => a + b, 0)}`}
          grid={data.grid}
          originalImage={data.originalImage}
          config={{
            ...data.config,
            exits: data.userExits.map(e => [e.y, e.x] as [number, number]) // [row, col] format
          }}
          onConfigUpdate={handleConfigUpdate}
          onRunSimulation={handleRunSimulation}
          onBack={() => setStage("exits")}
          processing={processing}
        />
      )}

      {stage === "running" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Running Simulation...</h3>
            <p className="text-muted-foreground mb-4">
              AI is calculating optimal evacuation routes
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>⏱️ Elapsed: {pollingInfo.elapsedSeconds}s</p>
              <p>📊 Status: {pollingInfo.lastStatus}</p>
              {pollingInfo.elapsedSeconds > 20 && pollingInfo.elapsedSeconds <= 60 && (
                <p className="text-amber-600 mt-2">
                  ⚠️ Simulation is computing fire spread and agent movement...
                </p>
              )}
              {pollingInfo.elapsedSeconds > 60 && pollingInfo.elapsedSeconds <= 180 && (
                <p className="text-amber-600 mt-2">
                  ⚠️ Large simulations may take 1-3 minutes. Please wait...
                </p>
              )}
              {pollingInfo.elapsedSeconds > 180 && (
                <p className="text-amber-600 mt-2">
                  ⚠️ Simulation is taking longer than usual. It will timeout at 5 minutes.
                </p>
              )}
            </div>
            {data.jobId && (
              <p className="text-xs text-muted-foreground mt-4">
                Job ID: {data.jobId.substring(0, 8)}...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {stage === "results" && data.results && data.grid && (
        <SimulationResults
          results={data.results}
          grid={data.grid}
          originalImage={data.originalImage}
          userExits={data.userExits.map(e => [e.y, e.x] as [number, number])} // Pass user exits for playback
          onReset={handleReset}
        />
      )}
    </div>
  )
}

// Helper: Add exterior padding (Zone 4) around grid
function addPadding(grid: number[][], paddingSize = 20): number[][] {
  const originalSize = grid.length
  const newSize = originalSize + (paddingSize * 2)

  // Create expanded grid filled with 4 (Exterior)
  // Use map to create distinct arrays for rows
  const expanded = Array(newSize).fill(0).map(() => Array(newSize).fill(4))

  // Copy original grid into center
  for (let i = 0; i < originalSize; i++) {
    for (let j = 0; j < originalSize; j++) {
      // Offset by paddingSize
      expanded[i + paddingSize][j + paddingSize] = grid[i][j]
    }
  }

  return expanded
}
