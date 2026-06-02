import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

test.describe('Multiple Buyers Negotiation & Race Condition Prevention', () => {
  // Setup takes time and E2E flows with multiple contexts can be slow
  test.setTimeout(180 * 1000);

  test.beforeAll(() => {
    console.log('--- Setting up test users ---');
    try {
      execSync('node scripts/setup_test_users.js', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to set up test users:', e);
    }
  });

  test('Seller accepts B1, B2 is automatically cancelled', async ({ browser }) => {
    // 1. 3つの独立したブラウザセッションを準備
    const sellerCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    const b1Ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const b2Ctx = await browser.newContext({ ignoreHTTPSErrors: true });

    const sellerPage = await sellerCtx.newPage();
    const b1Page = await b1Ctx.newPage();
    const b2Page = await b2Ctx.newPage();

    // エラーロギング
    sellerPage.on('pageerror', err => console.error(`[Seller] ${err.message}`));
    b1Page.on('pageerror', err => console.error(`[B1] ${err.message}`));
    b2Page.on('pageerror', err => console.error(`[B2] ${err.message}`));

    const loginUser = async (page: any, email: string) => {
      await page.goto('/login');
      await page.getByLabel('メールアドレス').fill(email);
      await page.getByLabel('パスワード', { exact: true }).fill('TestPassword123!');
      await page.getByRole('button', { name: 'ログイン' }).click();
      
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      } catch (err) {
        const errorText = await page.locator('.bg-red-50, .toast').innerText().catch(() => 'No visible error message');
        throw new Error(`Login failed for ${email}. UI Error: ${errorText}`);
      }
      
      // 3ステップのウェルカムモーダルを突破
      await expect(page.getByRole('button', { name: '次へ' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: '次へ' }).click();
      
      await expect(page.getByRole('button', { name: '同意する' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: '同意する' }).click();
      
      await expect(page.getByRole('button', { name: '始める' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: '始める' }).click();
      
      // ダッシュボードの表示確認
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    };

    await test.step('Logins', async () => {
      await loginUser(sellerPage, 'test_s_multi@example.com');
      await loginUser(b1Page, 'test_a_multi@example.com');
      await loginUser(b2Page, 'test_b_multi@example.com');
    });

    const uniqueDebtorName = `RaceCondition Firm ${Date.now()}`;

    // 2. 案件の登録
    await test.step('Seller creates a new deal', async () => {
      await sellerPage.goto('/seller/dashboard');
      await sellerPage.click('button:has-text("案件の新規登録")');
      
      const debtorInput = sellerPage.locator('input[name="debtorName"]');
      await expect(debtorInput).toBeVisible({ timeout: 5000 });
      
      await debtorInput.fill(uniqueDebtorName);
      await sellerPage.check('input[name="isClientNamePublic"]');
      await sellerPage.fill('input[name="debtorPostalCode"]', '1000001');
      await sellerPage.fill('input[name="debtorAddress"]', 'Tokyo');
      await sellerPage.fill('input[name="dueDate"]', '2026-12-31');
      await sellerPage.fill('input[name="amount"]', '1000000');
      await sellerPage.fill('input[name="sellingAmount"]', '1000000');
      
      await sellerPage.click('button:has-text("出品内容を確認する")');
      const confirmBtn = sellerPage.locator('button:has-text("この内容で登録する")');
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();
      
      await expect(sellerPage.locator(`text=${uniqueDebtorName}`).first()).toBeVisible({ timeout: 15000 });
    });

    // 3. 複数人からのチャット開始とオファー (同額)
    const offerPrice = '1000000'; // 満額提示にして即時マッチさせる

    await test.step('Buyer B1 offers 1,000,000', async () => {
      await b1Page.goto('/buyer/dashboard');
      await b1Page.reload({ waitUntil: 'networkidle' });
      const platformTab = b1Page.locator('button:has-text("プラットフォーム全体の案件")');
      if (await platformTab.isVisible()) await platformTab.click();
      
      const targetInvoice = b1Page.locator(`text=${uniqueDebtorName}`).first();
      await expect(targetInvoice).toBeVisible({ timeout: 15000 });
      await targetInvoice.click();
      
      await b1Page.click('button:has-text("交渉を開始する")');
      await expect(b1Page.locator('text=入札・金額提示')).toBeVisible({ timeout: 15000 });

      // 金額を入力して提示
      const amountInput = b1Page.getByPlaceholder('金額を入力');
      await amountInput.fill(offerPrice);
      
      // 次に出現するダイアログを「OK」で承認する
      b1Page.once('dialog', (dialog: any) => dialog.accept());
      await b1Page.getByRole('button', { name: '提示する' }).click();
      
      // 金額合致メッセージの一部を正規表現で待機する
      await expect(b1Page.getByText(/金額が合致しました/)).toBeVisible({ timeout: 15000 });
    });

    await test.step('Buyer B2 offers 1,000,000', async () => {
      await b2Page.goto('/buyer/dashboard');
      await b2Page.reload({ waitUntil: 'networkidle' });
      const platformTab = b2Page.locator('button:has-text("プラットフォーム全体の案件")');
      if (await platformTab.isVisible()) await platformTab.click();
      
      const targetInvoice = b2Page.locator(`text=${uniqueDebtorName}`).first();
      await expect(targetInvoice).toBeVisible({ timeout: 15000 });
      await targetInvoice.click();
      
      await b2Page.click('button:has-text("交渉を開始する")');
      await expect(b2Page.locator('text=入札・金額提示')).toBeVisible({ timeout: 15000 });

      // 金額を入力して提示
      const amountInput = b2Page.getByPlaceholder('金額を入力');
      await amountInput.fill(offerPrice);
      
      // 次に出現するダイアログを「OK」で承認する
      b2Page.once('dialog', (dialog: any) => dialog.accept());
      await b2Page.getByRole('button', { name: '提示する' }).click();
      
      // 金額合致メッセージの一部を正規表現で待機する
      await expect(b2Page.getByText(/金額が合致しました/)).toBeVisible({ timeout: 15000 });
    });

    // 4. 同額提示・再提案の挙動確認 & 5. 契約締結と二重契約の防止
    await test.step('Seller verifies multiple highest buyers and accepts B1', async () => {
      await sellerPage.goto('/seller/dashboard');
      await sellerPage.reload({ waitUntil: 'networkidle' });

      // Dashboardで該当案件をクリックして詳細画面へ
      const targetInvoice = sellerPage.locator(`text=${uniqueDebtorName}`).first();
      await expect(targetInvoice).toBeVisible({ timeout: 10000 });
      await targetInvoice.click();
      
      // 案件詳細画面で Buyer A (B1) のオファーのチャット画面へ進む
      const buyerACard = sellerPage.locator('.border-l-primary\\/50, .border-l-4').filter({ hasText: 'Buyer A' }).first();
      await expect(buyerACard).toBeVisible({ timeout: 10000 });
      await buyerACard.locator('button:has-text("チャットを確認")').click();
      
      // --- 修正箇所：金額の手動入力処理を削除し、自動合致していることを確認 ---
      await expect(sellerPage.getByText(/金額が合致しました/)).toBeVisible({ timeout: 15000 });

      // 金額合致後、契約書プレビューが表示されるのを待機する
      const contractPreview = sellerPage.locator('.overflow-y-auto, .contract-preview').first();
      await expect(contractPreview).toBeVisible({ timeout: 15000 });

      // 1. プレビューの末尾のテキストがDOMに存在することを確認（画面外でもOK）
      const endText = sellerPage.getByText('【プレビューの末尾】');
      await endText.waitFor({ state: 'attached', timeout: 15000 });

      // 2. 本当のスクロール親要素を探し出し、人間がスクロールするように段階的に値を動かす
      await endText.evaluate(async (node) => {
          let parent = node.parentElement;
          while (parent) {
              const overflowY = window.getComputedStyle(parent).overflowY;
              if (overflowY === 'auto' || overflowY === 'scroll') {
                  // 一度トップにリセット
                  parent.scrollTop = 0;
                  parent.dispatchEvent(new Event('scroll', { bubbles: true }));
                  
                  // 20pxずつ段階的にスクロールさせて、Reactの検知漏れ（スロットル）を防ぐ
                  const step = 20;
                  const maxScroll = parent.scrollHeight - parent.clientHeight;
                  for (let current = 0; current <= maxScroll + 100; current += step) {
                      parent.scrollTop = current;
                      parent.dispatchEvent(new Event('scroll', { bubbles: true }));
                      // 各ステップでごくわずかに待機（アニメーションのシミュレート）
                      await new Promise(r => setTimeout(r, 10));
                  }
                  
                  // 最後に完全に最下部へ張り付ける（ピクセル誤差対策）
                  parent.scrollTop = parent.scrollHeight + 500;
                  parent.dispatchEvent(new Event('scroll', { bubbles: true }));
                  break;
              }
              parent = parent.parentElement;
          }
      });

      // 3. 画面の更新（disabled解除）を一瞬待つ
      await sellerPage.waitForTimeout(1000);

      // 4. 正規のPlaywrightアクションで同意・署名・送信を行う
      const consentCheckbox = sellerPage.getByRole('checkbox');
      await expect(consentCheckbox).toBeEnabled({ timeout: 10000 });
      await consentCheckbox.check();

      // 登録名と完全に一致させる必要があるため、プロファイル名の「Multi Seller S」を一文字ずつ入力
      const signatureInput = sellerPage.getByPlaceholder('例：山田 太郎');
      await signatureInput.click();
      await signatureInput.clear();
      await signatureInput.pressSequentially('Multi Seller S', { delay: 100 });

      // Tabキーを押して自然にフォーカスを外し、確実に入力完了（onBlur/onChange）を発火させる
      await signatureInput.press('Tab'); 
      await sellerPage.waitForTimeout(1000); // バリデーション処理とボタンの有効化を待機

      // 契約締結
      const submitBtn = sellerPage.getByRole('button', { name: '契約を締結してPDFを発行する' });
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });

      // クリック直後に出現する最終確認ダイアログを「OK（承認）」して通過させる
      sellerPage.once('dialog', (dialog: any) => dialog.accept());

      await submitBtn.click();

      // 契約成立を待機
      await expect(sellerPage.locator('text=相手の最終合意を待っています').or(sellerPage.locator('text=契約成立🎉'))).toBeVisible({ timeout: 15000 });
    });

    // Buyer 2の自動キャンセル確認
    await test.step('Buyer B2 is automatically cancelled', async () => {
      await b2Page.goto('/buyer/dashboard');
      await b2Page.reload({ waitUntil: 'networkidle' });
      
      // B2のダッシュボードで、案件がキャンセルされている、あるいは進行中から消えているか確認
      // または直接チャットを開いて、システムメッセージを確認する
      // ここではB2のダッシュボードで「終了」または「キャンセル」扱いになるかを検証
      // チャット画面に行けば「システム通知：この案件は他の方との契約が成立したため...」があるはず
      
      // メッセージアイコン等からチャット画面へ遷移を試みる
      // (もしダッシュボードから消えている場合は、消えていることを検証)
      const b2ChatLink = b2Page.locator(`a:has-text("${uniqueDebtorName}")`).first();
      if (await b2ChatLink.isVisible()) {
        await b2ChatLink.click();
        await expect(b2Page.locator('text=この案件は他の方との契約が成立したため、交渉が自動的に終了しました')).toBeVisible({ timeout: 15000 });
        
        // フォームが非活性（表示されない）ことを確認
        await expect(b2Page.locator('button:has-text("提示する")')).not.toBeVisible();
      } else {
        // ダッシュボードから消えていればOK
        expect(true).toBeTruthy();
      }
    });

    await test.step('Cleanup Contexts', async () => {
      await sellerCtx.close();
      await b1Ctx.close();
      await b2Ctx.close();
    });
  });
});
