import { NextRequest, NextResponse } from 'next/server';
import { guard, body, failure } from '@/lib/api';
import { orderSchema } from '@/lib/validation';
import { quote, hash, receiptToken } from '@/lib/checkout';
import { db } from '@/lib/supabase';
export async function POST(req: NextRequest) {
    try {
        await guard(req, 'order', 8);
        const input = orderSchema.parse(await body(req));
        const client = db();
        const requestHash = hash(JSON.stringify({ shipping: input.shipping, items: input.items, fingerprint: input.fingerprint }));
        const token = receiptToken(input.idempotencyKey);
        const { data: existing } = await client.from('orders').select('order_number,request_hash').eq('idempotency_key', input.idempotencyKey).maybeSingle();
        let number: string;
        if (existing) {
            if (existing.request_hash !== requestHash)
                throw new Error('This checkout has changed. Please review it again.');
            number = existing.order_number;
        }
        else {
            const current = await quote(input.items, input.shipping.city);
            if (current.fingerprint !== input.fingerprint)
                throw new Error('Your bag has changed. Review the latest prices before placing your order.');
            const { data, error } = await client.rpc('place_guest_order', { p_shipping: input.shipping, p_items: input.items, p_expected_total: current.total, p_key: input.idempotencyKey, p_request_hash: requestHash, p_receipt_hash: hash(token) });
            if (error)
                throw new Error(error.message.includes('stock') ? 'Stock changed. Please review your bag.' : error.message.includes('Prices') ? 'Prices changed. Please review your order.' : 'Your order could not be placed. Please review your bag and try again.');
            number = data;
        }
        const response = NextResponse.json({ orderNumber: number }, { headers: { 'Cache-Control': 'no-store' } });
        response.cookies.set('order_receipt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 86400 });
        return response;
    }
    catch (e) {
        return failure(e);
    }
}
