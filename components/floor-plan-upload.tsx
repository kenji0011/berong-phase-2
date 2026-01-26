"use client"

import { useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileImage, Loader2, X } from "lucide-react"

interface FloorPlanUploadProps {
  onUpload: (file: File) => void
  processing: boolean
}

export function FloorPlanUpload({ onUpload, processing }: FloorPlanUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG or PNG)")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    setSelectedFile(file)

    // Generate preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreview(null)
  }

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Floor Plan</CardTitle>
        <CardDescription>
          Upload a floor plan image (JPEG or PNG). The AI will automatically detect walls and open spaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <>
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleChange}
                className="hidden"
                disabled={processing}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="p-4 bg-muted rounded-full">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-1">
                    Drop your floor plan here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports JPEG and PNG up to 10MB
                  </p>
                </div>
              </label>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="relative border rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Floor plan preview"
                className="w-full h-auto max-h-96 object-contain bg-muted"
              />
              {!processing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Floor Plan...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process Floor Plan
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
