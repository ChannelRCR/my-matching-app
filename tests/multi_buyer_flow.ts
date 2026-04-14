import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const APP_URL = 'http://127.0.0.1:5173';

async function loginAs(page, email, password) {
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("ログイン")');
  await page.waitForTimeout(2000); // give time for auth state to settle
  // Make sure we are on dashboard
  await page.waitForSelector('text=ログアウト', { timeout: 10000 });
}

async function runTest() {
  console.log("Starting Multi-Buyer E2E Validation...");
  while(true) {
    try {
      await fetch(APP_URL + "/login");
      console.log("Connected to Vite!");
      break;
    } catch(e) {
      console.log("Waiting for Vite...", e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  
  // Create 3 separate contexts
  const sellerCtx = await browser.newContext();
  const buyerACtx = await browser.newContext();
  const buyerBCtx = await browser.newContext();

  const sellerPage = await sellerCtx.newPage();
  const buyerAPage = await buyerACtx.newPage();
  const buyerBPage = await buyerBCtx.newPage();

  console.log("1. Logging in...");
  await loginAs(sellerPage, 'test_s_multi@example.com', 'TestPassword123!');
  await loginAs(buyerAPage, 'test_a_multi@example.com', 'TestPassword123!');
  await loginAs(buyerBPage, 'test_b_multi@example.com', 'TestPassword123!');

  console.log("2. Seller listing a new invoice...");
  await sellerPage.goto(`${APP_URL}/seller/dashboard`);
  await sellerPage.click('button:has-text("案件の新規登録")');
  await sellerPage.waitForTimeout(1000); // wait for modal
  await sellerPage.fill('input[name="debtorName"]', 'E2E Target Firm');
  await sellerPage.check('input[name="isClientNamePublic"]');
  await sellerPage.fill('input[name="debtorPostalCode"]', '1000001');
  await sellerPage.fill('input[name="debtorAddress"]', 'Tokyo');
  await sellerPage.fill('input[name="dueDate"]', '2026-12-31');
  await sellerPage.fill('input[name="amount"]', '1000000');
  await sellerPage.fill('input[name="sellingAmount"]', '1000000');
  await sellerPage.click('button:has-text("出品内容を確認する")');
  await sellerPage.waitForTimeout(1000);
  await sellerPage.click('button:has-text("この内容で登録する")');
  await sellerPage.waitForTimeout(3000); // Let it upload and redirect

  // Both buyers find the invoice. We don't want to dig through the DOM if it's too nested, 
  // let's grab the invoice ID or search for it.
  console.log("3. Buyers starting negotiation...");
  
  // Buyer A finds it
  await buyerAPage.goto(`${APP_URL}/buyer/dashboard`);
  await buyerAPage.click('button:has-text("プラットフォーム全体の案件")');
  await buyerAPage.waitForSelector('text=E2E Target Firm');
  
  // We can directly click on the invoice details since it's the newest one
  const targetInvoiceA = buyerAPage.locator('text=E2E Target Firm').first();
  await targetInvoiceA.click();
  await buyerAPage.waitForTimeout(1000); // modal animation
  
  // Buyer A starts negotiation
  await buyerAPage.click('button:has-text("交渉を開始する")');
  await buyerAPage.waitForTimeout(2000); // wait for redirect to chat
  // Buyer A proposes 950,000 in chat
  await buyerAPage.fill('input[placeholder="金額を入力"]', '950000');
  await buyerAPage.click('button:has-text("提示する")');
  await buyerAPage.waitForTimeout(1000);
  await buyerAPage.fill('input[placeholder="メッセージを入力..."]', '95万円で即決希望');
  await buyerAPage.click('button:has-text("送信")');
  await buyerAPage.waitForTimeout(1000);

  // Buyer B finds it
  await buyerBPage.goto(`${APP_URL}/buyer/dashboard`);
  await buyerBPage.click('button:has-text("プラットフォーム全体の案件")');
  await buyerBPage.waitForSelector('text=E2E Target Firm');
  const targetInvoiceB = buyerBPage.locator('text=E2E Target Firm').first();
  await targetInvoiceB.click();
  await buyerBPage.waitForTimeout(1000); // modal animation

  // Buyer B starts negotiation
  await buyerBPage.click('button:has-text("交渉を開始する")');
  await buyerBPage.waitForTimeout(2000); // redirect
  // Buyer B proposes 920,000 in chat
  await buyerBPage.fill('input[placeholder="金額を入力"]', '920000');
  await buyerBPage.click('button:has-text("提示する")');
  await buyerBPage.waitForTimeout(1000);
  await buyerBPage.fill('input[placeholder="メッセージを入力..."]', '92万円だが、継続的な取引を希望');
  await buyerBPage.click('button:has-text("送信")');
  await buyerBPage.waitForTimeout(1000);

  // Seller checks dashboard to see both deals
  console.log("4. Seller checks active negotiations...");
  await sellerPage.goto(`${APP_URL}/`);
  await sellerPage.waitForTimeout(2000);
  // Look for Buyer A and B's requests
  
  // Get deal links from Seller UI
  // Since "交渉中" or messages show up, we can find the chat links
  const chatLinks = await sellerPage.locator('text=チャットへ').all();
  if (chatLinks.length < 2) {
      console.log("Error: Expected 2 chat links. Found:", chatLinks.length);
  } else {
      console.log("Seller sees 2 deals perfectly!");
  }

  // To target Buyer A specifically, let's navigate to the first chat link (Assuming it's Buyer B because it's newer, wait!)
  // We can use the URL pattern or just click the first. Actually let's just make the seller go to Buyer A's chat programmatically to avoid guessing the order.
  const pageAUrl = buyerAPage.url(); // http://.../chat?dealId=...
  const dealIdA = new URL(pageAUrl).searchParams.get('dealId');
  
  const pageBUrl = buyerBPage.url();
  const dealIdB = new URL(pageBUrl).searchParams.get('dealId');

  console.log("5. Seller concludes with Buyer A...");
  await sellerPage.goto(`${APP_URL}/chat?dealId=${dealIdA}`);
  await sellerPage.waitForTimeout(2000);

  // Seller reveals info & clicks Accept Terms
  // Wait, there might be multiple "開示する"
  const revealBtns = await sellerPage.locator('button:has-text("開示する")').all();
  for (let b of revealBtns) {
      try {
          await b.click({ force: true, timeout: 500 });
          await sellerPage.waitForTimeout(300);
      } catch (e) {
          // May be hidden in an accordion, which is fine to skip
      }
  }

  // Seller accepts rules
  await sellerPage.click('button:has-text("規約及び契約条項を確認・同意する")');
  await sellerPage.waitForTimeout(1000); // DB wait

  // Buyer A sees this, accepts rules, and buys
  await buyerAPage.goto(`${APP_URL}/chat?dealId=${dealIdA}`);
  await buyerAPage.waitForTimeout(2000);
  await buyerAPage.fill('input[placeholder="金額を入力"]', '950000'); // match seller requested logic if needed
  // Seller types 950K and sends
  await sellerPage.fill('input[placeholder="メッセージを入力..."]', 'よろしくお願いします');
  await sellerPage.fill('input[placeholder="金額を入力"]', '950000');
  await sellerPage.click('button[aria-label="送信"]');
  await sellerPage.waitForTimeout(2000);

  // Buyer A agrees
  await buyerAPage.goto(`${APP_URL}/chat?dealId=${dealIdA}`);
  await buyerAPage.waitForTimeout(2000);
  await buyerAPage.click('button:has-text("規約及び契約条項を確認・同意する")');
  await buyerAPage.waitForTimeout(2000);

  // Since price matches, there should be "【システム通知】金額が ¥950,000 で合致しました。"
  const hasMatchedMsg = await buyerAPage.locator('text=金額が ¥950,000 で合致しました').isVisible();
  console.log("Buyer A Match Message Visible:", hasMatchedMsg);

  // Click Agree & Conclude
  await sellerPage.click('button:has-text("取引に合意し、契約を締結する")');
  await sellerPage.waitForTimeout(1000);
  
  await buyerAPage.click('button:has-text("取引に合意し、契約を締結する")');
  await buyerAPage.waitForTimeout(3000);

  console.log("6. Buyer A Agreement Verified...");
  await buyerAPage.screenshot({ path: 'artifacts/buyerA_concluded.png' });
  
  // Verify PDF logic works!
  const isPDFVisibleA = await buyerAPage.locator('text=契約書のダウンロード').isVisible() || await buyerAPage.locator('text=契約締結完了').isVisible();
  console.log("Buyer A concluded mode visible:", isPDFVisibleA);

  console.log("7. Checking Buyer B UI state...");
  await buyerBPage.goto(`${APP_URL}/chat?dealId=${dealIdB}`);
  await buyerBPage.waitForTimeout(2000);
  await buyerBPage.screenshot({ path: 'artifacts/buyerB_rejected.png' });
  
  const isRejectedMsg = await buyerBPage.locator('text=他の案件と成約したため').isVisible() || await buyerBPage.locator('text=この案件は他のお客様と成約したため').isVisible();
  const inputDisabled = await buyerBPage.locator('button[aria-label="メッセージ送信"]').isDisabled();
  
  console.log("Buyer B received reject message:", isRejectedMsg);
  console.log("Buyer B input is disabled:", inputDisabled);

  console.log("Test Completed!");
  await browser.close();
  process.exit(0);
}

runTest().catch(console.error);
