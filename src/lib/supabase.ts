import 'server-only';
import { createClient } from '@supabase/supabase-js';
export const publicConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export function publicDb() {
    if (!publicConfigured)
        throw new Error('The product catalog is not connected yet.');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(1500) })
        }
    });
}
export function db() {
    if (!configured)
        throw new Error('Checkout is not available yet. Please contact the store.');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
