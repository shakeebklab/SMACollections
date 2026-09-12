import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { db, configured } from './supabase';
import { hash } from './checkout';
import { ZodError } from 'zod';
export async function guard(req: NextRequest, scope: string, limit = 15) {
    if (!configured)
        throw new Error('The store is in preview mode. Ordering will open once the store is connected.');
    if (!process.env.ORDER_TOKEN_SECRET || process.env.ORDER_TOKEN_SECRET.length < 32)
        throw new Error('Secure checkout is not configured. Please contact the store.');
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin;
    if (req.headers.get('origin') !== expected)
        throw new Error('Request origin is not allowed.');
    if (!req.headers.get('content-type')?.includes('application/json'))
        throw new Error('JSON request required.');
    if (Number(req.headers.get('content-length') || 0) > 20000)
        throw new Error('Request too large.');
    // Only trust an IP header inserted and overwritten by the deployment proxy.
    const ip = process.env.VERCEL ? req.headers.get('x-vercel-forwarded-for') || 'unknown' : process.env.TRUST_PROXY_IP_HEADER ? req.headers.get(process.env.TRUST_PROXY_IP_HEADER) || 'unknown' : 'shared';
    const { data, error } = await db().rpc('consume_rate_limit', { p_key: hash(`${scope}:${ip}`), p_limit: limit, p_seconds: 600 });
    if (error)
        throw new Error('Unable to process requests right now.');
    if (!data)
        throw new Error('Too many attempts. Please try again in 10 minutes.');
}
export async function body(req: NextRequest) { const raw = await req.text(); if (raw.length > 20000)
    throw new Error('Request too large.'); return JSON.parse(raw); }
export function failure(error: unknown) { return NextResponse.json({ error: error instanceof ZodError ? error.issues[0].message : error instanceof SyntaxError ? 'Invalid request.' : error instanceof Error ? error.message : 'Something went wrong.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
