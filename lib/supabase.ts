import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ouasxrqtjnnacxyfacmm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S26k0mQIa7ovF-mib3OS4A_nkE6QDfG';

export const supabase = createClient(supabaseUrl, supabaseKey);
