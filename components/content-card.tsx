"use client"

import { useState } from "react"
import Link from "next/link"
import { Play, Lock, CheckCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface ContentCardData {
  id: string | number
  title: string
  description?: string
  type: "game" | "video" | "activity" | "module" | "exam"
  imageUrl?: string
  emoji?: string
  href: string
  isLocked?: boolean
  isCompleted?: boolean
  isNew?: boolean
  difficulty?: "easy" | "medium" | "hard"
  duration?: string
  category?: string
}

interface ContentCardProps {
  content: ContentCardData
  onClick?: () => void
}

export function ContentCard({ content, onClick }: ContentCardProps) {
  const [imageError, setImageError] = useState(false)

  const typeColors = {
    game: "from-green-400 to-emerald-600",
    video: "from-purple-400 to-purple-600",
    activity: "from-yellow-400 to-orange-600",
    module: "from-blue-400 to-blue-600",
    exam: "from-red-400 to-red-600",
  }

  const typeIcons = {
    game: "🎮",
    video: "🎬",
    activity: "✨",
    module: "📚",
    exam: "📝",
  }

  const difficultyColors = {
    easy: "bg-green-500",
    medium: "bg-yellow-500",
    hard: "bg-red-500",
  }

  // Mobile compact card layout (small vertical cards for 2-column grid)
  const mobileCardContent = (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 sm:hidden border-2",
      content.isLocked
        ? "opacity-60 bg-gray-50 border-gray-200"
        : "border-transparent hover:border-yellow-400 hover:shadow-lg active:scale-[0.98]"
    )}>
      {/* Compact Image/Emoji Section */}
      <div className={cn(
        "relative h-20 flex items-center justify-center bg-gradient-to-br",
        typeColors[content.type]
      )}>
        {/* Status badges */}
        {content.isNew && (
          <div className="absolute top-1 right-1">
            <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 shadow animate-pulse">
              NEW
            </Badge>
          </div>
        )}
        {content.isCompleted && (
          <div className="absolute top-1 right-1">
            <Badge className="bg-green-500 text-white text-[9px] px-1 py-0 shadow">
              ✓
            </Badge>
          </div>
        )}

        {/* Lock overlay */}
        {content.isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
        )}

        {/* Content display */}
        {content.emoji ? (
          <div className="text-3xl">{content.emoji}</div>
        ) : content.imageUrl && !imageError ? (
          <img
            src={content.imageUrl}
            alt={content.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-3xl">{typeIcons[content.type]}</div>
        )}

        {/* Difficulty badge */}
        {content.difficulty && (
          <div className="absolute bottom-1 right-1">
            <Badge className={cn(difficultyColors[content.difficulty], "text-white text-[8px] px-1 py-0")}>
              {content.difficulty}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-2 bg-white">
        <h3 className="font-bold text-[11px] text-gray-800 line-clamp-2 leading-tight mb-1">
          {content.title}
        </h3>

        {!content.isLocked && (
          <div className="flex items-center gap-0.5 text-blue-600 font-semibold text-[10px]">
            <span>{content.type === "game" ? "Play" : content.type === "video" ? "Watch" : "Start"}</span>
            <Play className="h-2.5 w-2.5" />
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Desktop/Tablet full card layout
  const desktopCardContent = (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 border-4 hidden sm:flex sm:flex-col h-full",
      content.isLocked
        ? "opacity-60 border-gray-300 bg-gray-50"
        : "border-transparent hover:border-yellow-400 hover:shadow-2xl hover:-translate-y-2"
    )}>
      {/* Image/Emoji Section */}
      <div className={cn(
        "relative h-48 flex items-center justify-center bg-gradient-to-br",
        typeColors[content.type]
      )}>
        {/* Status badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {content.isNew && (
            <Badge className="bg-red-500 text-white font-bold shadow-lg animate-pulse">
              NEW!
            </Badge>
          )}
          {content.isCompleted && (
            <Badge className="bg-green-500 text-white font-bold shadow-lg">
              <CheckCircle className="h-3 w-3 mr-1" />
              Done!
            </Badge>
          )}
        </div>

        {/* Lock overlay */}
        {content.isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="h-16 w-16 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Content display */}
        {content.emoji ? (
          <div className="text-8xl animate-bounce-slow">{content.emoji}</div>
        ) : content.imageUrl && !imageError ? (
          <img
            src={content.imageUrl}
            alt={content.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-8xl">{typeIcons[content.type]}</div>
        )}

        {/* Type badge */}
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-white/90 text-gray-800 font-bold text-xs uppercase">
            {content.type}
          </Badge>
        </div>

        {/* Difficulty badge */}
        {content.difficulty && (
          <div className="absolute bottom-3 right-3">
            <Badge className={cn(difficultyColors[content.difficulty], "text-white font-bold")}>
              {content.difficulty}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-5 bg-white flex-1 flex flex-col">
        <h3 className="font-black text-xl mb-2 text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {content.title}
        </h3>

        {content.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {content.description}
          </p>
        )}

        {/* Meta information */}
        <div className="flex items-center justify-between mt-auto pt-3">
          {content.duration && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Play className="h-3 w-3" />
              <span>{content.duration}</span>
            </div>
          )}

          {!content.isLocked && (
            <div className="ml-auto">
              <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
                <span>{content.type === "game" ? "Play Now" : content.type === "video" ? "Watch" : "Start"}</span>
                <Play className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}

          {content.isLocked && (
            <div className="ml-auto text-xs text-gray-500 font-semibold">
              🔒 Complete previous lessons
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (content.isLocked) {
    return (
      <div onClick={onClick} className="group block h-full">
        {mobileCardContent}
        {desktopCardContent}
      </div>
    )
  }

  return (
    <Link href={content.href} onClick={onClick} className="group block cursor-pointer h-full">
      {mobileCardContent}
      {desktopCardContent}
    </Link>
  )
}

