import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// .envの内容を読み込み（Playwrightで必要に応じて利用）
dotenv.config();

test.describe('FactorMatch E2E Flow with Stripe Payment', () => {
  // E2Eフロー（特にStripe遷移など）は時間がかかる場合があるため、タイムアウトを延長
  test.setTimeout(120 * 1000);

  test.beforeAll(() => {
    console.log('--- Setting up test users ---');
    try {
      execSync('node scripts/setup_test_users.js', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to set up test users:', e);
    }
  });

  test('Seller creates a deal, Buyer finds it and completes Stripe payment', async ({ browser }) => {
    // -----------------------------------------
    // 0. ブラウザコンテキストの準備（売主用・買主用）
    // -----------------------------------------
    const sellerCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    const buyerCtx = await browser.newContext({ ignoreHTTPSErrors: true });

    const sellerPage = await sellerCtx.newPage();
    const buyerPage = await buyerCtx.newPage();

    // デバッグ用: ブラウザ内で発生したエラーやconsole.logをターミナルに出力する（ベストプラクティス）
    sellerPage.on('console', msg => console.log(`[Seller Console] ${msg.type()}: ${msg.text()}`));
    sellerPage.on('pageerror', err => console.error(`[Seller PageError] ${err.message}`));
    buyerPage.on('console', msg => console.log(`[Buyer Console] ${msg.type()}: ${msg.text()}`));
    buyerPage.on('pageerror', err => console.error(`[Buyer PageError] ${err.message}`));

    // -----------------------------------------
    // 1. 売主（User A）としてログイン
    // -----------------------------------------
    await test.step('Log in as Seller (User A)', async () => {
      await sellerPage.goto('/login');
      await sellerPage.getByLabel('メールアドレス').fill('test_s_multi@example.com');
      await sellerPage.getByLabel('パスワード', { exact: true }).fill('TestPassword123!');
      await sellerPage.getByRole('button', { name: 'ログイン' }).click();
      
      try {
        await sellerPage.waitForURL('**/dashboard', { timeout: 10000 });
      } catch (err) {
        // ログイン失敗時のトーストやエラーメッセージを取得してスロー
        const errorText = await sellerPage.locator('.bg-red-50, .toast').innerText().catch(() => 'No visible error message');
        throw new Error(`Seller login failed. UI Error: ${errorText}`);
      }
      
      // 3ステップのウェルカムモーダルを突破
      await expect(sellerPage.getByRole('button', { name: '次へ' })).toBeVisible({ timeout: 10000 });
      await sellerPage.getByRole('button', { name: '次へ' }).click();
      
      await expect(sellerPage.getByRole('button', { name: '同意する' })).toBeVisible({ timeout: 5000 });
      await sellerPage.getByRole('button', { name: '同意する' }).click();
      
      await expect(sellerPage.getByRole('button', { name: '始める' })).toBeVisible({ timeout: 5000 });
      await sellerPage.getByRole('button', { name: '始める' }).click();
      
      // モーダルが消えてダッシュボードのメインコンテンツが表示されるのを確認
      await expect(sellerPage.getByRole('heading', { name: '債権一覧' })).toBeVisible({ timeout: 10000 });
      
      // ログイン完了（ダッシュボード到達）を「ログアウト」ボタンの表示でも確認
      await expect(sellerPage.getByRole('button', { name: 'ログアウト' })).toBeVisible({ timeout: 15000 });
    });

    // -----------------------------------------
    // 2. 買主（User B）としてログイン
    // -----------------------------------------
    await test.step('Log in as Buyer (User B)', async () => {
      await buyerPage.goto('/login');
      await buyerPage.getByLabel('メールアドレス').fill('test_a_multi@example.com');
      await buyerPage.getByLabel('パスワード', { exact: true }).fill('TestPassword123!');
      await buyerPage.getByRole('button', { name: 'ログイン' }).click();
      
      try {
        await buyerPage.waitForURL('**/dashboard', { timeout: 10000 });
      } catch (err) {
        const errorText = await buyerPage.locator('.bg-red-50, .toast').innerText().catch(() => 'No visible error message');
        throw new Error(`Buyer login failed. UI Error: ${errorText}`);
      }
      
      // 3ステップのウェルカムモーダルを突破
      await expect(buyerPage.getByRole('button', { name: '次へ' })).toBeVisible({ timeout: 10000 });
      await buyerPage.getByRole('button', { name: '次へ' }).click();
      
      await expect(buyerPage.getByRole('button', { name: '同意する' })).toBeVisible({ timeout: 5000 });
      await buyerPage.getByRole('button', { name: '同意する' }).click();
      
      await expect(buyerPage.getByRole('button', { name: '始める' })).toBeVisible({ timeout: 5000 });
      await buyerPage.getByRole('button', { name: '始める' }).click();
      
      // モーダルが消えてダッシュボードのメインコンテンツが表示されるのを確認
      await expect(buyerPage.getByRole('heading', { name: '買い手ダッシュボード' })).toBeVisible({ timeout: 10000 });
      
      await expect(buyerPage.getByRole('button', { name: 'ログアウト' })).toBeVisible({ timeout: 15000 });
    });

    // 新規登録する債権のユニークな会社名を生成
    const uniqueDebtorName = `E2E Target Firm ${Date.now()}`;

    // -----------------------------------------
    // 3. 売主（User A）による案件の新規登録
    // -----------------------------------------
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
      
      // 登録完了し、ダッシュボード上に作成した案件が表示されるのを待機
      await expect(sellerPage.locator(`text=${uniqueDebtorName}`).first()).toBeVisible({ timeout: 15000 });
    });

    // -----------------------------------------
    // 4. 買主（User B）による案件の検索・表示確認
    // -----------------------------------------
    await test.step('Buyer searches and views the deal', async () => {
      await buyerPage.goto('/buyer/dashboard');
      
      // 売主が直前に作成した案件を取得するため、確実にリロードして通信完了を待つ
      await buyerPage.reload({ waitUntil: 'networkidle' });
      
      // プラットフォーム全体タブを選択
      const platformTab = buyerPage.locator('button:has-text("プラットフォーム全体の案件")');
      if (await platformTab.isVisible()) {
          await platformTab.click();
      }
      
      // 作成された案件が一覧に表示されるのを待機してクリック
      const targetInvoice = buyerPage.locator(`text=${uniqueDebtorName}`).first();
      await expect(targetInvoice).toBeVisible({ timeout: 15000 });
      await targetInvoice.click();
      
      // 案件詳細モーダル（またはページ）が開き、アクションボタンが表示されることを確認
      await expect(buyerPage.locator('button:has-text("交渉を開始する")')).toBeVisible({ timeout: 10000 });
    });

    // -----------------------------------------
    // 5. 買主（User B）によるStripe決済と成功通知の確認
    // -----------------------------------------
    await test.step('Buyer completes Stripe Payment', async () => {
      // ヘッダーやサイドバーにある「運営サポート」ボタンをクリック
      const donateBtn = buyerPage.locator('button', { hasText: '運営サポート（投げ銭）' }).first();
      await expect(donateBtn).toBeVisible({ timeout: 5000 });
      await donateBtn.click();

      // モーダルが開き、決済ボタンが表示されるのを確認
      const payBtn = buyerPage.locator('button:has-text("サポートする（クレカ/PayPay）")');
      await expect(payBtn).toBeVisible({ timeout: 5000 });
      
      // 500円のプリセットを選択
      await buyerPage.locator('button:has-text("500円")').click();
      
      // 決済ボタンを押して、Stripe Checkout画面への遷移を待つ
      await Promise.all([
        buyerPage.waitForURL(/.*checkout\.stripe\.com.*/, { timeout: 30000 }),
        payBtn.click()
      ]);

      // E2Eテストのベストプラクティス：サードパーティ（Stripe）のUIを直接操作することは避け、
      // 決済画面への遷移が成功したことを確認したら、決済成功後のリダイレクト先へ手動で遷移してアプリ側の挙動をテストする
      await buyerPage.goto('/buyer/dashboard?donation_success=true');

      // アプリに戻った後、成功通知のトーストが表示されることを確認
      const toastMessage = buyerPage.locator('text=ご支援ありがとうございます！運営チームの励みになります🎉');
      await expect(toastMessage).toBeVisible({ timeout: 15000 });
    });

    // -----------------------------------------
    // 6. クリーンアップ
    // -----------------------------------------
    await test.step('Cleanup Contexts', async () => {
      await sellerCtx.close();
      await buyerCtx.close();
    });
  });
});
