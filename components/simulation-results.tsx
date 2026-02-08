import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, XCircle, RotateCcw, Clock, Users, Flame, Play, Pause, SkipBack, SkipForward, Eye, EyeOff, Download } from "lucide-react"
import { GridVisualization } from "@/components/grid-visualization"

interface SimulationResultsProps {
  results: {
    total_agents: number
    escaped_count: number
    burned_count: number
    time_steps: number
    exits?: [number, number][] // Corrected exit positions from backend
    assembly_point?: [number, number] | null // Assembly point where agents gather
    agent_results: Array<{
      agent_id: number
      status: "escaped" | "burned"
      exit_time: number | null
      path_length: number
    }>
    commander_actions?: number[]
    animation_data?: {
      history: Array<{
        step: number
        agents: Array<{
          pos: [number, number]
          status: string
          state: string
          tripped: boolean
        }>
        fire_map: number[][]
        exits: [number, number][]
      }>
    }
  }
  grid: number[][]
  originalImage?: string | null
  userExits?: [number, number][] // User-placed exits to display during playback
  onReset: () => void
}

export function SimulationResults({ results, grid, originalImage, userExits = [], onReset }: SimulationResultsProps) {
  const successRate = (results.escaped_count / results.total_agents) * 100
  const isSuccess = results.escaped_count === results.total_agents

  // Animation State
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(100) // ms per frame
  const [showWallOverlay, setShowWallOverlay] = useState(true) // Toggle for wall overlay
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  const history = results.animation_data?.history || []
  const maxSteps = history.length - 1

  // Playback Logic
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= maxSteps) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, playbackSpeed)
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isPlaying, maxSteps, playbackSpeed])

  const togglePlay = () => setIsPlaying(!isPlaying)
  const resetAnimation = () => {
    setIsPlaying(false)
    setCurrentStep(0)
  }

  const handleSaveVideo = async () => {
    setSaveError(null)

    if (!canvasRef.current) {
      setSaveError("Canvas not ready. Please try again in a moment.")
      return
    }
    if (!history.length) {
      setSaveError("No animation frames available to export.")
      return
    }

    const canvas = canvasRef.current
    if (typeof canvas.captureStream !== "function") {
      setSaveError("Video capture is not supported in this browser.")
      return
    }

    const fps = 30
    const stream = canvas.captureStream(fps)

    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ]
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || ""

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    setIsSaving(true)
    setIsPlaying(false)

    const originalStep = currentStep
    setCurrentStep(0)
    await nextPaint()

    recorder.start()

    for (let step = 0; step <= maxSteps; step += 1) {
      setCurrentStep(step)
      await nextPaint()
    }

    recorder.stop()

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })

    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `simulation-${Date.now()}.webm`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setCurrentStep(originalStep)
    setIsSaving(false)
  }

  // Get current frame data
  const currentFrame = history[currentStep] || {
    agents: [],
    fire_map: [],
    exits: []
  }

  // Construct dynamic grid for visualization
  // We need to merge the base grid (walls) with the fire map
  const displayGrid = grid.map((row, r) =>
    row.map((cell, c) => {
      // If fire map has fire (1) at this position, treat as fire
      // Note: fire_map might be smaller or different structure, need to be careful
      // The backend returns fire_map as a full grid
      if (currentFrame.fire_map && currentFrame.fire_map[r] && currentFrame.fire_map[r][c] === 1) {
        return 2 // 2 = Fire (we need to handle this in GridVisualization if it supports it, or pass firePosition)
      }
      return cell
    })
  )

  return (
    <div className="space-y-6">
      {/* Animation Player */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Replay Simulation</span>
              <Badge variant="outline">Step {currentStep} / {maxSteps}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              {/* Toggle for wall overlay */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWallOverlay(!showWallOverlay)}
                  className="flex items-center gap-2"
                >
                  {showWallOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showWallOverlay ? "Hide Walls" : "Show Walls"}
                </Button>
              </div>

              {/* Visualization */}
              <div className="border rounded-lg p-2 bg-white">
                <GridVisualization
                  grid={grid} // Base grid (walls)
                  originalImage={originalImage}
                  showWallOverlay={showWallOverlay}
                  canvasRef={canvasRef}
                  agentPositions={currentFrame.agents ? currentFrame.agents.map((a: any) => a.pos) : []}
                  exits={results.exits || userExits} // Use corrected exits from backend, fallback to user exits
                  assemblyPoint={results.assembly_point || null} // Show assembly point from backend
                  fireMap={currentFrame.fire_map as [number, number][]}
                  firePosition={null}
                  showExitsAlways={true} // Always show exits during simulation
                />
              </div>

              {/* Controls */}
              <div className="w-full max-w-md space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={resetAnimation}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button onClick={togglePlay} size="lg">
                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentStep(maxSteps)}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleSaveVideo} disabled={isSaving || maxSteps < 1}>
                    <Download className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Simulation"}
                  </Button>
                </div>

                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Speed:</span>
                  <Slider
                    value={[200 - playbackSpeed]}
                    min={0}
                    max={190}
                    step={10}
                    onValueChange={(vals) => setPlaybackSpeed(200 - vals[0])}
                    className="flex-1"
                  />
                </div>

                <Slider
                  value={[currentStep]}
                  min={0}
                  max={maxSteps}
                  step={1}
                  onValueChange={(vals) => {
                    setIsPlaying(false)
                    setCurrentStep(vals[0])
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className={isSuccess ? "border-green-500 border-2" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                Simulation Complete
              </CardTitle>
              <CardDescription>
                {isSuccess
                  ? "All agents successfully evacuated!"
                  : "Some agents did not survive the evacuation"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={isSuccess ? "default" : "destructive"} className="text-lg px-4 py-2">
                {successRate.toFixed(1)}% Success
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <Users className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-2xl font-bold">{results.total_agents}</span>
              <span className="text-sm text-muted-foreground">Total Agents</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{results.escaped_count}</span>
              <span className="text-sm text-muted-foreground">Escaped</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-red-500/10 rounded-lg">
              <Flame className="h-8 w-8 mb-2 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{results.burned_count}</span>
              <span className="text-sm text-muted-foreground">Casualties</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
              <Clock className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-2xl font-bold">{results.time_steps}</span>
              <span className="text-sm text-muted-foreground">Time Steps</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Details */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Details</CardTitle>
          <CardDescription>Individual evacuation outcomes for each agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(results.agent_results || []).map((agent) => (
              <div
                key={agent.agent_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {agent.status === "escaped" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Agent {agent.agent_id + 1}</span>
                  <Badge variant={agent.status === "escaped" ? "default" : "destructive"}>
                    {agent.status}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {agent.exit_time !== null && (
                    <span>Exit Time: {agent.exit_time}s</span>
                  )}
                  <span>Path: {agent.path_length} steps</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Commander Analysis */}
      {results.commander_actions && results.commander_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Commander Analysis</CardTitle>
            <CardDescription>
              PPO Commander made {results.commander_actions.length} strategic decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Decisions:</span>
                <span className="font-medium">{results.commander_actions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unique Exit Routes:</span>
                <span className="font-medium">
                  {new Set(results.commander_actions).size}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                <p>
                  The AI commander continuously analyzed the fire spread and agent positions
                  to optimize evacuation routes in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex gap-2">
        <Button onClick={onReset} size="lg" className="flex-1">
          <RotateCcw className="h-4 w-4 mr-2" />
          Run New Simulation
        </Button>
      </div>
    </div>
  )
}
