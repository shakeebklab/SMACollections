import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guard, body, failure } from '@/lib/api';
import { db } from '@/lib/supabase';
export async function POST(req: NextRequest) { try {
    await guard(req, 'newsletter', 5);
    const { email } = z.object({ email: z.string().email().max(254) }).parse(await body(req));
    const { error } = await db().from('newsletter_subscribers').upsert({ email: email.toLowerCase() }, { onConflict: 'email', ignoreDuplicates: true });
    if (error)
        throw new Error('Unable to subscribe. Please try again.');
    return NextResponse.json({ ok: true });
}
catch (e) {
    return failure(e);
} }
