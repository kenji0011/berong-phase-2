"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, GripVertical } from "lucide-react"
import type { CarouselImage } from "@/lib/mock-data"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Carousel Item Component
function SortableCarouselItem({
    image,
    onDelete
}: {
    image: CarouselImage
    onDelete: (id: string | number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: image.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-4 border rounded-lg bg-background ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                }`}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded transition-colors"
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{image.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{image.altText}</p>
            </div>

            <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(image.id)}
                className="ml-4 shrink-0"
                aria-label="Delete image"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

// Main Sortable Carousel List Component
export function SortableCarouselList({
    images,
    onReorder,
    onDelete,
}: {
    images: CarouselImage[]
    onReorder: (newOrder: CarouselImage[]) => Promise<void>
    onDelete: (id: string | number) => void
}) {
    const [localImages, setLocalImages] = useState(images)

    // Update local state when prop changes
    useEffect(() => {
        setLocalImages(images)
    }, [images])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) {
            return
        }

        const oldIndex = localImages.findIndex((img) => img.id === active.id)
        const newIndex = localImages.findIndex((img) => img.id === over.id)

        const newOrder = arrayMove(localImages, oldIndex, newIndex)

        // Optimistic update
        setLocalImages(newOrder)

        try {
            await onReorder(newOrder)
        } catch (error) {
            // Revert on error
            setLocalImages(images)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Current Carousel Images</CardTitle>
                <CardDescription>
                    {images.length} images in carousel • Drag to reorder
                </CardDescription>
            </CardHeader>
            <CardContent>
                {localImages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                        No carousel images yet
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localImages.map((img) => img.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {localImages.map((image) => (
                                    <SortableCarouselItem
                                        key={image.id}
                                        image={image}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardContent>
        </Card>
    )
}
