'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export function PageLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Set loading to false after navigation completes
        setIsLoading(false);
    }, [pathname, searchParams]);

    useEffect(() => {
        // Listen for route change start
        const handleStart = () => setIsLoading(true);
        const handleComplete = () => setIsLoading(false);

        // Use click listener to detect navigation
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link && link.href && !link.href.startsWith('#') && !link.target) {
                const url = new URL(link.href, window.location.origin);
                if (url.origin === window.location.origin && url.pathname !== pathname) {
                    setIsLoading(true);
                }
            }
        };

        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [pathname]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-red-700 via-red-600 to-orange-600">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[url('/web-background-image.jpg')] bg-cover" style={{ backgroundPosition: 'center 80%' }} />
            </div>

            {/* Loader content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Berong Logo Spinner */}
                <div className="relative">
                    {/* Outer spinning ring */}
                    <div className="absolute -inset-4 border-4 border-yellow-400/30 rounded-full"></div>
                    <div className="absolute -inset-4 border-4 border-transparent border-t-yellow-400 border-r-orange-500 rounded-full animate-spin"></div>

                    {/* Glow effect behind logo */}
                    <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>

                    {/* Berong Logo */}
                    <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-yellow-400/50">
                        <Image
                            src="/berong-official-logo.jpg"
                            alt="Berong - Loading"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Loading text */}
                <div className="mt-8 text-center">
                    <p className="text-white font-semibold text-lg">Loading</p>
                    <div className="flex gap-1 justify-center mt-1">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
