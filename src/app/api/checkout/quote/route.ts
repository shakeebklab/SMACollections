import { NextRequest, NextResponse } from 'next/server';
import { guard, body, failure } from '@/lib/api';
import { itemsSchema } from '@/lib/validation';
import { quote } from '@/lib/checkout';
export async function POST(req: NextRequest) { try {
    await guard(req, 'quote', 60);
    const input = await body(req);
    return NextResponse.json(await quote(itemsSchema.parse(input.items), String(input.city || '').slice(0, 80)), { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
