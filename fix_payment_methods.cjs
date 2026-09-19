const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/payment_routes.ts');
let content = fs.readFileSync(p, 'utf8');

const oldRoutes = `router.post("/creator/payment-methods", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Only creators can modify payment methods" });
      }

      const { bank_account_number, bank_ifsc, upi_id, account_holder_name } = req.body;`;

const updatedRoutes = `router.post("/creator/payment-methods", async (req, res) => {
    try {
      const user = await parseAuthUser(req);
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Only creators can modify payment methods" });
      }

      let bank_account_number, bank_ifsc, upi_id, account_holder_name;
      
      if (req.body.method_type) {
        // Handling { method_type, account_details } payload from frontend
        if (req.body.method_type === 'UPI') {
           upi_id = req.body.account_details?.upi_id;
        } else {
           bank_account_number = req.body.account_details?.account_no;
           bank_ifsc = req.body.account_details?.ifsc;
           account_holder_name = req.body.account_details?.holder_name;
        }
      } else {
        // Handling flat payload
        ({ bank_account_number, bank_ifsc, upi_id, account_holder_name } = req.body);
      }`;

content = content.replace(oldRoutes, updatedRoutes);
fs.writeFileSync(p, content);
console.log("Done");
