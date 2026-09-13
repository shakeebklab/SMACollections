'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shippingSchema, ShippingInput } from '@/lib/validation';
import { Quote } from '@/lib/types';
import { money } from '@/lib/utils';
import { useStore } from './store';
import { StoreLoader, FetchLoader } from './loading';
async function post(url: string, data: unknown) { const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const body = await res.json(); if (!res.ok)
    throw new Error(body.error || 'Please try again.'); return body; }
export function Checkout() {
    const { cart, setCart, ready } = useStore();
    const router = useRouter();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [shipping, setShipping] = useState<ShippingInput | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [key, setKey] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm<ShippingInput>({ resolver: zodResolver(shippingSchema), defaultValues: { province: 'Sindh', city: 'Karachi' } });
    const basket = cart.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
    const signature = JSON.stringify(basket);
    const [reviewed, setReviewed] = useState('');
    async function review(values: ShippingInput) { setBusy(true); setError(''); setQuote(null); try {
        const q = await post('/api/checkout/quote', { items: basket, city: values.city });
        setQuote(q);
        setShipping(values);
        setReviewed(signature);
        setKey(crypto.randomUUID());
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    async function place() { if (!shipping || !quote || busy)
        return; setBusy(true); setError(''); try {
        const d = await post('/api/orders', { shipping, items: basket, fingerprint: quote.fingerprint, idempotencyKey: key });
        setCart([]);
        router.push(`/order-success/${d.orderNumber}`);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    if (!ready)
        return <StoreLoader label="Preparing your checkout" />;
    if (!cart.length)
        return <section className="section empty"><h1>Your bag is empty.</h1><Link className="button" href="/shop">Explore the collection</Link></section>;
    const fields: [
        keyof ShippingInput,
        string,
        string?
    ][] = [['customer_name', 'Full name'], ['phone', 'Mobile number', 'tel'], ['alternate_phone', 'Alternative mobile (optional)', 'tel'], ['email', 'Email (optional)', 'email'], ['address', 'Complete delivery address'], ['landmark', 'Nearby landmark (optional)'], ['postal_code', 'Postal code (optional)'], ['notes', 'Delivery notes (optional)']];
    return <section className="section"><p className="eyebrow">NO ACCOUNT. JUST GOOD CHOICES.</p><h1>Checkout.</h1><div className="checkout-grid"><form onSubmit={handleSubmit(review)} onChange={() => { setQuote(null); setShipping(null); }}><h2>Delivery details</h2><p>Currently delivering within Karachi only.</p><input type="hidden" {...register('province')} /><input type="hidden" {...register('city')} /><div className="form-grid">{fields.map(([name, label, type]) => <label key={name} className={['address', 'notes'].includes(name) ? 'full' : ''}>{label}{['address', 'notes'].includes(name) ? <textarea {...register(name)} rows={3}/> : <input type={type || 'text'} autoComplete={name === 'customer_name' ? 'name' : name === 'phone' ? 'tel' : name === 'email' ? 'email' : undefined} {...register(name)}/>}<small className="error">{errors[name]?.message}</small></label>)}</div><div className="payment"><strong>Cash on delivery</strong><p>Pay for your order when it reaches your door.</p></div><button className="button gold" disabled={busy}>{busy ? <FetchLoader label="Verifying your details" /> : 'Verify availability & review order'}</button></form><aside className="order-summary" aria-busy={busy}><h2>Your order</h2>{busy && <div className="fetch-panel"><FetchLoader label={quote ? "Securing your order" : "Checking stock, prices & delivery"} /><div className="fetch-skeleton" /><div className="fetch-skeleton short" /></div>}{(quote?.items || cart).map(i => <p key={i.variantId}><span>{i.name}<small>{i.size && `EU ${i.size}  /  `}{i.color}  x  {i.quantity}</small></span><span>{money(i.price * i.quantity)}</span></p>)}{quote && reviewed === signature ? <><p><span>Subtotal</span>{money(quote.subtotal)}</p><p><span>Delivery</span>{money(quote.delivery)}</p><p className="total"><span>Total</span>{money(quote.total)}</p><p className="verified">Prices and availability checked. Ready for your review.</p><small>By placing your order you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</small><button className="button gold wide" disabled={busy} onClick={place}>{busy ? <FetchLoader label="Placing your order" /> : 'Place order  /  ' + money(quote.total)}</button></> : <p>Complete your delivery details to verify stock, prices, and delivery charges.</p>}<p className="error" role="alert">{error}</p><small>Your order is created only after inventory is confirmed. No online payment required.</small></aside></div></section>;
}
type TrackingResult = {
    order_number: string;
    order_status: string;
    created_at: string;
    total: number;
    order_items: {
        product_name: string;
        quantity: number;
    }[];
};
export function Tracking() { const [result, setResult] = useState<TrackingResult | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); return <section className="section narrow"><p className="eyebrow">FROM OUR DOOR TO YOURS</p><h1>Track your order.</h1><p>Enter the order number from your receipt and the mobile number used at checkout.</p><form className="tracking-form" onSubmit={async (e) => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); setResult(null); setError(''); try {
    setResult(await post('/api/tracking', { orderNumber: data.get('orderNumber'), phone: data.get('phone') }));
}
catch (e) {
    setError((e as Error).message);
}
finally {
    setBusy(false);
} }}><label>Order number<input name="orderNumber" required placeholder="TS-20260913-XXXXXXXXXX"/></label><label>Mobile number<input name="phone" type="tel" required placeholder="03XXXXXXXXX"/></label><button className="button gold" disabled={busy}>{busy ? <FetchLoader label="Finding your order" /> : 'Find my order'}</button></form>{busy && <StoreLoader label="Following your order journey" />}<p className="error" role="alert">{error}</p>{result && <div className="order-summary" role="status"><p className="eyebrow">{result.order_number}</p><h2 className="capitalize">{result.order_status}</h2><p>{new Date(result.created_at).toLocaleDateString()}</p>{result.order_items.map((i, n) => <p key={n}>{i.product_name}  x  {i.quantity}</p>)}<p className="total">Total {money(result.total)}</p></div>}</section>; }
export function PrintReceipt() { return <button className="button gold no-print" onClick={() => window.print()}>Print / save invoice as PDF</button>; }
