"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import SplashCursor from "@/components/SplashCursor";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import {
    Github,
    Linkedin,
    Instagram,
    Globe,
    Flame,
    Users,
    GraduationCap,
    Shield,
    Handshake,
    BookOpen,
    Cpu,
    Gamepad2,
    Code,
    Database,
    Brain,
    Palette,
    Music
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Team member data
const teamMembers = [
    {
        name: "John Kervin D. Evangelista",
        roles: ["Project Head", "DevOps", "AI/ML Engineer", "Developer"],
        image: "/evangelista_1x1.png",
        socials: [
            { icon: Github, url: "https://github.com/Toneejake", label: "GitHub" },
            { icon: Globe, url: "https://toneejake.tech", label: "Portfolio" },
            { icon: Linkedin, url: "https://www.linkedin.com/in/jkevangelista/", label: "LinkedIn" },
        ],
        color: "from-red-500 to-orange-500",
        roleIcons: [Shield, Code, Brain, Cpu],
    },
    {
        name: "Aedran Gabriel R. Teaño",
        roles: ["Game Developer", "3D/2D Artist", "Sound Designer"],
        image: "/teano_1x1.jpg",
        socials: [
            { icon: Github, url: "https://github.com/Izect", label: "GitHub" },
            { icon: Instagram, url: "https://www.instagram.com/aedraaann/", label: "Instagram" },
            { icon: Linkedin, url: "https://www.linkedin.com/in/aedran-gabriel-teano-76b38a257/", label: "LinkedIn" },
        ],
        color: "from-purple-500 to-pink-500",
        roleIcons: [Gamepad2, Palette, Music],
    },
    {
        name: "Keinji C. Velina",
        roles: ["Developer", "Data Scientist", "AI Engineer"],
        image: "/velina_1x1.png",
        socials: [
            { icon: Github, url: "https://github.com/sitol2", label: "GitHub" },
            { icon: Linkedin, url: "https://www.linkedin.com/in/keinji-velina-423736326/", label: "LinkedIn" },
        ],
        color: "from-blue-500 to-cyan-500",
        roleIcons: [Code, Database, Brain],
    },
];

// Animated Feature Card Component
function FeatureCard({ feature, index }: { feature: { icon: any; title: string; description: string; color: string }; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: index * 0.1
            }}
            className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 hover:bg-white/20"
        >
            <div className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-white/80">{feature.description}</p>
        </motion.div>
    );
}

