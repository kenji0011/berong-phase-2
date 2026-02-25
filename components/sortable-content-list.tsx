"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, GripVertical } from "lucide-react"
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

// Generic item interface - must have id and title at minimum
interface SortableItem {
    id: string | number
    title: string
    [key: string]: any
}

// Sortable Item Component
function SortableContentItem<T extends SortableItem>({
    item,
    renderContent,
    onDelete,
}: {
    item: T
    renderContent: (item: T) => React.ReactNode
    onDelete: (id: string | number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

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
                {renderContent(item)}
            </div>

            <Button
                variant="destructive"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="ml-4 shrink-0"
                aria-label="Delete"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

// Main Sortable Content List Component
export function SortableContentList<T extends SortableItem>({
    items,
    title,
    description,
    onReorder,
    onDelete,
    renderContent,
}: {
    items: T[]
    title: string
    description: string
    onReorder: (newOrder: T[]) => Promise<void>
    onDelete: (id: string | number) => void
    renderContent: (item: T) => React.ReactNode
}) {
    const [localItems, setLocalItems] = useState(items)

    // Update local state when prop changes
    useEffect(() => {
        setLocalItems(items)
    }, [items])

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

        const oldIndex = localItems.findIndex((item) => item.id === active.id)
        const newIndex = localItems.findIndex((item) => item.id === over.id)

        const newOrder = arrayMove(localItems, oldIndex, newIndex)

        // Optimistic update
        setLocalItems(newOrder)

        try {
            await onReorder(newOrder)
        } catch (error) {
            // Revert on error
            setLocalItems(items)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    {description} • Drag to reorder
                </CardDescription>
            </CardHeader>
            <CardContent>
                {localItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                        No items yet
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localItems.map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {localItems.map((item) => (
                                    <SortableContentItem
                                        key={item.id}
                                        item={item}
                                        renderContent={renderContent}
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
