import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { db } from './supabase';
import { Quote } from './types';
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export function receiptToken(key: string) { return createHmac('sha256', process.env.ORDER_TOKEN_SECRET!).update(key).digest('hex'); }
export async function quote(items: {
    variantId: string;
    quantity: number;
}[], city = ''): Promise<Quote> {
    const client = db();
    const [{ data: rows, error }, { data: setting, error: settingError }] = await Promise.all([client.from('product_variants').select('*,products!inner(*,categories!inner(active),brands!inner(active))').in('id', items.map(i => i.variantId)), client.from('store_settings').select('value').eq('key', 'delivery').single()]);
    if (error || settingError)
        throw new Error('Unable to verify your bag. Please try again.');
    const result = items.map(item => { const v = rows.find(r => r.id === item.variantId); const p = v?.products; if (!v || !p?.active || !p.categories.active || !p.brands.active || v.stock < item.quantity)
        throw new Error('An item is unavailable or has insufficient stock. Please update your bag.'); return { variantId: v.id, productId: p.id, name: p.name, slug: p.slug, image: p.primary_image, size: v.size, color: v.color, price: Number(v.price ?? p.base_price), quantity: item.quantity, stock: v.stock }; });
    const subtotal = result.reduce((s, i) => s + i.price * i.quantity, 0);
    const config = setting.value;
    const delivery = config.free_above > 0 && subtotal >= config.free_above ? 0 : Number(config.cities?.[city.toLowerCase().trim()] ?? config.default ?? 250);
    return { items: result, subtotal, delivery, total: subtotal + delivery, fingerprint: hash(JSON.stringify({ items: result.map(i => [i.variantId, i.quantity, i.price]).sort(), delivery })) };
}
