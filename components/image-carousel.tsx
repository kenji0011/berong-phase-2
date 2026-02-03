"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { CarouselImage } from "@/lib/mock-data"
import { ImageViewerModal } from "@/components/image-viewer-modal"

interface ImageCarouselProps {
  images: CarouselImage[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [images.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  return (
    <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden rounded-lg group">
      {/* Images */}
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
        >
          <Image
            src={image.url || "/placeholder.svg"}
            alt={image.altText}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h2 className="text-white text-3xl md:text-4xl font-bold text-balance">{image.title}</h2>
          </div>
        </div>
      ))}

      {/* Transparent Button Overlay for Full-Screen View */}
      <button
        onClick={() => {
          setIsViewerOpen(true)
        }}
        className="absolute inset-0 z-10 cursor-pointer bg-red-500/20 hover:bg-red-500/30 transition-colors group/fullscreen border-4 border-red-500"
        aria-label="View full-screen image"
      >
        {/* Maximize icon appears on hover */}
        <div className="absolute top-4 right-4 opacity-0 group-hover/fullscreen:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/50 rounded-full p-2">
            <Maximize2 className="h-5 w-5 text-white" />
          </div>
        </div>
      </button>

      {/* Navigation Buttons */}
      <Button
        onClick={goToPrevious}
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        onClick={goToNext}
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? "bg-white w-8" : "bg-white/50"}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={images[currentIndex]?.url || ""}
        imageTitle={images[currentIndex]?.title || ""}
        imageAlt={images[currentIndex]?.altText || ""}
      />
    </div>
  )
}
