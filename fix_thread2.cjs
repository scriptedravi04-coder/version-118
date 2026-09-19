const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data: threads } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('agreed_amount', 87776);
    
  for (const t of threads || []) {
    const { data: msgs } = await supabase.from('chat_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    for (const m of msgs || []) {
      if (m.text && m.text.includes("Agreement Executed! Both parties have signed")) {
        console.log("Found msg:", m.id, m.message_id);
        const msgId = m.id || m.message_id;
        await supabase.from('chat_messages').delete().eq('message_id', m.message_id);
        
        await supabase.from('chat_messages').insert({
          message_id: m.message_id,
          thread_id: t.id,
          sender_user_id: m.sender_user_id,
          text: JSON.stringify({
            text: "✍️ Creator has signed the partnership agreement. Awaiting Brand signature to execute contract.",
            type: "system",
            sender: "system",
            metadata: { action: 'creator_signed' }
          }),
          message_type: 'system',
          metadata: { action: 'creator_signed' },
          created_at: m.created_at
        });
        console.log("Fixed msg!");
      }
    }
  }
}
fix().then(() => console.log('Done'));
