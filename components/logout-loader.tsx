'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

export function LogoutLoader() {
    const { isLoggingOut } = useAuth();

    return (
        <AnimatePresence>
            {isLoggingOut && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[999999] flex items-center justify-center"
                >
                    {/* Background with blur */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-red-900/90 via-red-800/90 to-orange-900/90 backdrop-blur-md"
                        style={{ backgroundImage: "url('/web-background-image.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 80%' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/95 via-red-800/95 to-orange-900/95 backdrop-blur-sm" />
                    </div>

                    {/* Loader content */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Animated Berong logo */}
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, -5, 0]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                repeatType: "loop"
                            }}
                            className="mb-6"
                        >
                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                                <Image
                                    src="/berong-official-logo.jpg"
                                    alt="Berong - Logging Out"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </motion.div>

                        {/* Text */}
                        <motion.h2
                            className="text-2xl font-bold text-white mb-2"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Logging Out...
                        </motion.h2>

                        <p className="text-white/70 text-sm">See you next time!</p>

                        {/* Loading dots */}
                        <div className="flex gap-2 mt-4">
                            <motion.span
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            />
                            <motion.span
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.span
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
