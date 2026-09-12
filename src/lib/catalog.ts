import 'server-only';
import { cache } from 'react';
import { demoProducts } from './demo';
import { configured, db } from './supabase';
import { Product } from './types';
export const getProducts = cache(async (): Promise<Product[]> => {
  if (!configured) return demoProducts;
  const { data, error } = await db().from('products').select('*, categories(slug), brands(name), product_variants(*), product_images(url,position)').eq('active',true).order('created_at',{ascending:false});
  if(error) throw new Error('The collection could not be loaded. Please try again shortly.');
  return data.map(p=>({...p, category:p.categories.slug,brand:p.brands.name,variants:p.product_variants,images:p.product_images.length?p.product_images.sort((a:{position:number},b:{position:number})=>a.position-b.position).map((x:{url:string})=>x.url):[p.primary_image]}));
});
