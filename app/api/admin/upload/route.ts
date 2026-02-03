import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Upload API
 * 
 * Converts uploaded images to Base64 data URLs for storage in the database.
 * This approach works with DigitalOcean App Platform where filesystem is ephemeral.
 */

// Increase body size limit for large image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // Allow up to 20MB to accommodate Base64 overhead
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Validate file size (max 15MB)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 15MB allowed.' }, { status: 400 });
    }

    // Convert file to Base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Return the data URL (this will be stored in the database)
    return NextResponse.json({
      url: dataUrl,
      fileName: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
