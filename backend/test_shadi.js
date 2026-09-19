import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://mzcovvzkwzjvzskjqwwy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data } = await supabase.from('waitlist').select('*').ilike('name', '%Shadi%');
  console.log("Waitlist:", JSON.stringify(data, null, 2));
}
run();
