require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
console.log("Supabase URL in backend:", process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
