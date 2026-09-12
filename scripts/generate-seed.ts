import {writeFileSync} from 'node:fs';
import {demoProducts} from '../src/lib/demo';
const q=(v:unknown)=>v==null?'null':typeof v==='boolean'||typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
let sql='-- Demonstration catalog; illustrative Unsplash photographs, not brand-authorized inventory.\nbegin;\n';
for(const c of ['shoes','watches'])sql+=`insert into public.categories(name,slug) values (${q(c)},${q(c)}) on conflict(slug) do nothing;\n`;
for(const brand of new Set(demoProducts.map(p=>p.brand))){const slug=brand.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');sql+=`insert into public.brands(name,slug) values (${q(brand)},${q(slug)}) on conflict(name) do update set slug=excluded.slug;\n`;}
for(const p of demoProducts){sql+=`insert into public.products(id,category_id,brand_id,name,slug,description,short_description,base_price,compare_at_price,sku,featured,active,new_arrival,best_seller,primary_image,specifications,created_at) values (${q(p.id)},(select id from public.categories where slug=${q(p.category)}),(select id from public.brands where name=${q(p.brand)}),${[p.name,p.slug,p.description,p.short_description,p.base_price,p.compare_at_price,p.sku,p.featured,p.active,p.new_arrival,p.best_seller,p.primary_image,JSON.stringify(p.specifications),p.created_at].map(q).join(',')}) on conflict(id) do nothing;\n`;
for(const v of p.variants)sql+=`insert into public.product_variants(id,product_id,sku,size,color,stock,price) values (${[v.id,p.id,v.sku,v.size,v.color,v.stock,v.price].map(q).join(',')}) on conflict(id) do nothing;\n`;
sql+=`insert into public.product_images(product_id,url,position) select ${q(p.id)},${q(p.primary_image)},0 where not exists(select 1 from public.product_images where product_id=${q(p.id)});\n`;}
writeFileSync('supabase/seed.sql',sql+'commit;\n');
