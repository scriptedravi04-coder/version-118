const fs = require('fs');

let content = fs.readFileSync('backend/payment_routes.ts', 'utf8');

content = content.replace(
  /razorpay_order_id: razorpay_order_id,  \/\/ ✅ FIX #2: Corrected column name\n\s*razorpay_payment_id: razorpay_payment_id,  \/\/ ✅ FIX #2: Added/g,
  "zaakpay_order_id: razorpay_order_id,"
);

content = content.replace(
  /\.eq\('razorpay_order_id', razorpay_order_id\)/g,
  ".eq('zaakpay_order_id', razorpay_order_id)"
);

content = content.replace(
  /query = query\.or\(`razorpay_order_id\.eq\.\$\{order_id\},razorpay_payment_id\.eq\.\$\{order_id\},id\.eq\.\$\{order_id\}`\);\s*\/\/ ✅ FIX #2/g,
  "query = query.or(`zaakpay_order_id.eq.${order_id},id.eq.${order_id}`);"
);

content = content.replace(
  /order_id: order_id \|\| txn\.razorpay_order_id \}\);\s*\/\/ ✅ FIX #2/g,
  "order_id: order_id || txn.zaakpay_order_id });"
);

fs.writeFileSync('backend/payment_routes.ts', content);
