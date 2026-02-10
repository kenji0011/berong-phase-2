import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');

    let whereClause: any = {};

    if (parentId) {
      whereClause.parentSectionId = parseInt(parentId);
    } else {
      // Only get top-level sections (no parent)
      whereClause.parentSectionId = null;
    }

    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          content: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          sectionNum: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const fireCodeSections = await prisma.fireCodeSection.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    // Transform the response to match the expected format
    const transformedSections = fireCodeSections.map(section => ({
      id: section.id.toString(),
      title: section.title,
      sectionNum: section.sectionNum,
      content: section.content,
      parentSectionId: section.parentSectionId ? section.parentSectionId.toString() : null,
      order: section.order,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformedSections);
  } catch (error) {
    console.error('Error fetching fire code sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fire code sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    if (!body.title || !body.sectionNum || !body.content) {
      return NextResponse.json(
        { error: 'Title, section number, and content are required' },
        { status: 400 }
      );
    }

    const newSection = await prisma.fireCodeSection.create({
      data: {
        title: body.title,
        sectionNum: body.sectionNum,
        content: body.content,
        parentSectionId: body.parentSectionId ? parseInt(body.parentSectionId) : null,
        order: body.order || 0,
      }
    });

    // Transform the response to match the expected format
    const transformedSection = {
      id: newSection.id.toString(),
      title: newSection.title,
      sectionNum: newSection.sectionNum,
      content: newSection.content,
      parentSectionId: newSection.parentSectionId ? newSection.parentSectionId.toString() : null,
      order: newSection.order,
      createdAt: newSection.createdAt.toISOString(),
      updatedAt: newSection.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedSection);
  } catch (error) {
    console.error('Error creating fire code section:', error);
    return NextResponse.json(
      { error: 'Failed to create fire code section' },
      { status: 500 }
    );
  }
}