// Animated Team Card Component
function TeamCard({ member, index }: { member: typeof teamMembers[0]; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    // Different animations for each team member
    // Index 0: John - flip from left (rotateY: -15)
    // Index 1: Aedran - slide up only (no rotation)
    // Index 2: Keinji - flip from right (rotateY: 15)
    const getInitialAnimation = () => {
        switch (index) {
            case 0: return { opacity: 0, scale: 0.8, rotateY: -15, y: 40 }; // John - flip from left
            case 1: return { opacity: 0, scale: 0.8, rotateY: 0, y: 60 };   // Aedran - just slide up
            case 2: return { opacity: 0, scale: 0.8, rotateY: 15, y: 40 };  // Keinji - flip from right (left direction)
            default: return { opacity: 0, scale: 0.8, rotateY: -15, y: 40 };
        }
    };

    const getHoverAnimation = () => {
        switch (index) {
            case 0: return { scale: 1.02, rotateY: 5 };   // John - tilt right on hover
            case 1: return { scale: 1.02, y: -5 };        // Aedran - lift up on hover
            case 2: return { scale: 1.02, rotateY: -5 };  // Keinji - tilt left on hover
            default: return { scale: 1.02, rotateY: 5 };
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: index * 0.1
            }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.3 }
            }}
            className="group relative bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-border"
        >
            {/* Gradient Header */}
            <div className={`h-32 bg-gradient-to-r ${member.color} relative`}>
                <div className="absolute inset-0 bg-black/20" />
                {/* Decorative circles */}
                <motion.div
                    className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                    className="absolute top-4 left-4 w-12 h-12 bg-white/10 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                />
            </div>

            {/* Profile Image */}
            <div className="relative -mt-16 flex justify-center">
                <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${member.color} rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity`} />
                    <div className="relative w-32 h-32 rounded-full border-4 border-card overflow-hidden bg-white shadow-xl">
                        <Image
                            src={member.image}
                            alt={member.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 pt-4 text-center">
                <h3 className="text-xl font-bold text-foreground mb-2">{member.name}</h3>

                {/* Roles */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {member.roles.map((role, roleIndex) => (
                        <motion.span
                            key={roleIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.1 + roleIndex * 0.05 + 0.15 }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
                        >
                            {member.roleIcons[roleIndex] && (
                                <span className="w-3 h-3">
                                    {(() => {
                                        const Icon = member.roleIcons[roleIndex];
                                        return <Icon className="w-3 h-3" />;
                                    })()}
                                </span>
                            )}
                            {role}
                        </motion.span>
                    ))}
                </div>

                {/* Social Links */}
                <div className="flex justify-center gap-3 pt-4 border-t border-border">
                    {member.socials.map((social, socialIndex) => (
                        <Link
                            key={socialIndex}
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/social"
                        >
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 group-hover/social:scale-110"
                            >
                                <social.icon className="w-5 h-5" />
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// Partnership Card Component - Simple fade
function PartnershipCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: delay * 0.1
            }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.3 }
            }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300"
        >
            {children}
        </motion.div>
    );
}

export default function AboutPage() {
    // Hero section scroll animation
    const heroRef = useRef(null);
    const { scrollYProgress: heroScrollProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    });

    const mascotRotateY = useTransform(heroScrollProgress, [0, 1], [0, 15]);
    const mascotScale = useTransform(heroScrollProgress, [0, 0.5], [1, 0.9]);
    const heroTextY = useTransform(heroScrollProgress, [0, 1], [0, 100]);
    const heroOpacity = useTransform(heroScrollProgress, [0, 0.6], [1, 0]);
    const heroScale = useTransform(heroScrollProgress, [0, 0.8], [1, 0.95]);

    // CTA section scroll animation
    const ctaRef = useRef(null);
    const { scrollYProgress: ctaScrollProgress } = useScroll({
        target: ctaRef,
        offset: ["start end", "center center"]
    });

    const ctaScale = useTransform(ctaScrollProgress, [0, 1], [0.9, 1]);
    const ctaOpacity = useTransform(ctaScrollProgress, [0, 0.5], [0, 1]);

    // Platform Overview section scroll animation (fade out when scrolling past)
    const platformRef = useRef(null);
    const { scrollYProgress: platformScrollProgress } = useScroll({
        target: platformRef,
        offset: ["start start", "end start"]
    });
    const platformOpacity = useTransform(platformScrollProgress, [0.5, 1], [1, 0]);
    const platformScale = useTransform(platformScrollProgress, [0.5, 1], [1, 0.95]);

    // Partnership section scroll animation
    const partnershipRef = useRef(null);
    const { scrollYProgress: partnershipScrollProgress } = useScroll({
        target: partnershipRef,
        offset: ["start start", "end start"]
    });
    const partnershipOpacity = useTransform(partnershipScrollProgress, [0.5, 1], [1, 0]);
    const partnershipScale = useTransform(partnershipScrollProgress, [0.5, 1], [1, 0.95]);

    // Team section scroll animation
    const teamRef = useRef(null);
    const { scrollYProgress: teamScrollProgress } = useScroll({
        target: teamRef,
        offset: ["start start", "end start"]
    });
    const teamOpacity = useTransform(teamScrollProgress, [0.5, 1], [1, 0]);
    const teamScale = useTransform(teamScrollProgress, [0.5, 1], [1, 0.95]);

    // Floating Berong companion - follows scroll
    const pageRef = useRef(null);
    const { scrollYProgress } = useScroll();

    // Berong position changes as user scrolls through page
    // Moves from right side, through different positions based on scroll
    const berongY = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [100, 200, 350, 500, 600]);
    const berongX = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, -20, 20, -20, 0]);
    const berongRotate = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, -10, 10, -5, 0]);
    const berongScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.9]);

    const features = [
        {
            icon: BookOpen,
            title: "E-Learning Modules",
            description: "Interactive courses for professionals, adults, and kids tailored to different learning needs.",
            color: "bg-blue-500",
        },
        {
            icon: Brain,
            title: "AI-Powered Chatbot",
            description: "Berong AI assistant trained on official BFP protocols to answer your fire safety questions.",
            color: "bg-purple-500",
        },
        {
            icon: Flame,
            title: "Fire Simulation",
            description: "Advanced fire spread simulation using PPO and UNet models for evacuation planning.",
            color: "bg-orange-500",
        },
        {
            icon: Gamepad2,
            title: "Educational Games",
            description: "Fun and engaging games that teach fire safety concepts to learners of all ages.",
            color: "bg-green-500",
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <Navigation />
            <SplashCursor />

            <main className="flex-grow">
                {/* Hero Section with 3D Parallax */}
                <motion.section
                    ref={heroRef}
                    className="relative bg-white py-20 sm:py-28 overflow-hidden"
                    style={{ opacity: heroOpacity, scale: heroScale }}
                >
                    {/* Background Pattern */}
                    <motion.div
                        className="absolute inset-0 opacity-5"
                        style={{ y: useTransform(heroScrollProgress, [0, 1], [0, 50]) }}
                    >
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dc2626' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </motion.div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                            {/* Berong Mascot - 3D Rotation on Scroll */}
                            <motion.div
                                className="flex-shrink-0"
                                style={{
                                    rotateY: mascotRotateY,
                                    scale: mascotScale,
                                    transformPerspective: 1000
                                }}
                            >
                                <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96">
                                    <motion.div
                                        className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl"
                                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="relative w-full h-full"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: [0, -10, 0]
                                        }}
                                        transition={{
                                            opacity: { duration: 0.6 },
                                            scale: { duration: 0.6 },
                                            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                    >
                                        <Image
                                            src="/berong-official-logo.jpg"
                                            alt="Berong's E-Learning - Official Logo"
                                            fill
                                            className="object-contain drop-shadow-2xl relative z-10 rounded-full"
                                            priority
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Hero Content - Parallax Text */}
                            <motion.div
                                className="text-center lg:text-left flex-grow max-w-2xl"
                                style={{ y: heroTextY, opacity: heroOpacity }}
                            >
                                <motion.span
                                    className="text-red-600 font-semibold text-lg sm:text-xl uppercase tracking-wider mb-4 block"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    About SafeScape
                                </motion.span>
                                <motion.h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.05 }}
                                >
                                    Meet <span className="text-red-600">Berong</span>
                                </motion.h1>
                                <motion.p
                                    className="text-2xl sm:text-3xl font-light mb-6 text-gray-700"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                >
                                    Your Fire Safety Companion
                                </motion.p>
                                <motion.p
                                    className="text-lg sm:text-xl text-gray-600 leading-relaxed"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.15 }}
                                >
                                    <strong className="text-gray-900">SafeScape</strong>, locally known as <strong className="text-gray-900">&quot;Berong E-Learning&quot;</strong>, is named after the official mascot of the Bureau of Fire Protection.
                                    Berong represents our commitment to making fire safety education accessible, engaging, and effective for every Filipino.
                                </motion.p>
                            </motion.div>
                        </div>
                    </div>
                </motion.section>

                {/* Platform Overview Section - Card Flip Animation */}
                <motion.section
                    ref={platformRef}
                    className="py-16 sm:py-20 bg-gradient-to-br from-red-700 via-red-600 to-orange-500 text-white relative overflow-hidden"
                    style={{ opacity: platformOpacity, scale: platformScale }}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <motion.div
                            className="text-center mb-12"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                                What is <span className="text-yellow-400">SafeScape</span>?
                            </h2>
                            <p className="text-white/90 max-w-3xl mx-auto text-lg">
                                A comprehensive fire safety education platform designed to empower communities with knowledge and skills.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: 1000 }}>
                            {features.map((feature, index) => (
                                <FeatureCard key={index} feature={feature} index={index} />
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Partnership Section - 3D Perspective Depth */}
                <motion.section
                    ref={partnershipRef}
                    className="py-16 sm:py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden"
                    style={{ opacity: partnershipOpacity, scale: partnershipScale }}
                >
                    {/* Animated Background decoration */}
                    <motion.div
                        className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"
                        animate={{
                            x: [0, 30, 0],
                            y: [0, -20, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"
                        animate={{
                            x: [0, -30, 0],
                            y: [0, 20, 0],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 10, repeat: Infinity }}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <motion.div
                            className="text-center mb-12"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <span className="text-yellow-400 font-semibold text-lg uppercase tracking-wider mb-4 block">
                                Collaborative Initiative
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                LSPU & BFP Sta. Cruz Partnership
                            </h2>
                            <p className="text-gray-300 max-w-4xl mx-auto text-lg leading-relaxed">
                                SafeScape is a collaborative research initiative between the <strong className="text-white">College of Computer Studies (CCS)</strong> at
                                <strong className="text-white"> Laguna State Polytechnic University (LSPU) - Santa Cruz Campus</strong> and the
                                <strong className="text-white"> Bureau of Fire Protection (BFP) Santa Cruz</strong>. This partnership was formalized through a
                                Memorandum of Agreement to address local fire safety challenges by leveraging advanced digital technologies.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ perspective: 1500 }}>
                            {/* LSPU Card */}
                            <PartnershipCard delay={0}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <Image
                                            src="/lspu logo.png"
                                            alt="LSPU Logo"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">LSPU - Santa Cruz Campus</h3>
                                        <p className="text-gray-400">College of Computer Studies</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    The university provided technological expertise in AI, machine learning, and software development.
                                    Computer Science researchers majoring in Intelligent Systems designed and developed the platform under academic supervision.
                                </p>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <GraduationCap className="w-6 h-6 text-yellow-400" />
                                        <div>
                                            <p className="text-yellow-400 font-semibold text-sm">Project Initiation & Thesis Adviser</p>
                                            <p className="text-white font-medium">Dr. Mia V. Villarica, DIT</p>
                                            <p className="text-gray-400 text-sm">CCS Dean, LSPU Santa Cruz</p>
                                        </div>
                                    </div>
                                </div>
                            </PartnershipCard>

                            {/* BFP Card */}
                            <PartnershipCard delay={1}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <Image
                                            src="/bfp logo.png"
                                            alt="BFP Logo"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">BFP Santa Cruz Fire Station</h3>
                                        <p className="text-gray-400">Bureau of Fire Protection</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 leading-relaxed mb-4">
                                    BFP Santa Cruz reached out to LSPU-CCS to find innovative ways to enhance community fire preparedness.
                                    They provided the official knowledge base, including manuals and protocols, used to train the Berong AI chatbot and develop educational modules.
                                </p>
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-yellow-400" />
                                        <div>
                                            <p className="text-yellow-400 font-semibold text-sm">Project Initiator & Guide</p>
                                            <p className="text-white font-medium">FSINSP Cesar A. Morfe Jr.</p>
                                            <p className="text-gray-400 text-sm">Initiated the partnership and provided constant guidance</p>
                                        </div>
                                    </div>
                                </div>
                            </PartnershipCard>
                        </div>
                    </div>
                </motion.section>

                {/* Research Team Section - Staggered 3D Cards */}
                <motion.section
                    ref={teamRef}
                    className="py-16 sm:py-20 bg-white"
                    style={{ opacity: teamOpacity, scale: teamScale }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            className="text-center mb-12"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <span className="text-red-600 font-semibold text-lg uppercase tracking-wider mb-4 block">
                                The Research Team
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                                Meet the Developers
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                                Computer Science researchers majoring in Intelligent Systems who designed and developed SafeScape.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ perspective: 1200 }}>
                            {teamMembers.map((member, index) => (
                                <TeamCard key={index} member={member} index={index} />
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Call to Action - Zoom and Fade */}
                <motion.section
                    ref={ctaRef}
                    className="py-16 sm:py-20 bg-gradient-to-r from-red-600 to-orange-500 text-white"
                    style={{ scale: ctaScale, opacity: ctaOpacity }}
                >
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Flame className="w-16 h-16 mx-auto mb-6" />
                        </motion.div>
                        <motion.h2
                            className="text-3xl sm:text-4xl font-bold mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            Ready to Learn Fire Safety?
                        </motion.h2>
                        <motion.p
                            className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Join thousands of Filipinos in learning essential fire safety skills. Start your journey with Berong today!
                        </motion.p>
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                        >
                            <Link href="/">
                                <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 font-bold px-8 py-6 text-lg">
                                    Explore Platform
                                </Button>
                            </Link>
                            <Link href="/auth">
                                <Button size="lg" variant="outline" className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-red-600 font-bold px-8 py-6 text-lg">
                                    Create Account
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </motion.section>
            </main>

            <Footer />
        </div>
    );
}
