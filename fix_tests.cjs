const fs = require('fs');
let content = fs.readFileSync('tests/multi_buyer_flow.ts', 'utf8');
const lines = content.split('\n');
const newLines = [];
for(let i=0; i<lines.length; i++) {
  if (i >= 68 && i <= 86) continue;
  newLines.push(lines[i]);
  if (i === 67) {
    newLines.push(`  // Buyer A starts negotiation`);
    newLines.push(`  await buyerAPage.click('button:has-text("交渉を開始する")');`);
    newLines.push(`  await buyerAPage.waitForTimeout(2000); // wait for redirect to chat`);
    newLines.push(`  // Buyer A proposes 950,000 in chat`);
    newLines.push(`  await buyerAPage.fill('input[placeholder="金額を入力"]', '950000');`);
    newLines.push(`  await buyerAPage.click('button:has-text("提示する")');`);
    newLines.push(`  await buyerAPage.waitForTimeout(1000);`);
    newLines.push(`  await buyerAPage.fill('input[placeholder="メッセージを入力..."]', '95万円で即決希望');`);
    newLines.push(`  await buyerAPage.click('button:has-text("送信")');`);
    newLines.push(`  await buyerAPage.waitForTimeout(1000);`);
    newLines.push(``);
    newLines.push(`  // Buyer B finds it`);
    newLines.push(`  await buyerBPage.goto(\`\${URL}/buyer/dashboard\`);`);
    newLines.push(`  await buyerBPage.click('button:has-text("プラットフォーム全体の案件")');`);
    newLines.push(`  await buyerBPage.waitForSelector('text=E2E Target Firm');`);
    newLines.push(`  const targetInvoiceB = buyerBPage.locator('text=E2E Target Firm').first();`);
    newLines.push(`  await targetInvoiceB.click();`);
    newLines.push(`  await buyerBPage.waitForTimeout(1000); // modal animation`);
    newLines.push(``);
    newLines.push(`  // Buyer B starts negotiation`);
    newLines.push(`  await buyerBPage.click('button:has-text("交渉を開始する")');`);
    newLines.push(`  await buyerBPage.waitForTimeout(2000); // redirect`);
    newLines.push(`  // Buyer B proposes 920,000 in chat`);
    newLines.push(`  await buyerBPage.fill('input[placeholder="金額を入力"]', '920000');`);
    newLines.push(`  await buyerBPage.click('button:has-text("提示する")');`);
    newLines.push(`  await buyerBPage.waitForTimeout(1000);`);
    newLines.push(`  await buyerBPage.fill('input[placeholder="メッセージを入力..."]', '92万円だが、継続的な取引を希望');`);
    newLines.push(`  await buyerBPage.click('button:has-text("送信")');`);
    newLines.push(`  await buyerBPage.waitForTimeout(1000);`);
  }
}
fs.writeFileSync('tests/multi_buyer_flow.ts', newLines.join('\n'));
console.log('File updated successfully!');
