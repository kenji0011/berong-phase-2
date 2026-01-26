"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, User, Flame, AlertCircle } from "lucide-react"
import type { BlogPost } from "@/lib/mock-data"
import Link from "next/link"
import { logEngagement } from "@/lib/engagement-tracker"

export default function BlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [blog, setBlog] = useState<BlogPost | null>(null)
  const hasTracked = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth")
      return
    }

    if (!user?.permissions.accessAdult) {
      router.push("/")
      return
    }

    const loadBlog = async () => {
      try {
        const response = await fetch(`/api/content/blogs/${params.id}`)
        if (response.ok) {
          const blogData = await response.json()
          setBlog(blogData)
        } else {
          setBlog(null)
        }
      } catch (error) {
        console.error('Error loading blog post:', error)
        setBlog(null)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadBlog()
    }
  }, [isAuthenticated, user, router, params.id])

  // Track reading engagement when blog is loaded
  useEffect(() => {
    if (blog && !hasTracked.current) {
      hasTracked.current = true
      logEngagement({
        activityType: "READING_MATERIAL",
        metadata: { materialId: String(params.id), materialTitle: blog.title }
      })
    }
  }, [blog, params.id])

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading article...</p>
        </div>
      </div>
    )
  }

  // --- 404 State ---
  if (!blog) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="bg-gray-50 rounded-2xl p-12 border border-gray-100">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Article not found</h2>
            <p className="text-gray-500 mb-8">The article you are looking for has been moved or deleted.</p>
            <Link href="/adult">
              <Button variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Articles
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // --- Main Article View ---
  return (
    <div className="min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Top Navigation */}
        <div className="mb-8">
          <Link
            href="/adult"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Safety Articles
          </Link>
        </div>

        <article>
          {/* Header Section */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-orange-100">
                Fire Safety
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.15]">
              {blog.title}
            </h1>

            {/* Author & Date Byline */}
            <div className="flex items-center border-b border-gray-100 pb-8">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mr-4 ring-2 ring-white shadow-sm">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {blog.author || "BFP Contributor"}
                </p>
                <div className="flex items-center text-sm text-gray-500 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <time dateTime={blog.createdAt}>
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Image */}
          {blog.imageUrl && (
            <div className="relative w-full aspect-video mb-12 rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-900/5">
              <img
                src={blog.imageUrl || "/placeholder.svg"}
                alt={blog.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  e.currentTarget.src = `/placeholder.svg?height=600&width=1200&query=${encodeURIComponent(blog.title)}`
                }}
              />
            </div>
          )}

          {/* Content Body */}
          {/* Note: 'prose-lg' creates nice readability. 'whitespace-pre-line' respects your database line breaks. */}
          <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-p:text-gray-600 prose-img:rounded-xl">
            <div className="whitespace-pre-line leading-8">
              {blog.content}
            </div>
          </div>

          {/* Footer / Emergency Action */}
          <div className="mt-16 p-8 bg-red-50 rounded-2xl border border-red-100 flex flex-col sm:flex-row gap-6 items-start shadow-sm">
            <div className="p-3 bg-white rounded-full shrink-0 shadow-sm">
              <Flame className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Emergency Protocol</h3>
              <p className="text-red-900/80 leading-relaxed">
                In case of a fire emergency, do not hesitate. Call <strong>911</strong> immediately.
                Never put yourself at risk trying to fight a large fire.
                <strong> Evacuate first</strong>, then call for help.
              </p>
            </div>
          </div>

        </article>
      </main>
    </div>
  )
}