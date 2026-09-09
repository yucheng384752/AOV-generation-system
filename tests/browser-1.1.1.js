async page => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  const root = page.locator('.app-shell:visible');
  await root.locator('input[type=file]').setInputFiles('public/example.aov.json');
  await page.getByRole('button', { name: '匯入專案', exact: true }).click();
  if (await page.getByRole('button', { name: '切換正向線模式', exact: true }).count()) await page.getByRole('button', { name: '切換正向線模式', exact: true }).click();
  await page.getByRole('button', { name: '顯示完整畫布', exact: true }).click();
  const source = root.locator('.node-card').filter({ has: page.locator('strong', { hasText: '驗證訂單' }) });
  const target = root.locator('.node-card').filter({ has: page.locator('strong', { hasText: '接收訂單' }) });
  const forward = root.locator('.react-flow__edge-default .react-flow__edge-path');
  const original = await forward.first().getAttribute('d');
  await page.getByRole('button', { name: '切換返回線模式', exact: true }).click();
  const from = source.locator('.return-handle');
  const to = target.locator('.return-handle');
  if (await from.count() !== 1 || await to.count() !== 1) throw new Error('每個節點應只有一個返回接點');
  for (const [card, handle] of [[source, from], [target, to]]) {
    const c = await card.boundingBox(), h = await handle.boundingBox();
    if (Math.abs(h.y + h.height / 2 - c.y - c.height) > 15) throw new Error('返回接點不在節點下方');
  }
  const count = await root.locator('.react-flow__edge-return').count();
  const reverseA = await to.boundingBox(), reverseB = await from.boundingBox();
  await page.mouse.move(reverseA.x + reverseA.width / 2, reverseA.y + reverseA.height / 2); await page.mouse.down();
  await page.mouse.move(reverseB.x + reverseB.width / 2, reverseB.y + reverseB.height / 2, { steps: 15 }); await page.mouse.up();
  if (await root.locator('.react-flow__edge-return').count() !== count) throw new Error('未阻擋由左向右的返回線');
  if (!(await root.getByRole('status').innerText()).includes('右方節點連回左方節點')) throw new Error('未說明返回方向限制');
  const a = await from.boundingBox(), b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 }); await page.mouse.up();
  await page.getByRole('heading', { name: '返回與 Loop', exact: true }).waitFor();
  if (await root.locator('.react-flow__edge-return').count() !== count + 1) throw new Error('返回拖線失敗');
  const path = root.locator('.react-flow__edge-return .react-flow__edge-path').last();
  if (await path.evaluate(el => getComputedStyle(el).strokeDasharray) === 'none') throw new Error('返回線不是虛線');
  await page.getByRole('button', { name: '關閉設定面板', exact: true }).click();
  await page.getByRole('button', { name: '切換正向線模式', exact: true }).click();
  if (await forward.first().getAttribute('d') !== original) throw new Error('模式切換改動正向線位置');
  if (!await source.locator('.react-flow__handle-left.target').count() || !await source.locator('.react-flow__handle-right.source').count()) throw new Error('缺少左右正向接點');
  await page.screenshot({ path: 'output/playwright/v111-return.png' });
  if (errors.length) throw new Error(errors.join('\n'));
  return 'PASS: bottom return endpoints, dashed drag connection, stable side forward handles and legacy import';
}
