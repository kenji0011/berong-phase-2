'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './gooey-nav.css';

export interface GooeyNavItem {
    label: string;
    href: string;
}

interface GooeyNavProps {
    items: GooeyNavItem[];
    particleCount?: number;
    animationTime?: number;
    className?: string;
}

export default function GooeyNav({
    items,
    particleCount = 10,
    animationTime = 600,
    className = ''
}: GooeyNavProps) {
    const pathname = usePathname();
    const [particles, setParticles] = useState<{ id: number; style: React.CSSProperties }[]>([]);
    const [particlePosition, setParticlePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Determine active index based on current pathname
    const activeIndex = items.findIndex(item => {
        if (item.href === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(item.href);
    });

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
        if (index === activeIndex) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
            setParticlePosition({
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top + rect.height / 2
            });
        }

        // Create particles
        const newParticles = Array.from({ length: particleCount }, (_, i) => {
            const angle = (Math.random() * 360) * (Math.PI / 180);
            const distance = 20 + Math.random() * 30;
            const startX = (Math.random() - 0.5) * 10;
            const startY = (Math.random() - 0.5) * 10;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            const rotate = (Math.random() - 0.5) * 360;
            const scale = 0.3 + Math.random() * 0.6;
            const hue = 40 + Math.random() * 20; // Yellow/gold colors

            return {
                id: Date.now() + i,
                style: {
                    '--start-x': `${startX}px`,
                    '--start-y': `${startY}px`,
                    '--end-x': `${endX}px`,
                    '--end-y': `${endY}px`,
                    '--rotate': `${rotate}deg`,
                    '--scale': scale,
                    '--color': `hsl(${hue}, 90%, 55%)`,
                    '--time': `${animationTime}ms`
                } as React.CSSProperties
            };
        });

        setParticles(newParticles);

        // Clear particles after animation
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setParticles([]);
        }, animationTime);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className={`gooey-nav-container ${className}`} ref={containerRef}>
            <nav>
                <ul>
                    {items.map((item, index) => (
                        <li
                            key={item.href}
                            className={index === activeIndex ? 'active' : ''}
                        >
                            <Link
                                href={item.href}
                                prefetch={false}
                                onClick={(e) => handleClick(e, index)}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Particle effect container */}
            {particles.length > 0 && (
                <div
                    className="effect filter"
                    style={{
                        left: particlePosition.x,
                        top: particlePosition.y
                    }}
                >
                    {particles.map((particle) => (
                        <span key={particle.id} className="particle" style={particle.style}>
                            <span className="point" style={particle.style} />
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
