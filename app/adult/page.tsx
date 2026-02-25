"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Flame, Search, BookOpen, Calendar, User, ArrowRight, AlertCircle } from "lucide-react"
import type { BlogPost } from "@/lib/mock-data"
import Link from "next/link"
import { Footer } from "@/components/footer"
import SpotlightCard from "@/components/ui/spotlight-card"
import "@/components/ui/spotlight-card.css"
import TiltedCard from "@/components/ui/tilted-card"
import { AdultWelcomeBanner } from "@/components/adult-welcome-banner"

export default function AdultPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [searchQuery, setSearchQuery] = useState("")

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

    // Load blogs from database
    const loadBlogs = async () => {
      try {
        const response = await fetch('/api/content/blogs')
        if (response.ok) {
          const allBlogs = await response.json()
          setBlogs(allBlogs.filter((blog: any) => blog.category === "adult"))
        } else {
          console.error('Failed to load blogs')
        }
      } catch (error) {
        console.error('Error loading blogs:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBlogs()
  }, [isLoading, user, router])

  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return null // Global PageLoader handles loading
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <AdultWelcomeBanner />

        {/* Access Notice */}
        <Alert className="mb-6 border-accent bg-accent/5">
          <Flame className="h-4 w-4 text-accent" />
          <AlertDescription className="text-foreground">
            Learn essential fire safety practices to protect your home and family.
          </AlertDescription>
        </Alert>

        {/* Feature Cards - Compact on mobile */}
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 mb-6 sm:mb-8">
          <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)">
            <Card
              className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-accent h-full group"
              onClick={() => document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div
                className="absolute inset-0 bg-cover bg-center z-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ backgroundImage: "url('/Articles Modal.png')" }}
              />
              <CardContent className="relative z-10 p-4 sm:p-6 bg-background/60 backdrop-blur-[2px]">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-accent flex-shrink-0 mt-0.5 drop-shadow-md" />
                  <div className="min-w-0 flex-1 drop-shadow-sm">
                    <CardTitle className="text-lg sm:text-2xl mb-1 sm:mb-2 text-foreground font-extrabold">Fire Safety Articles</CardTitle>
                    <p className="text-xs sm:text-sm text-foreground/90 font-medium mb-2 sm:mb-4 line-clamp-2">
                      Read comprehensive articles on home fire safety, prevention tips, and emergency preparedness.
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-accent">{blogs.length} articles available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SpotlightCard>

          <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.15)">
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-red-500 h-full group">
              <div
                className="absolute inset-0 bg-cover bg-center z-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ backgroundImage: "url('/EDITH Modal.png')" }}
              />
              <CardContent className="relative z-10 p-4 sm:p-6 bg-background/60 backdrop-blur-[2px]">
                <div className="flex items-start gap-3">
                  <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0 mt-0.5 drop-shadow-md" />
                  <div className="min-w-0 flex-1 drop-shadow-sm">
                    <CardTitle className="text-lg sm:text-2xl mb-1 sm:mb-2 text-foreground font-extrabold">Exit Drill In The Home (EDITH)</CardTitle>
                    <p className="text-xs sm:text-sm text-foreground/90 font-medium mb-2 sm:mb-4 line-clamp-2">
                      Interactive tool to visualize how fire spreads in different environments.
                    </p>
                    <Link href="/adult/simulation">
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto mt-2 shadow-md">
                        Launch Simulator
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
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
              placeholder="Search fire safety articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Blog Grid */}
        <div id="articles-section">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Fire Safety Articles</h2>
          {filteredBlogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No articles found matching your search." : "No articles available yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog) => (
                <Link key={blog.id} href={`/adult/blog/${blog.id}`}>
                  <TiltedCard
                    imageSrc={blog.imageUrl || "/placeholder.svg?height=300&width=400"}
                    altText={blog.title}
                    captionText="Click to read"
                    containerHeight="280px"
                    containerWidth="100%"
                    imageHeight="280px"
                    imageWidth="100%"
                    scaleOnHover={1.05}
                    rotateAmplitude={10}
                    showTooltip={true}
                    displayOverlayContent={true}
                    overlayContent={
                      <div className="text-white">
                        <h3 className="font-bold text-lg line-clamp-2 mb-2">{blog.title}</h3>
                        <p className="text-sm text-white/80 line-clamp-2 mb-3">{blog.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{blog.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(blog.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
