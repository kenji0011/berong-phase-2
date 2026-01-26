"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Video, Clock, Search, BookOpen, FileText, AlertCircle, Play } from "lucide-react"
import type { VideoContent } from "@/lib/mock-data"
import { ManualsDialog } from "@/components/ui/manuals-dialog"
import { Footer } from "@/components/footer"
import SpotlightCard from "@/components/ui/spotlight-card"
import "@/components/ui/spotlight-card.css"
import { logEngagement } from "@/lib/engagement-tracker"

export default function ProfessionalPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<VideoContent[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null)
  const trackedVideos = useRef<Set<string>>(new Set())

  // Handle video selection with tracking
  const handleVideoSelect = (video: VideoContent) => {
    setSelectedVideo(video)
    if (!trackedVideos.current.has(video.id)) {
      trackedVideos.current.add(video.id)
      logEngagement({
        activityType: "VIDEO_WATCHED",
        metadata: { videoId: String(video.id), videoTitle: video.title }
      })
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (!user?.permissions.accessProfessional) {
      router.push("/")
      return
    }

    // Load videos from database
    const loadVideos = async () => {
      try {
        const response = await fetch('/api/content/videos')
        if (response.ok) {
          const videosData = await response.json()
          setVideos(videosData)
        } else {
          console.error('Failed to load videos')
        }
      } catch (error) {
        console.error('Error loading videos:', error)
      }
    }

    loadVideos()
    setLoading(false)
  }, [isAuthenticated, user, router])

  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Professional Training</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Advanced firefighting techniques and professional development resources
          </p>
        </div>

        {/* Access Notice */}
        <Alert className="mb-6 border-primary bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            This section contains professional-level content for firefighters and fire safety professionals.
          </AlertDescription>
        </Alert>

        {/* Quick Links - Horizontal on mobile, grid on desktop */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-6 sm:mb-8">
          <SpotlightCard spotlightColor="rgba(220, 38, 38, 0.15)">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary h-full">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">Training Videos</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{videos.length} professional training videos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-secondary h-full">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-secondary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">BFP Manuals</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Standard operating procedures and guidelines</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-accent h-full">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-xl">Fire Codes</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Fire safety regulations and compliance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SpotlightCard>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search training videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Video Player */}
        {selectedVideo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">{selectedVideo.title}</CardTitle>
              <CardDescription>{selectedVideo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{selectedVideo.duration}</span>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  Professional
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-foreground">Training Videos</h2>
          {filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No videos found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleVideoSelect(video)}
                >
                  <CardHeader className="pb-3">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3 relative">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{video.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{video.duration}</span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        Professional
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Additional Resources</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.2)">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="h-6 w-6 text-secondary" />
                    <CardTitle>BFP Standard Operating Procedures</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-pretty">
                    Access comprehensive manuals covering firefighting operations, emergency response protocols, and
                    safety procedures.
                  </p>
                  <ManualsDialog>
                    <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Manuals
                    </Button>
                  </ManualsDialog>
                </CardContent>
              </Card>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.2)">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-6 w-6 text-accent" />
                    <CardTitle>Fire Code & Regulations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-pretty">
                    Stay updated with the latest fire safety codes, building regulations, and compliance requirements.
                  </p>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                    <Link href="/professional/fire-codes">
                      <FileText className="h-4 w-4 mr-2" />
                      View Fire Codes
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </SpotlightCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
