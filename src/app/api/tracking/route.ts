import { NextRequest, NextResponse } from 'next/server';
import { guard, body, failure } from '@/lib/api';
import { trackingSchema } from '@/lib/validation';
import { db } from '@/lib/supabase';
export async function POST(req: NextRequest) { try {
    await guard(req, 'tracking', 10);
    const input = trackingSchema.parse(await body(req));
    const { data, error } = await db().from('orders').select('order_number,order_status,created_at,total,order_items(product_name,quantity)').eq('order_number', input.orderNumber).eq('phone', input.phone).maybeSingle();
    if (error || !data)
        throw new Error('No matching order found. Check your order number and mobile number.');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
