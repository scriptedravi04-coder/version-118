import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mzcovvzkwzjvzskjqwwy.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('users').select('*').eq('email', 'scriptedravi04@gmail.com');
  console.log("Users:", JSON.stringify(data, null, 2));
}
run();
