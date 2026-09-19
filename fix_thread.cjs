const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data: threads } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('agreed_amount', 87776);
    
  for (const t of threads || []) {
    console.log("Fixing thread:", t.id);
    await supabase.from('chat_threads').update({
      agreement_signed_brand: false,
      status: 'NEGOTIATING',
      flow_state: 'AGREEMENT_SIGNED'
    }).eq('id', t.id);
    
    if (t.deal_id) {
       await supabase.from('deals').update({
         agreement_signed_brand: false,
         status: 'NEGOTIATING'
       }).eq('id', t.deal_id);
    }
    
    // Also delete the "Agreement Executed" message if it's the last one
    const { data: msgs } = await supabase.from('chat_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: false })
      .limit(2);
      
    for (const m of msgs || []) {
      if (m.text && m.text.includes("Agreement Executed! Both parties have signed")) {
        console.log("Deleting premature agreement executed msg:", m.id);
        await supabase.from('chat_messages').delete().eq('id', m.id);
        
        // Insert a "Creator has signed" message instead
        await supabase.from('chat_messages').insert({
          id: m.id,
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
      }
    }
  }
}
fix().then(() => console.log('Done'));
