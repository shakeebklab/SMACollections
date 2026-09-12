import { z } from 'zod';
export const normalizePhone = (phone: string) => { const n=phone.replace(/[\s()+-]/g,''); return n.startsWith('92')?'0'+n.slice(2):n; };
const phone = z.string().transform(normalizePhone).pipe(z.string().regex(/^03\d{9}$/, 'Enter a valid Pakistani mobile number (03XXXXXXXXX).'));
const text = (min:number,max:number) => z.string().trim().min(min).max(max).refine(v=>!/[<>\x00-\x08]/.test(v),'Please use plain text.');
export const shippingSchema = z.object({ customer_name:text(2,100), phone, alternate_phone:z.union([z.literal(''),phone]).optional(), email:z.union([z.literal(''),z.email().max(254)]).optional(), province:z.enum(['Punjab','Sindh','Khyber Pakhtunkhwa','Balochistan','Islamabad','Azad Kashmir','Gilgit-Baltistan']), city:text(2,80), address:text(10,400), landmark:text(0,160).optional(), postal_code:z.string().regex(/^\d{5}$|^$/,'Use a 5-digit postal code.').optional(), notes:text(0,500).optional() });
export type ShippingInput = z.input<typeof shippingSchema>;
export const itemsSchema = z.array(z.object({variantId:z.uuid(),quantity:z.number().int().min(1).max(20)})).min(1).max(50).refine(items=>new Set(items.map(i=>i.variantId)).size===items.length,'Duplicate items are not allowed.');
export const orderSchema = z.object({ shipping:shippingSchema, items:itemsSchema, fingerprint:z.string().length(64), idempotencyKey:z.uuid() });
export const trackingSchema = z.object({ orderNumber:z.string().trim().toUpperCase().regex(/^TS-\d{8}-[A-F0-9]{10}$/), phone });
