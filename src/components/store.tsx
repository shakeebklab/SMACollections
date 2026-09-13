'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Search, Menu, X, ArrowUpRight } from 'lucide-react';
import { CartItem, Product, Variant } from '@/lib/types';
import { FetchLoader } from './loading';
const Context = createContext<ReturnType<typeof useStoreState> | null>(null);
function useStoreState() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const [toast, setToast] = useState('');
    useEffect(() => { const timer = setTimeout(() => { try {
        const c = JSON.parse(localStorage.getItem('ts-cart') || '[]');
        const w = JSON.parse(localStorage.getItem('ts-wishlist') || '[]');
        if (Array.isArray(c))
            setCart(c.filter(i => i && typeof i.variantId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0));
        if (Array.isArray(w))
            setWishlist(w.filter(i => typeof i === 'string'));
    }
    catch { } setReady(true); }, 0); return () => clearTimeout(timer); }, []);
    useEffect(() => { if (ready) {
        try {
            localStorage.setItem('ts-cart', JSON.stringify(cart));
            localStorage.setItem('ts-wishlist', JSON.stringify(wishlist));
        }
        catch { }
    } }, [cart, wishlist, ready]);
    useEffect(() => { if (toast) {
        const t = setTimeout(() => setToast(''), 3500);
        return () => clearTimeout(t);
    } }, [toast]);
    function add(p: Product, v: Variant, quantity = 1) { setCart(old => { const existing = old.find(i => i.variantId === v.id); if (existing)
        return old.map(i => i.variantId === v.id ? { ...i, quantity: Math.min(i.quantity + quantity, v.stock, 20) } : i); return [...old, { variantId: v.id, productId: p.id, name: p.name, slug: p.slug, image: p.primary_image, size: v.size, color: v.color, price: v.price ?? p.base_price, quantity: Math.min(quantity, v.stock, 20), stock: v.stock }]; }); setToast('Added to your bag'); }
    function wish(id: string) { setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]); }
    return { cart, setCart, wishlist, wish, add, toast, setToast, ready };
}
export function useStore() { return useContext(Context)!; }
export function StoreProvider({ children }: {
    children: React.ReactNode;
}) { const state = useStoreState(); return <Context.Provider value={state}>{children}{state.toast && <div className="toast" role="status">{state.toast}</div>}</Context.Provider>; }
export function Header() { const { cart, wishlist } = useStore(); const [open, setOpen] = useState(false); return <><div className="announcement">Thoughtfully selected. Effortlessly yours. <span>Cash on delivery in Karachi</span></div><header><Link href="/" className="logo logo-image" aria-label="SMACollections — Time & Step"><Image src="/logo.png" alt="SMACollections" width={1280} height={1280} priority/><small>TIME &amp; STEP</small></Link><nav className={open ? 'open' : ''} onClick={() => setOpen(false)}><Link href="/shop">The collection</Link><Link href="/shop/watches">Watches</Link><Link href="/shop/shoes">Shoes</Link><Link href="/about">Our story</Link></nav><div className="nav-actions"><Link href="/shop?search=1" aria-label="Search products"><Search size={20}/></Link><Link href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`}><Heart size={20}/>{wishlist.length > 0 && <b>{wishlist.length}</b>}</Link><Link href="/cart" aria-label={`Shopping bag, ${cart.reduce((s, i) => s + i.quantity, 0)} items`}><ShoppingBag size={20}/><b>{cart.reduce((s, i) => s + i.quantity, 0)}</b></Link><button className="mobile-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></header></>; }
export function Footer() { const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); return <footer><div className="newsletter"><div><p className="eyebrow">THE INSIDE EDIT</p><h2>Good taste. Delivered.</h2><p>New arrivals, considered edits, and a little inspiration.</p></div><form onSubmit={async (e) => { e.preventDefault(); if (busy) return; const email = new FormData(e.currentTarget).get('email'); setBusy(true); setMessage(''); try {
    const r = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const d = await r.json();
    setMessage(r.ok ? 'You are on the list. Thank you!' : d.error);
}
catch {
    setMessage('Please try again shortly.');
} finally { setBusy(false); } }}><label htmlFor="newsletter">Your email address</label><div className="email-input"><input id="newsletter" name="email" type="email" placeholder="Enter your email" required/><button aria-label="Subscribe" disabled={busy}>{busy ? <FetchLoader label="Joining" /> : <ArrowUpRight />}</button></div><p role="status">{message}</p></form></div><div className="footer-grid"><div><Link href="/" className="logo logo-image footer-logo" aria-label="SMACollections — Time & Step"><Image src="/logo.png" alt="SMACollections" width={1280} height={1280}/><small>TIME &amp; STEP</small></Link><p>Two essentials. One point of view.<br />Made for the way you move.</p></div><div><h4>Explore</h4><Link href="/shop/watches">Watches</Link><Link href="/shop/shoes">Shoes</Link><Link href="/wishlist">Your wishlist</Link></div><div><h4>Here to help</h4><Link href="/tracking">Track your order</Link><Link href="/contact">Contact us</Link><Link href="/faq">FAQs</Link></div><div><h4>The details</h4><Link href="/shipping">Shipping & delivery</Link><Link href="/returns">Returns & exchanges</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link></div></div><div className="footer-bottom">© {new Date().getFullYear()} SMACollections · Time &amp; Step. <span>PAKISTAN / PKR / CASH ON DELIVERY</span></div></footer>; }
