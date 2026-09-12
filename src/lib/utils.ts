export const money = (value: number) => `Rs. ${new Intl.NumberFormat('en-PK').format(value)}`;
export const store = { name: 'TIME & STEP', email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '', whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '' };
