import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure uploads directory exists
const UPLOAD_DIR = join(process.cwd(), 'public', 'kundli-images');

async function ensureDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

export async function POST(request: NextRequest) {
    try {
        await ensureDir();

        const body = await request.json();
        const { image_base64, phone } = body;

        if (!image_base64) {
            return NextResponse.json(
                { error: 'Missing image_base64' },
                { status: 400 }
            );
        }

        // Extract base64 data if it has a prefix
        let base64Data = image_base64;
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `kundli_${phone}_${timestamp}.png`;
        const filepath = join(UPLOAD_DIR, filename);

        // Save file
        await writeFile(filepath, buffer);

        // Generate public URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const imageUrl = `${baseUrl}/kundli-images/${filename}`;

        return NextResponse.json({
            success: true,
            url: imageUrl,
            filename: filename
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed' },
            { status: 500 }
        );
    }
}
