"use client"

import { useAuth } from "@/lib/auth-context"
import { Shield, FileText, CheckCircle } from "lucide-react"

export function ProfessionalWelcomeBanner() {
    const { user } = useAuth()
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 rounded-3xl shadow-xl mb-8 border border-slate-700 text-center">
            {/* Abstract background graphics */}
            <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
            </div>

            {/* Main content */}
            <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-12 flex flex-col items-center">
                <div className="mb-4 inline-flex items-center justify-center p-3 bg-slate-800 rounded-2xl ring-1 ring-red-500 shadow-lg shadow-red-900/20">
                    <Shield className="h-10 w-10 text-red-400" />
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-cyan-200">{user?.name || 'Officer'}</span>
                </h1>

                <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-6 font-medium leading-relaxed opacity-90">
                    Ready to continue your professional development? <br className="hidden sm:block" /> Access the latest protocols and training modules.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-600 text-slate-300 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        {currentDate}
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-green-500/30 text-green-400 text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        System Operational
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-blue-500/30 text-blue-400 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        New Protocols Available
                    </span>
                </div>
            </div>
        </div>
    )
}
