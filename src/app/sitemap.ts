export const dynamic = 'force-dynamic';
import { getProducts } from '@/lib/catalog';
export default async function sitemap() { const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; return [...['', '/shop', '/shop/shoes', '/shop/watches', '/about', '/contact', '/faq', '/shipping', '/returns', '/privacy', '/terms'].map(p => ({ url: base + p })), ...(await getProducts()).map(p => ({ url: base + '/product/' + p.slug, lastModified: new Date(p.created_at) }))]; }
