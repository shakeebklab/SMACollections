import { cookies } from 'next/headers';
import { db, configured } from '@/lib/supabase';
import { hash } from '@/lib/checkout';
import { money, store } from '@/lib/utils';
import { Order } from '@/lib/types';
import { PrintReceipt } from '@/components/checkout';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Order receipt', robots: { index: false, follow: false } };
export default async function Page({ params }: {
    params: Promise<{
        number: string;
    }>;
}) { const token = (await cookies()).get('order_receipt')?.value; if (!token || !configured)
    notFound(); const { number } = await params; const { data } = await db().from('orders').select('order_number,customer_name,phone,address,city,province,subtotal,delivery_charge,total,order_status,created_at,order_items(product_name,sku,size,color,unit_price,quantity,line_total,primary_image)').eq('order_number', number).eq('receipt_hash', hash(token)).maybeSingle(); if (!data)
    notFound(); const order = data as Order; return <section className="section narrow receipt"><p className="eyebrow">THANK YOU FOR CHOOSING TIME & STEP</p><h1>Good things are on their way.</h1><p>Your order is pending confirmation. We’ll contact you to confirm the details.</p><div className="order-summary"><h2>{order.order_number}</h2><p>{new Date(order.created_at).toLocaleDateString('en-PK')} · Cash on delivery · Unpaid</p>{order.order_items.map((i, n) => <p key={n}><span>{i.product_name}<small>{i.sku} · {i.size} {i.color} × {i.quantity}</small></span>{money(i.line_total)}</p>)}<p><span>Subtotal</span>{money(order.subtotal)}</p><p><span>Delivery</span>{money(order.delivery_charge)}</p><p className="total"><span>Total</span>{money(order.total)}</p><h3>Deliver to</h3><address>{order.customer_name}<br />{order.address}<br />{order.city}, {order.province}<br />{order.phone}</address></div><PrintReceipt />{store.whatsapp && <a className="button" href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent('Question about order ' + order.order_number)}`}>Contact on WhatsApp</a>}</section>; }
