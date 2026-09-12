import { getProducts } from '@/lib/catalog';
import { Wishlist } from '@/components/shopping';
export const metadata = { title: 'Your wishlist', robots: { index: false } };
export default async function Page() { return <Wishlist products={await getProducts()}/>; }
