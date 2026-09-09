async page => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('input[type=file]').setInputFiles('public/example.aov.json');
  await page.getByRole('button', { name: '匯入專案', exact: true }).click();
  await page.locator('.node-card').filter({ has: page.locator('strong', { hasText: '接收訂單' }) }).click();
  await page.getByText('輸入契約 · 1', { exact: true }).click();
  const section = page.locator('aside > details').filter({ has: page.locator('summary', { hasText: '輸入契約' }) });
  await section.getByText('進階限制與範例 · JSON Schema', { exact: true }).last().click();
  await section.getByRole('textbox', { name: 'JSON Schema（Draft 7）', exact: true }).last().fill('{bad');
  await page.getByRole('button', { name: '關閉設定面板', exact: true }).click();
  if (!await page.getByRole('heading', { name: '定義節點', exact: true }).isVisible()) throw new Error('未套用變更遺失');
  await section.getByRole('button', { name: '套用 Schema', exact: true }).last().click();
  await section.getByRole('alert').waitFor();
  await section.getByRole('button', { name: '放棄未套用變更', exact: true }).click();
  await page.getByRole('button', { name: '關閉設定面板', exact: true }).click();
  // Simulate quota denial in this isolated test browser, then restore it.
  await page.evaluate(() => { window.originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: '新增一般節點', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '暫存失敗' }).waitFor();
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; });
  await page.getByRole('textbox', { name: '節點名稱', exact: true }).fill('恢復暫存檢查');
  await page.getByRole('status').filter({ hasText: '已暫存' }).waitFor();
  await page.getByRole('button', { name: '關閉設定面板', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles('public/example.aov.json');
  await page.getByRole('button', { name: '匯入專案', exact: true }).click();
  await page.getByRole('button', { name: '顯示完整畫布', exact: true }).click();
  if (await page.getByRole('button', { name: '切換淺色主題', exact: true }).count()) await page.getByRole('button', { name: '切換淺色主題', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/light-final.png' });
  await page.getByRole('button', { name: '切換深色主題', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/dark-final.png' });
  await page.getByRole('button', { name: '切換淺色主題', exact: true }).click();
  return 'PASS: 未套用 Schema 保護、錯誤 Schema 保留、儲存失敗回饋與恢復、最終主題截圖';
}
