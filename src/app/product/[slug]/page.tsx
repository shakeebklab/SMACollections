import { getProducts } from '@/lib/catalog';
import { ProductDetail } from '@/components/shopping';
import { ProductGrid } from '@/components/products';
import { notFound } from 'next/navigation';
export async function generateMetadata({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const { slug } = await params; const p = (await getProducts()).find(p => p.slug === slug); return { title: p?.name, description: p?.short_description, openGraph: { images: p ? [p.primary_image] : [] } }; }
export default async function Page({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const { slug } = await params; const products = await getProducts(); const p = products.find(p => p.slug === slug); if (!p)
    notFound(); const data = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.images, description: p.short_description, sku: p.sku, brand: { '@type': 'Brand', name: p.brand }, offers: { '@type': 'Offer', priceCurrency: 'PKR', price: p.base_price, availability: p.variants.some(v => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } }; return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}/><ProductDetail product={p}/><section className="section"><h2>A good pairing.</h2><ProductGrid products={products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4)}/></section></>; }
