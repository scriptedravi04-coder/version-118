const fs = require('fs');

let content = fs.readFileSync('backend/deals_chat_routes.ts', 'utf8');

// In brand-accept-counter, add agreement_signed_brand: false, agreement_signed_creator: false
content = content.replace(
  /agreed_amount: finalAmount,\s*status: 'NEGOTIATING',\s*flow_state: 'AI_AGREEMENT_READY',\s*updated_at: new Date\(\)\.toISOString\(\)/g,
  "agreed_amount: finalAmount,\n        status: 'NEGOTIATING',\n        flow_state: 'AI_AGREEMENT_READY',\n        agreement_signed_creator: false,\n        agreement_signed_brand: false,\n        agreement_signed_at: null,\n        both_signed: false,\n        updated_at: new Date().toISOString()"
);

// In creator-negotiate
content = content.replace(
  /flow_state: "NEGOTIATING_COUNTER",\s*status: "NEGOTIATING",\s*counter_amount: counterNum/g,
  'flow_state: "NEGOTIATING_COUNTER",\n        status: "NEGOTIATING",\n        counter_amount: counterNum,\n        agreement_signed_creator: false,\n        agreement_signed_brand: false,\n        agreement_signed_at: null,\n        both_signed: false'
);

fs.writeFileSync('backend/deals_chat_routes.ts', content);
