"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    ArrowRight,
    Check,
    Lock,
    Trophy,
    Loader2,
    LogIn,
    X,
    Download
} from "lucide-react"
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { toPng } from "html-to-image"
import jsPDF from "jspdf"
import { useAuth } from "@/lib/auth-context"

interface EligibilityData {
    eligible: boolean
    alreadyCompleted?: boolean
    reason: string
    requirements?: {
        minEngagementPoints: number
        minModulesCompleted: number
        minQuizzesCompleted: number
    }
    current?: {
        engagementPoints: number
        modulesCompleted: number
        quizzesCompleted: number
    }
    progress?: {
        engagementPoints: number
        modulesCompleted: number
        quizzesCompleted: number
    }
    preTestScore?: number
    postTestScore?: number
    completedAt?: string
    isAdult?: boolean
}

export function LandingAssessmentSection() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [eligibility, setEligibility] = useState<EligibilityData | null>(null)
    const [showCertificate, setShowCertificate] = useState(false)
    const certificateRef = useRef<HTMLDivElement>(null)

    // Format date properly
    const formatDate = (dateString?: string) => {
        if (!dateString) return ""
        const d = new Date(dateString)
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const day = d.getDate()
        const getOrdinal = (n: number) => {
            const s = ["th", "st", "nd", "rd"]
            const v = n % 100
            return n + (s[(v - 20) % 10] || s[v] || s[0])
        }
        return `Given this ${getOrdinal(day)} day of ${monthNames[d.getMonth()]}, ${d.getFullYear()}`
    }

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            checkEligibility()
        } else {
            setLoading(false);
        }
    }, [isLoading, isAuthenticated])

    const checkEligibility = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/assessment/post-test-eligibility")
            const data = await response.json()
            setEligibility(data)
        } catch (err) {
            console.error("Failed to check eligibility", err)
        } finally {
            setLoading(false)
        }
    }

    const downloadPDF = async () => {
        if (!certificateRef.current) return;

        try {
            setDownloading(true);

            // html-to-image handles modern CSS like Tailwind v4 oklch() colors much better
            const dataUrl = await toPng(certificateRef.current, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                filter: (node) => {
                    // Filter out elements that might cause serialization issues
                    // like elements with specific oklch styles or external SVGs if they fail
                    return true;
                },
                style: {
                    // Force a consistent rendering context
                    transform: 'none',
                    margin: '0',
                }
            });

            // A4 size in mm: 297 x 210 (Landscape)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`SafeScape_Certificate_${user?.name?.replace(/\s+/g, '_') || 'Hero'}.pdf`);
        } catch (error) {
            console.error("Error generating PDF", error);
        } finally {
            setDownloading(false);
        }
    }

    const handleStartClick = () => {
        if (!isAuthenticated) {
            router.push("/auth")
        } else {
            router.push("/assessment/post-test")
        }
    }

    if (isLoading) {
        return (
            <div className="py-12 bg-slate-50 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        // <section className="pt-72 pb-24 bg-gradient-to-b from-white to-orange-50/50">
        <div className="max-w-4xl mx-auto pt-24">
            <div className="max-w-4xl mx-auto text-center mb-20">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Final Assessment</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Completed your training? Take the official post-test to certify your knowledge and become a SafeScape Hero.
                </p>
            </div>

            <div className="max-w-3xl mx-auto">
                <div className="overflow-hidden rounded-3xl bg-white/0">
                    <div className="md:flex">
                        <div className="md:w-2/5 bg-gradient-to-br from-orange-500 to-red-600 p-8 text-white flex flex-col justify-center items-center text-center rounded-3xl md:rounded-r-none shadow-xl relative z-10">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <Trophy className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">SafeScape Hero</h3>
                            <p className="text-orange-100 text-sm">Post-Test Assessment</p>
                        </div>

                        <div className="md:w-3/5 p-8 flex flex-col justify-center bg-slate-50 rounded-3xl md:rounded-l-none">
                            {!isAuthenticated ? (
                                <div className="space-y-4">
                                    <h4 className="text-xl font-bold text-slate-800">Ready to prove your skills?</h4>
                                    <p className="text-slate-600">
                                        Log in to access the final assessment. You'll need to complete the learning modules first!
                                    </p>
                                    <Button onClick={handleStartClick} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                        <LogIn className="mr-2 h-4 w-4" /> Login to Start
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-xl font-bold text-slate-800">
                                        {eligibility?.alreadyCompleted ? "You've Certified!" : "Take the Challenge"}
                                    </h4>

                                    {loading ? (
                                        <div className="flex items-center text-slate-500">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking eligibility...
                                        </div>
                                    ) : eligibility?.alreadyCompleted ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100 text-green-700">
                                                <Check className="h-5 w-5" />
                                                <span className="font-medium">Assessment Completed</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button onClick={handleStartClick} variant="outline" className="flex-1">
                                                    View Results
                                                </Button>
                                                <Button onClick={() => setShowCertificate(true)} className="flex-1 text-white bg-red-700 hover:bg-red-800">
                                                    View Certificate
                                                </Button>
                                            </div>
                                        </div>
                                    ) : eligibility?.eligible ? (
                                        <div className="space-y-4">
                                            <p className="text-slate-600">
                                                You've met all the requirements! You are now eligible to take the final post-test assessment.
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-2">
                                                <Check className="h-4 w-4" /> Requirements Met
                                            </div>
                                            <Button onClick={handleStartClick} className="w-full bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-lg">
                                                Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <h5 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                    <Lock className="h-4 w-4 text-amber-500" />
                                                    Unlock Requirements
                                                </h5>

                                                <div className="space-y-3 text-sm">
                                                    {/* Pre-Test Requirement */}
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-0.5 rounded-full p-0.5 ${typeof eligibility?.preTestScore === 'number' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`font-medium ${typeof eligibility?.preTestScore === 'number' ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                Complete Pre-Test Assessment
                                                            </p>
                                                            {typeof eligibility?.preTestScore !== 'number' && (
                                                                <Button
                                                                    variant="link"
                                                                    className="h-auto p-0 text-orange-600 hover:text-orange-700 text-xs"
                                                                    onClick={() => router.push('/assessment/pre-test')}
                                                                >
                                                                    Take Pre-Test Now →
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Modules Requirement (Kids Only) */}
                                                    {!eligibility?.isAdult && eligibility?.requirements && (
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 rounded-full p-0.5 ${(eligibility.current?.modulesCompleted || 0) >= (eligibility.requirements.minModulesCompleted || 0) ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`font-medium ${(eligibility.current?.modulesCompleted || 0) >= (eligibility.requirements.minModulesCompleted || 0) ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                    Complete Learning Modules
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Progress value={eligibility.progress?.modulesCompleted || 0} className="h-1.5 w-24" />
                                                                    <span className="text-xs text-slate-400">
                                                                        {eligibility.current?.modulesCompleted}/{eligibility.requirements.minModulesCompleted}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Engagement Points Requirement */}
                                                    {eligibility?.requirements && (
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 rounded-full p-0.5 ${(eligibility.current?.engagementPoints || 0) >= (eligibility.requirements.minEngagementPoints || 0) ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`font-medium ${(eligibility.current?.engagementPoints || 0) >= (eligibility.requirements.minEngagementPoints || 0) ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                    Earn Engagement Points
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Progress value={eligibility.progress?.engagementPoints || 0} className="h-1.5 w-24" />
                                                                    <span className="text-xs text-slate-400">
                                                                        {eligibility.current?.engagementPoints}/{eligibility.requirements.minEngagementPoints}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <Button onClick={() => router.push(user?.age && user.age < 18 ? "/kids" : "/adult")} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                                                Continue Learning Activities
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Certificate Modal */}
            <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none">
                    <DialogTitle className="sr-only">Certificate of Completion</DialogTitle>
                    <div className="relative w-full max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col items-center">
                        <DialogClose asChild>
                            <button className="absolute top-4 right-4 z-20 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors shadow-lg disabled:opacity-50" disabled={downloading}>
                                <X className="h-5 w-5" />
                            </button>
                        </DialogClose>

                        <div ref={certificateRef} className="relative w-full select-none" style={{ aspectRatio: '1123/794' }}>
                            <img src="/safescape_certificate.svg" alt="Certificate Template" className="absolute inset-0 w-full h-full object-contain" crossOrigin="anonymous" />

                            <div className="absolute inset-x-0 text-center flex justify-center items-center" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                                <h2 className="text-[clamp(1rem,3vw,2.5rem)] font-bold text-[#1a1a2e] uppercase tracking-widest" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                                    {user?.name || "Future Hero"}
                                </h2>
                            </div>

                            <div className="absolute inset-x-0 text-center flex justify-center items-center" style={{ top: '78%', transform: 'translateY(-50%)' }}>
                                <p className="text-[clamp(0.6rem,1.5vw,1rem)] text-[#333]" style={{ fontFamily: "'Alice', 'Georgia', serif" }}>
                                    {formatDate(eligibility?.completedAt)}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 w-full p-4 border-t border-slate-200 flex justify-center items-center">
                            <Button
                                onClick={downloadPDF}
                                disabled={downloading}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2"
                            >
                                {downloading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...</>
                                ) : (
                                    <><Download className="h-4 w-4" /> Download Certificate</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
        // </section>
    )
}
