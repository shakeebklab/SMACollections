import { Product } from './types';
export const watchImage = '/images/watch.jpg';
export const shoeImage = '/images/1549298916-b41d501d3772.jpg';
const entries = [
    ['The Meridian', 'watches', 'Atelier', 18500, 22500, watchImage, 'Champagne'],
    ['Everyday Court', 'shoes', 'Forma', 8900, 10900, '/images/1600269452121-4f2416e55c28.jpg', 'Ivory'],
    ['Nocturne Automatic', 'watches', 'Atelier', 24900, 0, '/images/1547996160-81dfa63595aa.jpg', 'Black'],
    ['Terrace Runner', 'shoes', 'Stride', 12500, 0, shoeImage, 'Amber'],
    ['Heritage Chronograph', 'watches', 'Tempo', 21900, 26500, '/images/1523275335684-37898b6baf30.jpg', 'Silver'],
    ['Suede Weekender', 'shoes', 'Forma', 10900, 0, '/images/1542291026-7eec264c27ff.jpg', 'Crimson'],
    ['Field Essential', 'watches', 'North', 14900, 0, '/images/1434056886845-dac89ffe9b56.jpg', 'Brown'],
    ['City Pace', 'shoes', 'Stride', 9900, 12900, '/images/1543508282-6319a3e2621f.jpg', 'Sand'],
    ['Studio Classic', 'watches', 'Tempo', 16900, 0, '/images/1508685096489-7aacd43bd3b1.jpg', 'Gold'],
    ['Off-duty High Top', 'shoes', 'North', 11900, 0, '/images/1525966222134-fcfa99b8ae77.jpg', 'White'],
] as const;
export const demoProducts: Product[] = entries.map((e, i): Product => ({
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, name: e[0], slug: e[0].toLowerCase().replaceAll(' ', '-'), category: e[1], brand: e[2], base_price: e[3], compare_at_price: e[4] || null, primary_image: e[5], images: [e[5]], sku: `TS-${1001 + i}`, featured: i < 4, new_arrival: i % 2 === 0, best_seller: i < 6, active: true, created_at: `2026-09-${String(12 - i).padStart(2, '0')}T00:00:00Z`,
    short_description: e[1] === 'watches' ? 'A considered detail. An everyday signature.' : 'Comfort in every step. Character in every detail.',
    description: e[1] === 'watches' ? 'Quietly distinctive, beautifully balanced. This versatile timepiece pairs a clean dial with a carefully finished case, designed to move effortlessly from your working day to the weekend.' : 'An effortless foundation for your everyday wardrobe. A considered silhouette, supportive sole and thoughtfully chosen materials bring lasting comfort to your daily rotation.',
    specifications: e[1] === 'watches' ? { 'Movement': 'Quartz', 'Case material': 'Stainless steel', 'Dial size': '40 mm', 'Strap material': 'Leather / steel', 'Water resistance': 'Splash resistant', 'Warranty': 'Confirm with store before purchase' } : { 'Material': 'Mixed textile and leather', 'Style': 'Casual', 'Audience': 'Unisex', 'Sizing': 'EU sizes' },
    variants: (e[1] === 'shoes' ? ['39', '40', '41', '42', '43', '44'] : [null]).map((size, j) => ({ id: `20000000-0000-4000-8000-${String((i + 1) * 100 + j).padStart(12, '0')}`, sku: `TS-${1001 + i}-${size || 'STD'}`, size, color: e[6], stock: j === 5 ? 0 : 4 + j, price: null })),
}));
