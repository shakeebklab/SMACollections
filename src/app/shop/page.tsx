import { getProducts } from '@/lib/catalog';
import { Shop } from '@/components/shopping';
export const metadata = { title: 'The collection' };
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        sort?: string;
    }>;
}) { return <Shop products={await getProducts()} initialSort={(await searchParams).sort}/>; }
