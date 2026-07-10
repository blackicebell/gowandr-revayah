import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'assets', 'store', 'app-store');
const rawPhoneDir = path.join(outDir, 'raw-phone');
const rawTabletDir = path.join(outDir, 'raw-tablet');
fs.mkdirSync(rawPhoneDir, { recursive: true });
fs.mkdirSync(rawTabletDir, { recursive: true });

const baseUrl = process.env.APP_STORE_SCREENSHOT_BASE_URL ?? 'http://localhost:8082';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function dataUri(relativePath, mime = 'image/jpeg') {
  const file = fs.readFileSync(path.join(root, relativePath));
  return `data:${mime};base64,${file.toString('base64')}`;
}

const img = {
  coast: dataUri('assets/starter/coast.jpg'),
  city: dataUri('assets/starter/city.jpg'),
  food: dataUri('assets/starter/food.jpg'),
  logo: dataUri('assets/brand/gowandr-logo-full-color.png', 'image/png'),
};

const now = '2026-06-30T02:00:00.000Z';

function idea(id, title, category, priority, tags, note, link) {
  return { id, title, category, priority, tags, note, link };
}

const trips = [
  {
    id: 'lisbon',
    title: 'Lisbon Long Weekend',
    subtitle: 'Food, views, old streets, and a balanced pace for friends.',
    heroImage: img.city,
    tags: ['food', 'culture', 'friends', 'walking'],
    pace: 'Balanced',
    companionType: 'Friends',
    latestMatchupResult: {
      matchupName: 'Spring escape',
      groupMatch: 86,
      summary: 'Lisbon feels easier to plan and has the strongest shared pull.',
      decidedAt: now,
    },
    finalPlan: true,
    planChecklist: [
      { id: 'p1', title: 'Confirm dates', done: true, category: 'Logistics' },
      { id: 'p2', title: 'Set budget range', done: false, category: 'Logistics' },
      { id: 'p3', title: 'Book flights or transport', done: false, category: 'Logistics' },
      { id: 'p4', title: 'Book stay', done: false, category: 'Reservations' },
      { id: 'p5', title: 'Save anchor reservations', done: false, category: 'Reservations' },
      { id: 'p6', title: 'Share committed plan with the people going', done: false, category: 'Group coordination' },
    ],
    ideas: [
      idea('lisbon-1', 'Rooftop dinner', 'Food', 'Must-do', ['food', 'views'], 'Start the trip with a view and something memorable.'),
      idea('lisbon-2', 'Alfama walk', 'Culture', 'Must-do', ['culture', 'walking'], 'Good first-day energy without overplanning.'),
      idea('lisbon-3', 'Pastel de nata stop', 'Food', 'Must-do', ['food'], 'Simple, iconic, and easy for everyone.'),
      idea('lisbon-4', 'Tile museum', 'Culture', 'Maybe', ['culture'], 'Worth saving if the weather shifts.'),
    ],
  },
  {
    id: 'tulum',
    title: 'Tulum Reset',
    subtitle: 'Warm, slow, visual, and built around a real reset.',
    heroImage: img.coast,
    tags: ['beach', 'relax', 'warm', 'couple'],
    pace: 'Relaxed',
    companionType: 'Couple',
    ideas: [
      idea('tulum-1', 'Beach morning', 'Beach', 'Must-do', ['beach', 'relax'], 'Protect one slow morning.'),
      idea('tulum-2', 'Cenote swim', 'Adventure', 'Must-do', ['nature'], 'A memorable anchor without making the trip busy.'),
      idea('tulum-3', 'Dinner by the water', 'Food', 'Maybe', ['food'], 'Keep this as an easy night option.'),
    ],
  },
  {
    id: 'nyc',
    title: 'NYC Food Crawl',
    subtitle: 'Markets, late bites, and one clean weekend plan.',
    heroImage: img.food,
    tags: ['food', 'city', 'friends', 'nightlife'],
    pace: 'Packed',
    companionType: 'Friends',
    ideas: [
      idea('nyc-1', 'Dinner reservation', 'Food', 'Must-do', ['food'], 'The anchor worth booking first.'),
      idea('nyc-2', 'Neighborhood bakery', 'Food', 'Maybe', ['food'], 'Low-effort morning win.'),
      idea('nyc-3', 'Late jazz bar', 'Nightlife', 'Maybe', ['music'], 'Only if the group still has energy.'),
    ],
  },
];

const screenshotPlans = [
  {
    id: '01-home',
    headline: 'Save every trip idea',
    subhead: 'Collect links, notes, places, and moments before they disappear.',
    action: async () => {},
  },
  {
    id: '02-trip',
    headline: 'Shape real options',
    subhead: 'See the mood, anchors, pace, and what makes a trip worth taking.',
    action: async (page) => {
      await page.getByText('Trips', { exact: true }).click();
      await page.getByText('Trip Ideas', { exact: true }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(500);
      const tulumTitle = await page.getByText('Tulum Reset', { exact: true }).nth(1).boundingBox();
      if (!tulumTitle) throw new Error('Could not locate the Tulum trip card.');
      await page.mouse.click(tulumTitle.x + tulumTitle.width / 2, Math.max(120, tulumTitle.y - 135));
      await page.getByText('Back to Trip Ideas', { exact: true }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(700);
    },
  },
  {
    id: '03-compare',
    headline: 'Compare without overthinking',
    subhead: 'Choose between your strongest trip drafts with private or shared input.',
    action: async (page) => {
      await page.getByText('Compare', { exact: true }).click();
      await page.waitForTimeout(700);
    },
  },
  {
    id: '04-plan',
    headline: 'Know what to do next',
    subhead: 'Move the winning trip into dates, tasks, and a simple plan.',
    action: async (page) => {
      await page.getByText('Plan', { exact: true }).click();
      await page.waitForTimeout(700);
    },
  },
];

async function seed(page) {
  await page.addInitScript(({ trips }) => {
    window.localStorage.setItem('gowandr:hasSeenOnboarding', 'true');
    window.localStorage.setItem('gowandr:tripDrafts', JSON.stringify(trips));
    window.localStorage.setItem('gowandr:ownedMatchupSessionIds', JSON.stringify([]));
    window.localStorage.setItem('gowandr:comparisonReadCounts', JSON.stringify({}));
  }, { trips });
}

async function captureRawScreens(browser, device) {
  const rawScreens = [];
  const rawDir = device === 'tablet' ? rawTabletDir : rawPhoneDir;
  const viewport = device === 'tablet' ? { width: 1024, height: 1366 } : { width: 430, height: 932 };

  for (const plan of screenshotPlans) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: device === 'phone' });
    await seed(page);
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    await plan.action(page);
    const file = path.join(rawDir, `${plan.id}.png`);
    await page.screenshot({ path: file, fullPage: false });
    rawScreens.push({ ...plan, file });
    await page.close();
  }
  return rawScreens;
}

