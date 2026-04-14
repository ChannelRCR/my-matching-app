const fs = require('fs');
let content = fs.readFileSync('tests/multi_buyer_flow.ts', 'utf8');
content = content.replace(/\$\{URL\}/g, '${APP_URL}');
fs.writeFileSync('tests/multi_buyer_flow.ts', content);
console.log("Successfully replaced URL with APP_URL");
