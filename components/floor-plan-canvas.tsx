"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Trash2, Undo, Eye, EyeOff, Flag } from "lucide-react"

// Fallback UUID generator for non-HTTPS environments
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for HTTP environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface Exit {
  id: string
  x: number // Grid coordinate (0-255)
  y: number // Grid coordinate (0-255)
  pixelX: number // Canvas pixel coordinate
  pixelY: number // Canvas pixel coordinate
}

interface AssemblyPoint {
  x: number
  y: number
}

interface FloorPlanCanvasProps {
  originalImage: string // Base64 data URL
  grid: number[][] // 256x256 grid where 1=wall, 0=free
  gridSize: { width: number; height: number }
  exits: Exit[]
  onExitsChange: (exits: Exit[]) => void
  assemblyPoint: AssemblyPoint | null
  onAssemblyPointChange: (point: AssemblyPoint | null) => void
  mode: 'view' | 'add-exit' | 'add-assembly'
  onModeChange: (mode: 'view' | 'add-exit' | 'add-assembly') => void
}

export function FloorPlanCanvas({
  originalImage,
  grid,
  gridSize,
  exits,
  onExitsChange,
  assemblyPoint,
  onAssemblyPointChange,
  mode,
  onModeChange
}: FloorPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showOverlay, setShowOverlay] = useState(true)
  const [hoveredExit, setHoveredExit] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = originalImage
  }, [originalImage])

  // Draw canvas - using same cellSize as grid-visualization for consistency
  useEffect(() => {
    if (!canvasRef.current || !image) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Match grid-visualization cellSize
    const cellSize = 3
    const PADDING = 20
    const originalImageSize = 256

    // Set canvas size (grid.length * cellSize)
    const canvasWidth = grid[0]?.length * cellSize || gridSize.width * cellSize
    const canvasHeight = grid.length * cellSize || gridSize.height * cellSize
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Fill entire canvas with dark gray (exterior zone)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw original image inside the padding area
    ctx.drawImage(
      image,
      PADDING * cellSize,
      PADDING * cellSize,
      originalImageSize * cellSize,
      originalImageSize * cellSize
    )

    // Draw wall and exterior overlay
    if (showOverlay) {
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (grid[row][col] === 4) { // Exterior zone - clear/white
            ctx.fillStyle = 'rgba(245, 245, 245, 0.95)'
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
          } else if (grid[row][col] === 1) { // Wall - red
            ctx.fillStyle = 'rgba(255, 0, 0, 0.25)'
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
          }
        }
      }
    }

    // Draw exits as green circles with numbers
    exits.forEach((exit, index) => {
      const isHovered = hoveredExit === exit.id
      const radius = (isHovered ? 10 : 8) // Larger for visibility
      const centerX = exit.x * cellSize + cellSize / 2
      const centerY = exit.y * cellSize + cellSize / 2

      // Draw circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fillStyle = isHovered ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.7)'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw number
      ctx.fillStyle = 'white'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((index + 1).toString(), centerX, centerY)
    })

    // Draw assembly point as blue flag
    if (assemblyPoint) {
      const centerX = assemblyPoint.x * cellSize + cellSize / 2
      const centerY = assemblyPoint.y * cellSize + cellSize / 2

      // Draw flag pole
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX, centerY - 20)
      ctx.strokeStyle = '#1e40af'
      ctx.lineWidth = 3
      ctx.stroke()

      // Draw flag
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - 20)
      ctx.lineTo(centerX + 15, centerY - 14)
      ctx.lineTo(centerX, centerY - 8)
      ctx.closePath()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw base circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI)
      ctx.fillStyle = '#1e40af'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw cursor crosshair if in add mode
    if (mode === 'add-exit' || mode === 'add-assembly') {
      canvas.style.cursor = 'crosshair'
    } else {
      canvas.style.cursor = 'default'
    }
  }, [image, grid, gridSize, exits, showOverlay, hoveredExit, mode, assemblyPoint])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const cellSize = 3 // Must match drawing cellSize

    // Calculate scale factor between displayed size and actual canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    // Get click position in canvas pixels
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    // Convert canvas pixels to grid coordinates
    const gridX = Math.floor(canvasX / cellSize)
    const gridY = Math.floor(canvasY / cellSize)

    // Check if clicking on assembly point to remove it (using grid coords)
    if (assemblyPoint) {
      if (assemblyPoint.x === gridX && assemblyPoint.y === gridY) {
        onAssemblyPointChange(null)
        return
      }
    }

    // Check if clicking on existing exit (using grid coords)
    const clickedExit = exits.find(exit => {
      const dist = Math.sqrt(Math.pow(exit.x - gridX, 2) + Math.pow(exit.y - gridY, 2))
      return dist <= 3 // Within 3 grid cells
    })

    if (clickedExit) {
      // Remove exit
      onExitsChange(exits.filter(e => e.id !== clickedExit.id))
      return
    }

    // Add new exit if in add mode
    if (mode === 'add-exit') {
      // Validate: must be within grid bounds
      if (gridX < 0 || gridX >= grid[0].length || gridY < 0 || gridY >= grid.length) return

      // Validate: must be on free space (not wall or exterior)
      const cellValue = grid[gridY][gridX]
      if (cellValue === 1) {
        alert('Cannot place exit on wall!')
        return
      }
      if (cellValue === 4) {
        alert('Cannot place exit in exterior zone!')
        return
      }

      // Check if too close to existing exits
      const tooClose = exits.some(exit => {
        const dist = Math.sqrt(Math.pow(exit.x - gridX, 2) + Math.pow(exit.y - gridY, 2))
        return dist < 3
      })

      if (tooClose) {
        alert('Exit too close to another exit!')
        return
      }

      const newExit: Exit = {
        id: generateUUID(),
        x: gridX,
        y: gridY,
        pixelX: gridX * cellSize,
        pixelY: gridY * cellSize
      }

      onExitsChange([...exits, newExit])
    }

    // Add assembly point if in add-assembly mode
    if (mode === 'add-assembly') {
      // Validate: must be within grid bounds
      if (gridX < 0 || gridX >= grid[0].length || gridY < 0 || gridY >= grid.length) return

      const cellValue = grid[gridY][gridX]
      if (cellValue !== 4) {
        alert('Assembly point must be placed in the exterior zone (dark gray padding area)!')
        return
      }

      onAssemblyPointChange({ x: gridX, y: gridY })
      onModeChange('view') // Auto-exit placement mode after placing
    }
  }, [exits, grid, mode, onExitsChange, assemblyPoint, onAssemblyPointChange, onModeChange])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const cellSize = 3 // Must match drawing cellSize

    // Calculate scale factor between displayed size and actual canvas size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    // Get mouse position in canvas pixels
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    // Convert to grid coordinates
    const gridX = Math.floor(canvasX / cellSize)
    const gridY = Math.floor(canvasY / cellSize)

    // Check if hovering over exit (using grid coords)
    const hovered = exits.find(exit => {
      const dist = Math.sqrt(Math.pow(exit.x - gridX, 2) + Math.pow(exit.y - gridY, 2))
      return dist <= 3
    })

    setHoveredExit(hovered ? hovered.id : null)
  }, [exits])

  const handleClearAll = () => {
    if (confirm('Remove all exits?')) {
      onExitsChange([])
    }
  }

  const handleUndo = () => {
    if (exits.length > 0) {
      onExitsChange(exits.slice(0, -1))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Floor Plan with Exit & Assembly Placement</CardTitle>
            <CardDescription>
              {mode === 'add-exit' && 'Click on the floor plan to add exits'}
              {mode === 'add-assembly' && 'Click on the floor plan to place assembly area'}
              {mode === 'view' && 'Click exits or assembly point to remove them'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={exits.length > 0 ? 'default' : 'secondary'}>
              {exits.length} Exit{exits.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant={assemblyPoint ? 'default' : 'destructive'}>
              {assemblyPoint ? '✓ Assembly Set' : '⚠ No Assembly'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={mode === 'add-exit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange(mode === 'add-exit' ? 'view' : 'add-exit')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {mode === 'add-exit' ? 'Stop Adding' : 'Add Exit'}
            </Button>
            <Button
              variant={mode === 'add-assembly' ? 'default' : assemblyPoint ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => onModeChange(mode === 'add-assembly' ? 'view' : 'add-assembly')}
            >
              <Flag className="h-4 w-4 mr-2" />
              {assemblyPoint ? 'Move Assembly' : 'Set Assembly'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={exits.length === 0}
            >
              <Undo className="h-4 w-4 mr-2" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={exits.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOverlay(!showOverlay)}
          >
            {showOverlay ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {showOverlay ? 'Hide' : 'Show'} Walls
          </Button>
        </div>

        {/* Canvas - Centered and enlarged to match simulation-setup */}
        <div className="flex justify-center">
          <div className="relative border rounded-lg overflow-hidden bg-gray-100">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              style={{ width: '600px', height: '600px', imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>🚪 <strong>Exits:</strong> Click "Add Exit" then click on doorways/openings</p>
          <p>🏁 <strong>Assembly:</strong> Click "Set Assembly" then click where evacuees should gather (outside building)</p>
          <p>🔴 <strong>Walls:</strong> Red overlay shows detected walls</p>
          <p>⚠️ <strong>Required:</strong> At least 1 exit AND 1 assembly point to continue</p>
        </div>
      </CardContent>
    </Card>
  )
}