async function renderPng(browser, html, file, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: file, fullPage: false });
  await page.close();
}

function imageData(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

function screenshotHtml(screen, mode) {
  const shot = imageData(screen.file);
  const isIpad = mode === 'ipad';
  const width = isIpad ? 2048 : 1242;
  const height = isIpad ? 2732 : 2688;
  const brandTop = isIpad ? 122 : 90;
  const copyTop = isIpad ? 286 : 226;
  const phoneLeft = isIpad ? 438 : 186;
  const phoneTop = isIpad ? 760 : 760;
  const phoneWidth = isIpad ? 1172 : 870;
  const phoneHeight = isIpad ? 1840 : 1770;
  const radius = isIpad ? 82 : 88;
  const titleSize = isIpad ? 132 : 108;
  const bodySize = isIpad ? 47 : 42;

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
          background:
            radial-gradient(circle at 82% 13%, rgba(255,255,255,0.78) 0 15%, transparent 16%),
            radial-gradient(circle at 8% 88%, rgba(110,216,181,0.30) 0 18%, transparent 19%),
            linear-gradient(160deg, #E4F8F0 0%, #F8FAF9 55%, #D5F5EB 100%);
          color: #202623;
        }
        .brand {
          position: absolute;
          left: ${isIpad ? 124 : 90}px;
          top: ${brandTop}px;
          height: ${isIpad ? 104 : 86}px;
        }
        .copy {
          position: absolute;
          left: ${isIpad ? 124 : 90}px;
          right: ${isIpad ? 124 : 90}px;
          top: ${copyTop}px;
        }
        .kicker {
          color: #137D68;
          font-weight: 800;
          font-size: ${isIpad ? 40 : 34}px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        h1 {
          margin: ${isIpad ? 26 : 22}px 0 0;
          max-width: ${isIpad ? 1550 : 1040}px;
          font-size: ${titleSize}px;
          line-height: 0.96;
          letter-spacing: 0;
        }
        p {
          margin: ${isIpad ? 34 : 28}px 0 0;
          max-width: ${isIpad ? 1320 : 980}px;
          color: rgba(32,38,35,0.70);
          font-size: ${bodySize}px;
          line-height: 1.27;
          font-weight: 650;
        }
        .deviceShadow {
          position: absolute;
          left: ${phoneLeft - 8}px;
          top: ${phoneTop + 24}px;
          width: ${phoneWidth + 16}px;
          height: ${phoneHeight}px;
          border-radius: ${radius + 12}px;
          background: rgba(15,17,21,0.16);
          filter: blur(30px);
        }
        .device {
          position: absolute;
          left: ${phoneLeft}px;
          top: ${phoneTop}px;
          width: ${phoneWidth}px;
          height: ${phoneHeight}px;
          padding: ${isIpad ? 22 : 20}px;
          border-radius: ${radius}px;
          background: #10241F;
          box-shadow: inset 0 0 0 4px rgba(255,255,255,0.16);
          overflow: hidden;
        }
        .screen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          border-radius: ${radius - 22}px;
          display: block;
        }
      </style>
    </head>
    <body>
      <img class="brand" src="${img.logo}" />
      <section class="copy">
        <div class="kicker">GoWandr</div>
        <h1>${screen.headline}</h1>
        <p>${screen.subhead}</p>
      </section>
      <div class="deviceShadow"></div>
      <div class="device"><img class="screen" src="${shot}" /></div>
    </body>
  </html>`;
}

async function main() {
  const iphoneDir = path.join(outDir, 'iphone-6-5');
  const ipadDir = path.join(outDir, 'ipad-13');
  fs.mkdirSync(iphoneDir, { recursive: true });
  fs.mkdirSync(ipadDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const phoneScreens = await captureRawScreens(browser, 'phone');
  const tabletScreens = await captureRawScreens(browser, 'tablet');

  for (const screen of phoneScreens) {
    await renderPng(
      browser,
      screenshotHtml(screen, 'iphone'),
      path.join(iphoneDir, `${screen.id}-${slug(screen.headline)}-1242x2688.png`),
      { width: 1242, height: 2688 },
    );
  }

  for (const screen of tabletScreens) {
    await renderPng(
      browser,
      screenshotHtml(screen, 'ipad'),
      path.join(ipadDir, `${screen.id}-${slug(screen.headline)}-2048x2732.png`),
      { width: 2048, height: 2732 },
    );
  }

  await browser.close();
  console.log(`Generated App Store assets in ${outDir}`);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
