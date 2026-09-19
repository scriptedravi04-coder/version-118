import { createClient } from '@supabase/supabase-js';

let SUPABASE_URL = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL); if (SUPABASE_URL && SUPABASE_URL.endsWith('/rest/v1/')) { SUPABASE_URL = SUPABASE_URL.replace('/rest/v1/', ''); }
if (!SUPABASE_URL || typeof SUPABASE_URL !== 'string' || !SUPABASE_URL.trim() || !SUPABASE_URL.startsWith('http')) {
  SUPABASE_URL = "https://mzcovvzkwzjvzskjqwwy.supabase.co";
}

let SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY);
if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== 'string' || !SUPABASE_ANON_KEY.trim()) {
  SUPABASE_ANON_KEY = "sb_publishable_Vbd74GKG1eYP7NYp4qtFbg_kuQuDPKv";
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
