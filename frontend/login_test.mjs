import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text()); });
  page.on('request', (req) => { if (req.url().includes('/api/') && !req.url().includes('/sanctum/')) console.log('REQ:', req.method(), req.url()); });
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/') && !url.includes('/sanctum/')) {
      const body = res.status() === 200 ? '(body ok)' : ` HTTP:${res.status()}`;
      console.log('RESP:', res.status(), url, body);
      if (res.status() >= 400) { try { const b = await res.text(); if (b) console.log('  BODY:', b.slice(0,500)); } catch(e){} }
    }
  });

  console.log('=== NAVIGATE to /login ===');
  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
  console.log('URL now:', page.url());
  console.log('Title:', (await page.title()).slice(0,60));

  await page.fill('input[id=email]', 'bounce@bounce.test');
  await page.fill('input[id=password]', 'Password12345');
  await page.click('button[type=submit]');

  await page.waitForTimeout(4000);
  console.log('URL now:', page.url());
  const text = await page.textContent('body');
  console.log('Body text:', text.replace(/\s+/g,' ').slice(0,250));
  console.log('Errors:', errors.slice(0,10));
  await browser.close();
})();
