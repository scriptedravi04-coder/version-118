const fs = require('fs');
const file = 'src/components/chat/mobile/ChatBoxMobile.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\{messages\.map\(\(m\) => \(\n\s*<MobileMessageRow\n\s*key=\{m\.id\}/g,
  "{messages.map((m, idx) => (\n          <MobileMessageRow\n            key={m.id || m.message_id || idx}"
);

fs.writeFileSync(file, content);
