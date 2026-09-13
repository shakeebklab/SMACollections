import { notFound } from 'next/navigation';
import Link from 'next/link';
import { store } from '@/lib/utils';
const pages: Record<string, {
    title: string;
    intro: string;
    sections: [
        string,
        string
    ][];
}> = {
    about: { title: 'Two essentials. One point of view.', intro: 'Time & Step brings together watches and shoes for a more considered everyday wardrobe.', sections: [['Our philosophy', 'We look for balanced design, versatile shapes, and details with character. Our collection is an invitation to find your own signature.'], ['A store taking its first steps', 'Our current collection uses demonstration products and illustrative photography. Final product details, availability and store policies will be confirmed before launch.']] },
    contact: { title: 'Let’s talk.', intro: 'Questions about a product, delivery, or your order? We’re here to help.', sections: [['An existing order?', 'Have your order number ready so we can find the right details. You can also check your order using the tracking page.']] },
    shipping: { title: 'Shipping & delivery.', intro: 'Cash on delivery in Karachi, with delivery charges shown before you place your order.', sections: [['Delivery charges', 'The configured starting fee is Rs. 250, with free delivery on orders of Rs. 20,000 or more. Your final delivery charge is calculated at checkout for your Karachi address.'], ['Order confirmation', 'Orders are pending until our team confirms them. Delivery estimates and courier coverage will be confirmed with you.'], ['Receiving your order', 'Please provide a complete address and an active Pakistani mobile number. Keep your payment ready when the courier arrives.']] },
    returns: { title: 'Returns & exchanges.', intro: 'Please contact the store before sending any item back.', sections: [['Before you order', 'Confirm sizing, materials and specifications with the store. Product photography is illustrative until final inventory is published.'], ['If something is wrong', 'Keep the packaging and contact us with your order number and details of any damage or incorrect item as soon as possible.'], ['Policy before launch', 'The final return window, eligibility, courier costs and refund process must be published by the store before accepting live orders.']] },
    privacy: { title: 'Your privacy matters.', intro: 'We collect the details needed to process and deliver your guest order.', sections: [['Order information', 'Your name, phone, delivery address and optional contact details are stored securely for order processing. Necessary delivery information may be shared with the courier.'], ['Your browser', 'Your cart and wishlist are saved in local browser storage. An HttpOnly receipt cookie permits access to your latest order receipt for 24 hours.'], ['Contact and retention', 'Contact the store about access or deletion of your information. The business must finalize its retention period and privacy contact before launch.']] },
    terms: { title: 'Terms & conditions.', intro: 'Please review the product information and final order total before placing an order.', sections: [['Orders and payment', 'All prices are in Pakistani Rupees. Cash on delivery is the supported payment method. Submitted orders are pending confirmation.'], ['Availability', 'Stock and prices are verified when an order is placed. Items saved in your bag are not reserved.'], ['Store launch', 'Demonstration catalog images and descriptions are placeholders. The business must approve and publish final terms and policies before launch.']] },
    faq: { title: 'A little clarity.', intro: 'The details that make shopping easier.', sections: [['Do I need an account?', 'No. Add your items to the bag and check out as a guest.'], ['How do I pay?', 'Pay cash to the courier when your order arrives.'], ['How do I track my order?', 'Use your order number and checkout mobile number on the tracking page.'], ['Are items in my bag reserved?', 'No. Availability is checked during checkout and stock is reserved only after successful order creation.'], ['Can I change my order?', 'Contact the store with your order number. Changes and cancellations are handled by the store team.']] }
};
export function generateStaticParams() { return Object.keys(pages).map(page => ({ page })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        page: string;
    }>;
}) { return { title: pages[(await params).page]?.title }; }
export default async function Page({ params }: {
    params: Promise<{
        page: string;
    }>;
}) { const { page } = await params; const p = pages[page]; if (!p)
    notFound(); return <section className="section narrow prose"><p className="eyebrow">TIME & STEP</p><h1>{p.title}</h1><p className="intro">{p.intro}</p>{p.sections.map(([h, t]) => <div key={h}><h2>{h}</h2><p>{t}</p></div>)}{page === 'contact' && <div>{store.email && <p><a href={`mailto:${store.email}`}>{store.email}</a></p>}{store.whatsapp && <a className="button gold" href={`https://wa.me/${store.whatsapp}`}>Chat on WhatsApp ?</a>}{!store.email && !store.whatsapp && <p>Contact details will be published when the store opens.</p>}</div>}<Link className="text-link" href="/tracking">Track an order ?</Link></section>; }
