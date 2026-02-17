"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ImageViewerModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
    imageTitle: string
    imageAlt: string
}

export function ImageViewerModal({
    isOpen,
    onClose,
    imageUrl,
    imageTitle,
    imageAlt
}: ImageViewerModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none" aria-describedby={undefined}>
                <DialogTitle className="sr-only">{imageTitle}</DialogTitle>
                <div className="relative w-full h-[90vh] bg-black">
                    <Image
                        src={imageUrl}
                        alt={imageAlt}
                        fill
                        className="object-contain"
                        priority
                    />

                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white z-10"
                        aria-label="Close image viewer"
                    >
                        <X className="h-6 w-6" />
                    </Button>

                    {imageTitle && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                            <h3 className="text-white text-xl font-semibold">{imageTitle}</h3>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
