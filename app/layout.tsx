import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { Chatbot } from "@/components/chatbot"
import { Suspense } from "react"
import { PageLoader } from "@/components/page-loader"
import { LogoutLoader } from "@/components/logout-loader"
import { LoginLoader } from "@/components/login-loader"
import { ProfileCheckWrapper } from "@/components/profile-check-wrapper"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Berong E-Learning for BFP Sta Cruz",
  description: "Educational platform for fire safety training and awareness",
  generator: 'v0.app',
  icons: {
    icon: '/berong-official-logo.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased relative min-h-screen">
        {/* Suppress Next.js Fast Refresh logs in development to reduce console noise */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const originalLog = console.log;
                  console.log = function(...args) {
                    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('[Fast Refresh]')) return;
                    originalLog.apply(console, args);
                  };
                  const originalDebug = console.debug;
                  console.debug = function(...args) {
                    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('[Fast Refresh]')) return;
                    originalDebug.apply(console, args);
                  };
                })();
              `,
            }}
          />
        )}
        {/* Page Loader for transitions */}
        <Suspense fallback={null}>
          <PageLoader />
        </Suspense>

        {/* Background Image Layer - 20% opacity */}
        <div
          className="fixed inset-0 opacity-20 bg-cover z-0 pointer-events-none"
          style={{ backgroundImage: "url('/web-background-image.jpg')", backgroundPosition: 'center 80%' }}
        />

        {/* Content Layer - Full opacity */}
        <div className="relative z-10">
          <AuthProvider>
            <ProfileCheckWrapper>
              {children}
            </ProfileCheckWrapper>
            <Chatbot />
            <LoginLoader />
            <LogoutLoader />
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}

