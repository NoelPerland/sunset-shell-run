const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-timer-throttling'] });
  console.log('Browser ready');
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:8972/');
  await page.waitForFunction(() => window.__sunsetShellRunGame?.scene.isActive('WorldMapScene'));
  console.log('Map ready');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.isActive('GameScene'));
  const start = await page.evaluate(() => window.__sunsetShellRunGame.scene.getScene('GameScene').player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(x => window.__sunsetShellRunGame.scene.getScene('GameScene').player.x > x + 30, start);
  await page.keyboard.up('ArrowRight');
  console.log('Keyboard movement passed');
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.getScene('GameScene').state.paused);
  for (const [width, height] of [[1366,768],[1920,1080],[390,844],[360,640],[844,390],[390,844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const fit = await page.evaluate(() => {
      const c = document.querySelector('#game canvas').getBoundingClientRect();
      const p = document.querySelector('#game').getBoundingClientRect();
      const shell = document.querySelector('#game-shell').getBoundingClientRect();
      return { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, ratio: c.width / c.height, contained: c.left >= p.left - 1 && c.top >= p.top - 1 && c.right <= p.right + 1 && c.bottom <= p.bottom + 1, bottom: shell.bottom };
    });
    assert(fit.w <= width && fit.h <= height && fit.bottom <= height + 1, `Overflow at ${width}x${height}: ${JSON.stringify(fit)}`);
    console.log('Fit', width, height);
    assert(fit.contained && Math.abs(fit.ratio - 16/9) < 0.02, `Canvas cropped or distorted at ${width}x${height}`);
  }
  console.log('Starting touch checks');
  await page.locator('[data-action="map"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.isActive('WorldMapScene'));
  await page.locator('[data-action="start"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.isActive('GameScene'));
  const session = await context.newCDPSession(page);
  const right = await page.locator('[data-hold="right"]').boundingBox();
  const before = await page.evaluate(() => window.__sunsetShellRunGame.scene.getScene('GameScene').player.x);
  await page.evaluate(() => document.addEventListener('pointerdown', event => { window.__qaPointer = { type: event.pointerType, target: event.target.outerHTML }; }, { once: true }));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + right.width/2, y: right.y + right.height/2, id: 1 }] });
  try {
    await page.waitForFunction(x => window.__sunsetShellRunGame.scene.getScene('GameScene').player.x > x + 25, before, { timeout: 5000 });
  } catch (error) {
    console.error(await page.evaluate(() => { const scene = window.__sunsetShellRunGame.scene.getScene('GameScene'); return { pointer: window.__qaPointer, state: scene.state, x: scene.player.x, y: scene.player.y, velocity: scene.player.body.velocity, scenes: window.__sunsetShellRunGame.scene.getScenes(true).map(s => s.scene.key) }; }));
    throw error;
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.locator('[data-action="jump"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.getScene('GameScene').player.body.velocity.y < -100);
  await page.locator('[data-action="shoot"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.getScene('GameScene').projectiles.countActive() > 0);
  await page.locator('[data-action="pause"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.getScene('GameScene').state.paused);
  await page.locator('[data-action="pause"]').tap();
  await page.waitForFunction(() => !window.__sunsetShellRunGame.scene.getScene('GameScene').state.paused);
  await page.screenshot({ path: '../../outputs/sunset-repaired-mobile.png' });
  await page.locator('[data-action="map"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.isActive('WorldMapScene'));
  await page.locator('[data-action="start"]').tap();
  await page.waitForFunction(() => window.__sunsetShellRunGame.scene.isActive('GameScene'));
  assert.deepEqual(errors, []);
  await page.evaluate(() => { window.__sunsetShellRunGame.scene.getScene('GameScene').state.dead = true; });
  await page.locator('[data-action="start"]').tap();
  await page.waitForFunction(() => { const scene = window.__sunsetShellRunGame.scene.getScene('GameScene'); return !scene.state.dead && scene.state.lives === 3; });
  console.log('PASS: keyboard play, six viewport transitions, complete undistorted canvas, touch move/jump/shoot, pause/resume, map and play.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
