import 'server-only';
import { cache } from 'react';
import { demoProducts } from './demo';
import { publicConfigured, publicDb } from './supabase';
import { Product } from './types';
export const getProducts = cache(async (): Promise<Product[]> => {
    if (!publicConfigured)
        return demoProducts;
    const { data, error } = await publicDb().from('products').select('*, categories!inner(slug,active), brands!inner(name,active), product_variants(*), product_images(url,position)').eq('active', true).eq('categories.active', true).eq('brands.active', true).order('created_at', { ascending: false }).abortSignal(AbortSignal.timeout(1500));
    if (error || !data?.length)
        return demoProducts;
    return data.map(p => ({ ...p, category: p.categories.slug, brand: p.brands.name, variants: p.product_variants, images: p.product_images.length ? p.product_images.sort((a: {
            position: number;
        }, b: {
            position: number;
        }) => a.position - b.position).map((x: {
            url: string;
        }) => x.url) : [p.primary_image] }));
});
