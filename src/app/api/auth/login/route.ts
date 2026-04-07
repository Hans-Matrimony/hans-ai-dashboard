import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';
const SESSION_COOKIE_NAME = 'dashboard_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (password === DASHBOARD_PASSWORD) {
            const cookieStore = await cookies();
            cookieStore.set(SESSION_COOKIE_NAME, 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_MAX_AGE,
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
