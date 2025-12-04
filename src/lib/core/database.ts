import { createClient } from '@supabase/supabase-js';

// Read keys from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY is missing');

// Create server-side client
export const supabase = createClient(supabaseUrl, supabaseKey);
