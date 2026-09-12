import { getProducts } from '@/lib/catalog';
import { Shop } from '@/components/shopping';
import { notFound } from 'next/navigation';
export default async function Page({ params }: {
    params: Promise<{
        category: string;
    }>;
}) { const { category } = await params; if (!['shoes', 'watches'].includes(category))
    notFound(); return <Shop products={await getProducts()} category={category}/>; }
