import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const updatesDir = path.join(root, 'screenshots', 'updates');
const outDir = path.join(root, 'assets', 'store', 'app-store');
const iphoneDir = path.join(outDir, 'iphone-6-5');
const ipadDir = path.join(outDir, 'ipad-13');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

fs.mkdirSync(iphoneDir, { recursive: true });
fs.mkdirSync(ipadDir, { recursive: true });

const logo = dataUri(path.join(root, 'assets', 'brand', 'gowandr-logo-full-color.png'), 'image/png');

const screens = [
  {
    id: '01-pocket',
    file: 'Screenshot_20260708-150828.png',
    headline: 'Keep bookings close',
    subhead: 'Pocket keeps flights, stays, screenshots, and codes ready when travel gets busy.',
  },
  {
    id: '02-plan',
    file: 'Screenshot_20260708-150859.png',
    headline: 'Know what to do next',
    subhead: 'Move a committed trip into dates, momentum, and the next useful step.',
  },
  {
    id: '03-compare',
    file: 'Screenshot_20260708-150916.png',
    headline: 'Compare without overthinking',
    subhead: 'Choose between real trip drafts with a cleaner view of your best options.',
  },
  {
    id: '04-trips',
    file: 'Screenshot_20260708-150926.png',
    headline: 'Shape real options',
    subhead: 'Turn saved links, notes, and ideas into trips that feel worth planning.',
  },
  {
    id: '05-home',
    file: 'Screenshot_20260708-150933.png',
    headline: 'Save every trip idea',
    subhead: 'Collect ideas before they disappear, then keep moving toward the trip.',
  },
];

function dataUri(file, mime = 'image/png') {
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

function esc(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function screenshotHtml(screen, mode) {
  const isIpad = mode === 'ipad';
  const width = isIpad ? 2048 : 1242;
  const height = isIpad ? 2732 : 2688;
  const source = dataUri(path.join(updatesDir, screen.file), 'image/png');
  const side = isIpad ? 128 : 78;
  const top = isIpad ? 104 : 76;
  const deviceW = isIpad ? 860 : 740;
  const deviceH = isIpad ? 1660 : 1422;
  const deviceLeft = isIpad ? 594 : 251;
  const deviceTop = isIpad ? 710 : 720;
  const copyWidth = isIpad ? 1040 : 1060;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
          font-family: Inter, Arial, sans-serif;
          color: #17211e;
          background:
            radial-gradient(circle at 82% 10%, rgba(255,255,255,0.92) 0 14%, transparent 15%),
            radial-gradient(circle at 6% 92%, rgba(99,212,180,0.28) 0 20%, transparent 21%),
            linear-gradient(150deg, #E2F8F1 0%, #FBFFFD 54%, #D8F6ED 100%);
        }
        .brand {
          position: absolute;
          left: ${side}px;
          top: ${top}px;
          width: ${isIpad ? 220 : 174}px;
          height: auto;
        }
        .copy {
          position: absolute;
          left: ${side}px;
          top: ${isIpad ? 214 : 188}px;
          width: ${copyWidth}px;
        }
        .kicker {
          margin-bottom: ${isIpad ? 28 : 22}px;
          color: #0B8B78;
          font-size: ${isIpad ? 36 : 30}px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          max-width: ${copyWidth}px;
          font-size: ${isIpad ? 112 : 96}px;
          line-height: 1;
          letter-spacing: 0;
        }
        p {
          margin: ${isIpad ? 30 : 24}px 0 0;
          max-width: ${isIpad ? 1120 : 970}px;
          color: rgba(23,33,30,0.68);
          font-size: ${isIpad ? 42 : 38}px;
          line-height: 1.28;
          font-weight: 680;
        }
        .wash {
          position: absolute;
          inset: auto -140px -260px auto;
          width: ${isIpad ? 980 : 720}px;
          height: ${isIpad ? 980 : 720}px;
          border-radius: 999px;
          background: rgba(173,245,224,0.28);
        }
        .deviceShadow {
          position: absolute;
          left: ${deviceLeft - 18}px;
          top: ${deviceTop + 34}px;
          width: ${deviceW + 36}px;
          height: ${deviceH}px;
          border-radius: ${isIpad ? 92 : 86}px;
          background: rgba(13,22,20,0.2);
          filter: blur(28px);
        }
        .device {
          position: absolute;
          left: ${deviceLeft}px;
          top: ${deviceTop}px;
          width: ${deviceW}px;
          height: ${deviceH}px;
          padding: ${isIpad ? 18 : 16}px;
          border-radius: ${isIpad ? 86 : 80}px;
          background: #102721;
          box-shadow:
            inset 0 0 0 5px rgba(255,255,255,0.16),
            0 24px 58px rgba(20,38,34,0.24);
          overflow: hidden;
        }
        .screenWrap {
          width: 100%;
          height: 100%;
          border-radius: ${isIpad ? 66 : 62}px;
          overflow: hidden;
          background: #E4F8F0;
        }
        .screen {
          width: 100%;
          height: auto;
          object-fit: cover;
          object-position: top center;
          transform: translateY(${isIpad ? -116 : -100}px);
          transform-origin: top center;
          display: block;
          background: #E4F8F0;
        }
      </style>
    </head>
    <body>
      <div class="wash"></div>
      <img class="brand" src="${logo}" alt="" />
      <section class="copy">
        <div class="kicker">GoWandr</div>
        <h1>${esc(screen.headline)}</h1>
        <p>${esc(screen.subhead)}</p>
      </section>
      <div class="deviceShadow"></div>
      <div class="device"><div class="screenWrap"><img class="screen" src="${source}" alt="" /></div></div>
    </body>
  </html>`;
}

async function render(browser, html, file, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: file, fullPage: false });
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });

  for (const screen of screens) {
    await render(
      browser,
      screenshotHtml(screen, 'iphone'),
      path.join(iphoneDir, `${screen.id}-${slug(screen.headline)}-1242x2688.png`),
      { width: 1242, height: 2688 },
    );

    await render(
      browser,
      screenshotHtml(screen, 'ipad'),
      path.join(ipadDir, `${screen.id}-${slug(screen.headline)}-2048x2732.png`),
      { width: 2048, height: 2732 },
    );
  }

  await browser.close();
  console.log(`Generated ${screens.length} iPhone and ${screens.length} iPad screenshots in ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
