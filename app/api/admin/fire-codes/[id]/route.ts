import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const fireCodeSection = await prisma.fireCodeSection.findUnique({
      where: { id },
    });

    if (!fireCodeSection) {
      return NextResponse.json(
        { error: 'Fire code section not found' },
        { status: 404 }
      );
    }

    // Transform the response to match the expected format
    const transformedSection = {
      id: fireCodeSection.id.toString(),
      title: fireCodeSection.title,
      sectionNum: fireCodeSection.sectionNum,
      content: fireCodeSection.content,
      parentSectionId: fireCodeSection.parentSectionId ? fireCodeSection.parentSectionId.toString() : null,
      order: fireCodeSection.order,
      createdAt: fireCodeSection.createdAt.toISOString(),
      updatedAt: fireCodeSection.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedSection);
  } catch (error) {
    console.error('Error fetching fire code section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fire code section' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const updatedSection = await prisma.fireCodeSection.update({
      where: { id },
      data: {
        title: body.title,
        sectionNum: body.sectionNum,
        content: body.content,
        parentSectionId: body.parentSectionId ? parseInt(body.parentSectionId) : undefined,
        order: body.order,
      }
    });

    // Transform the response to match the expected format
    const transformedSection = {
      id: updatedSection.id.toString(),
      title: updatedSection.title,
      sectionNum: updatedSection.sectionNum,
      content: updatedSection.content,
      parentSectionId: updatedSection.parentSectionId ? updatedSection.parentSectionId.toString() : null,
      order: updatedSection.order,
      createdAt: updatedSection.createdAt.toISOString(),
      updatedAt: updatedSection.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedSection);
  } catch (error) {
    console.error('Error updating fire code section:', error);
    return NextResponse.json(
      { error: 'Failed to update fire code section' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    await prisma.fireCodeSection.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Fire code section deleted successfully' });
  } catch (error) {
    console.error('Error deleting fire code section:', error);
    return NextResponse.json(
      { error: 'Failed to delete fire code section' },
      { status: 500 }
    );
  }
}
