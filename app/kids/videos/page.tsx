"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play } from "lucide-react"
import Link from "next/link"

const kidsVideos = [
  {
    id: "1",
    title: "Fire Safety for Kids",
    youtubeId: "kMGrundV4KY",
    description: "Learn important fire safety rules in a fun way!",
    emoji: "🎬"
  },
  {
    id: "2",
    title: "Stop, Drop, and Roll",
    youtubeId: "eDQXFWOy3Ek",
    description: "Learn what to do if your clothes catch fire!",
    emoji: "🔥"
  },
  {
    id: "3",
    title: "Meet a Firefighter",
    youtubeId: "CtvUSvNfVCY",
    description: "See what firefighters do every day!",
    emoji: "🚒"
  },
]

export default function KidsVideosPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [selectedVideo, setSelectedVideo] = useState(kidsVideos[0])

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (!user?.permissions.accessKids && user?.role !== 'admin') {
      router.push("/")
      return
    }
  }, [isAuthenticated, user, router, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-semibold">Loading videos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/kids/dashboard">
          <Button variant="ghost" className="mb-6 hover:bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎬</div>
          <h1 className="text-4xl font-black text-purple-800 mb-2">Fire Safety Videos</h1>
          <p className="text-xl text-purple-600">Learn fire safety through fun videos!</p>
        </div>

        {/* Main Video Player */}
        <Card className="border-4 border-purple-500 mb-8 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{selectedVideo.emoji}</div>
              <CardTitle className="text-2xl text-purple-800">{selectedVideo.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=0&rel=0`}
                title={selectedVideo.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-6 bg-white">
              <p className="text-lg text-gray-700">{selectedVideo.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Video Playlist */}
        <h2 className="text-2xl font-black mb-6 text-gray-800 flex items-center gap-2">
          <Play className="h-6 w-6 text-purple-600" />
          More Videos to Watch
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {kidsVideos.map((video) => (
            <Card
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`cursor-pointer transition-all border-4 hover:shadow-xl hover:-translate-y-1 ${selectedVideo.id === video.id
                  ? 'border-purple-500 bg-purple-50 scale-105'
                  : 'border-transparent hover:border-purple-300'
                }`}
            >
              <CardContent className="p-5">
                {/* Thumbnail */}
                <div className="relative mb-4 rounded-lg overflow-hidden aspect-video bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                  <div className="text-6xl">{video.emoji}</div>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-16 w-16 text-white drop-shadow-lg" />
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-black text-lg text-gray-800 mb-2 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {video.description}
                </p>

                {selectedVideo.id === video.id && (
                  <div className="mt-3 flex items-center gap-2 text-purple-600 font-bold text-sm">
                    <Play className="h-4 w-4" />
                    Now Playing
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fun Footer */}
        <Card className="mt-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-orange-400">
          <CardContent className="p-6 text-center">
            <div className="text-5xl mb-3">⭐</div>
            <h3 className="text-2xl font-black text-orange-800 mb-2">Great Job Watching!</h3>
            <p className="text-orange-700 font-semibold">
              Every video makes you smarter about fire safety! Keep learning! 🎓
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
