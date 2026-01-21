"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GridVisualization } from "@/components/grid-visualization"
import { ArrowLeft, Play, Loader2, Info, Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PPOVersion = "v1.5" | "v2.0_lite" | "500k_steps" | "v2.0"
const PPO_VERSION: PPOVersion = "500k_steps"
const MAX_AGENTS = (PPO_VERSION as string) === "v1.5" ? 5 : 10
const MAX_EXITS = (PPO_VERSION as string) === "v1.5" ? 40 : 248

interface SimulationSetupProps {
  grid: number[][]
  originalImage?: string | null
  config: {
    numAgents: number
    firePosition: [number, number] | null
    agentPositions: [number, number][]
    exits: [number, number][]
    materialType: "concrete" | "wood"
  }
  onConfigUpdate: (config: Partial<SimulationSetupProps["config"]>) => void
  onRunSimulation: () => void
  onBack: () => void
  processing: boolean

}

type PlacementMode = "fire" | "agent" | "exit" | "none"

export function SimulationSetup({
  grid,
  originalImage,
  config,
  onConfigUpdate,
  onRunSimulation,
  onBack,
  processing
}: SimulationSetupProps) {
  const [placementMode, setPlacementMode] = useState<PlacementMode>("none")
  const [autoMode, setAutoMode] = useState(true)
  const [showWallOverlay, setShowWallOverlay] = useState(true) // Toggle for wall overlay

  const handleCellClick = (row: number, col: number) => {
    const cellValue = grid[row][col]

    // Check if cell is valid - not a wall or exterior zone
    if (cellValue === 1) {
      alert("Cannot place items on walls!")
      return
    }
    if (cellValue === 4) {
      alert("Cannot place fire or agents in the exterior zone! Use the exterior zone for assembly point only.")
      return
    }

    if (placementMode === "fire") {
      onConfigUpdate({ firePosition: [row, col] })
      setPlacementMode("none")
    } else if (placementMode === "agent") {
      const newPositions = [...config.agentPositions, [row, col] as [number, number]]
      onConfigUpdate({ agentPositions: newPositions })
      if (newPositions.length >= config.numAgents) {
        setPlacementMode("none")
      }
    } else if (placementMode === "exit") {
      const newExits = [...config.exits, [row, col] as [number, number]]
      onConfigUpdate({ exits: newExits })
    }
  }

  const handleAutoGenerate = () => {
    // Find all free cells
    const freeCells: [number, number][] = []
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === 0) {
          freeCells.push([row, col])
        }
      }
    }

    if (freeCells.length === 0) {
      alert("No free cells available!")
      return
    }

    // Random fire position
    const fireIdx = Math.floor(Math.random() * freeCells.length)
    const firePos = freeCells[fireIdx]

    // Random agent positions
    const agentPos: [number, number][] = []
    for (let i = 0; i < config.numAgents; i++) {
      const idx = Math.floor(Math.random() * freeCells.length)
      agentPos.push(freeCells[idx])
    }

    // Find perimeter cells for exits (PPO v2.0: up to 248 exits)
    const perimeterCells: [number, number][] = []
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === 0) {
          const isPerimeter =
            row === 0 || row === grid.length - 1 ||
            col === 0 || col === grid[row].length - 1
          if (isPerimeter) {
            perimeterCells.push([row, col])
          }
        }
      }
    }

    // Sample exits from perimeter (up to MAX_EXITS)
    const exitCount = Math.min(MAX_EXITS, perimeterCells.length)
    const exitPositions: [number, number][] = []
    const usedIndices = new Set<number>()

    while (exitPositions.length < exitCount && usedIndices.size < perimeterCells.length) {
      const idx = Math.floor(Math.random() * perimeterCells.length)
      if (!usedIndices.has(idx)) {
        exitPositions.push(perimeterCells[idx])
        usedIndices.add(idx)
      }
    }

    onConfigUpdate({
      firePosition: firePos,
      agentPositions: agentPos,
      exits: exitPositions
    })
  }

  const handleClearAll = () => {
    onConfigUpdate({
      firePosition: null,
      agentPositions: [],
      exits: []
    })
  }

  const canRunSimulation =
    config.firePosition !== null &&
    config.agentPositions.length >= 1 // Allow any number of agents (at least 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Simulation</CardTitle>
        <CardDescription>
          Set up fire origin, agent positions, and exits for the evacuation simulation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Using PPO Commander {PPO_VERSION} with variable action space (up to {MAX_EXITS} exits, up to {MAX_AGENTS} agents).
            Auto-generate will create optimal configurations automatically.
          </AlertDescription>
        </Alert>

        {/* Material Selection */}
        <div className="space-y-3 p-4 border rounded-lg bg-secondary/10">
          <Label className="text-base font-semibold">Building Material</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Select the primary material of the building structure. This affects how fast the fire spreads.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${config.materialType === 'concrete' ? 'bg-primary/10 border-primary ring-2 ring-primary/20' : 'hover:bg-secondary/50 border-input'}`}
              onClick={() => onConfigUpdate({ materialType: 'concrete' })}
            >
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-xl">🏢</div>
              <div className="font-semibold">Concrete / Stone</div>
              <div className="text-xs text-center text-muted-foreground">Standard fire spread. Fire spreads normally through openings.</div>
            </div>

            <div
              className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${config.materialType === 'wood' ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20' : 'hover:bg-secondary/50 border-input'}`}
              onClick={() => onConfigUpdate({ materialType: 'wood' })}
            >
              <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center text-xl">🪵</div>
              <div className="font-semibold text-orange-700 dark:text-orange-400">Wood / Light</div>
              <div className="text-xs text-center text-muted-foreground">Faster fire spread! Structure burns more easily.</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue={autoMode ? "auto" : "manual"} onValueChange={(v) => setAutoMode(v === "auto")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto">Auto Generate</TabsTrigger>
            <TabsTrigger value="manual">Manual Placement</TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numAgents">Number of Agents (1-{MAX_AGENTS})</Label>
                <Input
                  id="numAgents"
                  type="number"
                  min={1}
                  max={MAX_AGENTS}
                  value={config.numAgents}
                  onChange={(e) => onConfigUpdate({ numAgents: parseInt(e.target.value) || 1 })}
                />
              </div>
              <Button onClick={handleAutoGenerate} className="w-full">
                Generate Random Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                variant={placementMode === "fire" ? "default" : "outline"}
                onClick={() => setPlacementMode(placementMode === "fire" ? "none" : "fire")}
              >
                Place Fire {config.firePosition ? "" : ""}
              </Button>
              <Button
                variant={placementMode === "agent" ? "default" : "outline"}
                onClick={() => setPlacementMode(placementMode === "agent" ? "none" : "agent")}
              >
                Place Agents ({config.agentPositions.length}/{config.numAgents})
              </Button>
              <Button
                variant={placementMode === "exit" ? "default" : "outline"}
                onClick={() => setPlacementMode(placementMode === "exit" ? "none" : "exit")}
              >
                Place Exits ({config.exits.length}/{MAX_EXITS})
              </Button>
            </div>
            <Button variant="destructive" onClick={handleClearAll} className="w-full">
              Clear All Placements
            </Button>
          </TabsContent>
        </Tabs>

        {/* Toggle for wall overlay */}
        <div className="flex items-center justify-end gap-2">
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

        <GridVisualization
          grid={grid}
          originalImage={originalImage}
          showWallOverlay={showWallOverlay}
          firePosition={config.firePosition}
          agentPositions={config.agentPositions}
          exits={config.exits}
          onCellClick={handleCellClick}
          interactive={placementMode !== "none"}
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={processing}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onRunSimulation}
            disabled={!canRunSimulation || processing}
            className="flex-1"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Simulation...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run AI Simulation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
