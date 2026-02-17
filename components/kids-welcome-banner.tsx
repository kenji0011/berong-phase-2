"use client"

import { useAuth } from "@/lib/auth-context"
import { Flame, Sparkles, Gamepad2, BookOpen, Trophy } from "lucide-react"

export function KidsWelcomeBanner() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] || 'Fire Hero'

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-red-500 to-orange-500 rounded-3xl shadow-2xl mb-8 border border-white/20 text-center">
      {/* Abstract background graphics */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-15 mix-blend-overlay"></div>
      </div>

      {/* Animated background elements */}
      {/* <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 animate-bounce">
          <Flame className="h-12 w-12 text-yellow-300" />
        </div>
        <div className="absolute top-20 right-20 animate-pulse">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <div className="absolute bottom-10 left-1/3 animate-bounce delay-100">
          <Flame className="h-8 w-8 text-orange-200" />
        </div>
      </div> */}

      {/* Main content */}
      <div className="relative z-10 px-8 py-12 flex flex-col items-center">
        <div className="mb-6 inline-flex items-center justify-center p-4 bg-white/20 rounded-full ring-4 ring-white/30 shadow-xl backdrop-blur-md animate-float">
          <span className="text-5xl drop-shadow-md">🐶</span>
        </div>

        {/* Welcome text */}
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 drop-shadow-xl tracking-tight">
          Welcome, {firstName}! 🔥
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-yellow-100 mb-8 drop-shadow-md max-w-lg leading-relaxed">
          Ready to become a Fire Safety Hero?
        </p>

        {/* Fun badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/40 shadow-lg hover:scale-105 transition-transform cursor-default">
            <Gamepad2 className="h-5 w-5 text-white" />
            <span className="text-white font-black text-lg shadow-black/10 drop-shadow-sm">Play</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/40 shadow-lg hover:scale-105 transition-transform cursor-default">
            <BookOpen className="h-5 w-5 text-white" />
            <span className="text-white font-black text-lg shadow-black/10 drop-shadow-sm">Learn</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/40 shadow-lg hover:scale-105 transition-transform cursor-default">
            <Trophy className="h-5 w-5 text-yellow-200" />
            <span className="text-white font-black text-lg shadow-black/10 drop-shadow-sm">Win</span>
          </div>
        </div>
      </div>
    </div>
  )
}
