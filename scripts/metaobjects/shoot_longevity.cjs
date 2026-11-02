// Снимки на секциите на /page/longevity-bactology за ръководството.
const {chromium} = require(process.env.PW_PATH);
const out = process.argv[2];

const SECTIONS = [
  ['01-hero', 'header.hero'],
  ['02-marquee', '.marquee'],
  ['03-intro', 'section.intro'],
  ['04-product', 'section.product.hepato'],
  ['05-routine', 'section.routine'],
  ['06-trust', 'section.trust'],
  ['07-offers', 'section.cta'],
];

(async () => {
  const browser = await chromium.launch({channel: 'chrome'});
  const page = await browser.newPage({
    viewport: {width: 1280, height: 900},
    deviceScaleFactor: 1,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  });
  await page.goto('https://bulgarbiotic.bg/page/longevity-bactology', {waitUntil: 'networkidle', timeout: 60000});
  // Изключва анимациите за поява, за да се вижда всичко на снимката.
  await page.addStyleTag({content: 'html,body{scroll-behavior:auto!important} #CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay{display:none!important} *{transition:none!important} .lng-rv,.lng-rv-scale,.lng-rv-rot{opacity:1!important;transform:none!important}'});
  // Прехвърля страницата до долу, за да заредят мързеливите снимки.
  for (let y = 0; y < 20000; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  // Лентата долу се снима първа, после всичко закачено за екрана се скрива.
  await page.evaluate(() => window.scrollTo(0, 2500));
  await page.waitForTimeout(800);
  const bar = page.locator('#stickyBar').first();
  if (await bar.count() && await bar.isVisible()) { await bar.screenshot({path: `${out}/08-sticky.png`}); console.log('ok 08-sticky'); }
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') el.style.setProperty('visibility', 'hidden', 'important');
      // Продуктите на страницата се наслагват при превъртане; за снимката стоят един под друг.
      if (pos === 'sticky') { if (el.closest('.lng')) el.style.setProperty('position', 'relative', 'important'); else el.style.setProperty('visibility', 'hidden', 'important'); }
    }
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({path: `${out}/full.png`, fullPage: true});
  const boxes = await page.evaluate((list) => list.map(([name, sel]) => {
    const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect();
    return {name, x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height};
  }).filter(Boolean), SECTIONS);
  require('fs').writeFileSync(`${out}/boxes.json`, JSON.stringify(boxes));
  console.log('boxes', boxes.length);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
