import type { Metadata } from 'next';
import { StoreProvider, Header, Footer } from '@/components/store';
import './globals.css';
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'), title: { default: 'SMACollections — Time & Step', template: '%s | SMACollections' }, description: 'Discover the Time & Step collection of watches and shoes by SMACollections. Shop in Pakistani Rupees with guest checkout and cash on delivery.', openGraph: { title: 'SMACollections — Time & Step', description: 'The everyday, elevated.', type: 'website' } };
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body><StoreProvider><a className="skip" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /></StoreProvider></body></html>; }
