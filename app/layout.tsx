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
        {/* Suppress noisy console warnings/errors for a clean production console */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var suppressed = [
                  'preloaded using link preload but not used',
                  'Failed to load resource',
                  '[Fast Refresh]',
                  'Download the React DevTools'
                ];
                function shouldSuppress(args) {
                  if (args.length === 0) return false;
                  var msg = typeof args[0] === 'string' ? args[0] : '';
                  for (var i = 0; i < suppressed.length; i++) {
                    if (msg.indexOf(suppressed[i]) !== -1) return true;
                  }
                  return false;
                }
                var ow = console.warn, oe = console.error, ol = console.log, od = console.debug;
                console.warn = function() { if (!shouldSuppress(arguments)) ow.apply(console, arguments); };
                console.error = function() { if (!shouldSuppress(arguments)) oe.apply(console, arguments); };
                console.log = function() { if (!shouldSuppress(arguments)) ol.apply(console, arguments); };
                console.debug = function() { if (!shouldSuppress(arguments)) od.apply(console, arguments); };
              })();
            `,
          }}
        />
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

