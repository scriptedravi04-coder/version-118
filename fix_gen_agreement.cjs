const fs = require('fs');
let content = fs.readFileSync('backend/deals_chat_routes.ts', 'utf8');

content = content.replace(
  /flow_state: "AI_AGREEMENT_READY",\s*ai_generated_agreement: agreementContent,\s*amount_fixed: amountFixed/g,
  'flow_state: "AI_AGREEMENT_READY",\n        ai_generated_agreement: agreementContent,\n        amount_fixed: amountFixed,\n        agreement_signed_creator: false,\n        agreement_signed_brand: false,\n        agreement_signed_at: null'
);

fs.writeFileSync('backend/deals_chat_routes.ts', content);
