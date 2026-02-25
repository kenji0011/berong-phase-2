"use client"

import { useState } from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import Image from 'next/image';
import { Maximize2 } from "lucide-react"
import { ImageViewerModal } from "@/components/image-viewer-modal"

type CarouselImage = {
    id: number;
    title: string;
    altText: string | null;
    imageUrl: string;
    order: number;
    isActive: boolean;
};

interface HeroCarouselClientProps {
    images: CarouselImage[];
}

export function HeroCarouselClient({ images }: HeroCarouselClientProps) {
    const [isViewerOpen, setIsViewerOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState<CarouselImage | null>(null)

    const handleImageClick = (image: CarouselImage) => {
        setSelectedImage(image)
        setIsViewerOpen(true)
    }

    return (
        <div className="relative w-full max-w-7xl mx-auto">
            <Carousel
                className="w-full"
                plugins={[
                    Autoplay({
                        delay: 4000,
                        stopOnInteraction: false,
                    }),
                ]}
            >
                <CarouselContent>
                    {images.map((image) => (
                        <CarouselItem key={image.id}>
                            <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden rounded-lg shadow-lg group/slide">
                                <Image
                                    src={image.imageUrl}
                                    alt={image.altText ?? image.title}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className="transition-opacity duration-500 ease-in-out"
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4 sm:p-6 md:p-8 pointer-events-none">
                                    <div className="text-white">
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">{image.title}</h2>
                                        <p className="text-sm sm:text-base md:text-lg opacity-90 line-clamp-2">Learn more about fire safety with BFP Berong.</p>
                                    </div>
                                </div>

                                {/* Transparent Clickable Overlay Button */}
                                <button
                                    onClick={() => handleImageClick(image)}
                                    className="absolute inset-0 z-10 w-full h-full cursor-pointer bg-transparent hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                                    aria-label={`View full screen image: ${image.title}`}
                                >
                                    {/* Maximize Icon (Top Right) */}
                                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-300">
                                        <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5 sm:p-2 text-white shadow-sm">
                                            <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {/* Hide arrows on mobile, show on tablet+ */}
                <CarouselPrevious className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex" />
                <CarouselNext className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex" />
            </Carousel>

            {/* Image Viewer Modal */}
            {selectedImage && (
                <ImageViewerModal
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    imageUrl={selectedImage.imageUrl}
                    imageTitle={selectedImage.title}
                    imageAlt={selectedImage.altText ?? selectedImage.title}
                />
            )}
        </div>
    );
}
