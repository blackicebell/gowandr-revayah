import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'assets', 'store', 'google-play');
const rawDir = path.join(outDir, 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const baseUrl = process.env.PLAY_SCREENSHOT_BASE_URL ?? 'http://localhost:8082';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function dataUri(relativePath, mime = 'image/jpeg') {
  const file = fs.readFileSync(path.join(root, relativePath));
  return `data:${mime};base64,${file.toString('base64')}`;
}

const img = {
  coast: dataUri('assets/starter/coast.jpg'),
  city: dataUri('assets/starter/city.jpg'),
  food: dataUri('assets/starter/food.jpg'),
  island: dataUri('assets/starter/island.jpg'),
  outdoors: dataUri('assets/starter/outdoors.jpg'),
  nightOut: dataUri('assets/starter/night-out.jpg'),
  logo: dataUri('assets/brand/gowandr-logo-full-color.png', 'image/png'),
  icon: dataUri('assets/brand/gowandr-logo-icon-color.png', 'image/png'),
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
    subhead: 'Turn scattered links and notes into calm trip drafts.',
    action: async (page) => {},
  },
  {
    id: '02-trip',
    headline: 'Shape the option',
    subhead: 'See the mood, anchors, pace, and next best step.',
    action: async (page) => {
      await page.getByText('Trips', { exact: true }).click();
      await page.getByText('Trip Ideas', { exact: true }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(500);
      await page.getByText('Tulum Reset', { exact: true }).nth(1).click();
      await page.getByText('Back to Trip Ideas', { exact: true }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(700);
    },
  },
  {
    id: '03-compare',
    headline: 'Compare without overthinking',
    subhead: 'Choose between real options with private or shared input.',
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

async function captureRawScreens(browser) {
  const rawScreens = [];
  for (const plan of screenshotPlans) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
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

function screenshotHtml(screen) {
  const shot = imageData(screen.file);
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          width: 1080px;
          height: 1920px;
          overflow: hidden;
          font-family: Inter, Arial, sans-serif;
          background:
            radial-gradient(circle at 82% 12%, rgba(255,255,255,0.72) 0 16%, transparent 17%),
            radial-gradient(circle at 8% 86%, rgba(110,216,181,0.30) 0 19%, transparent 20%),
            linear-gradient(160deg, #E4F8F0 0%, #F8FAF9 54%, #D5F5EB 100%);
          color: #202623;
        }
        .brand {
          position: absolute;
          left: 76px;
          top: 70px;
          height: 68px;
        }
        .copy {
          position: absolute;
          left: 76px;
          right: 76px;
          top: 184px;
        }
        .kicker {
          color: #137D68;
          font-weight: 800;
          font-size: 27px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        h1 {
          margin: 17px 0 0;
          max-width: 850px;
          font-size: 78px;
          line-height: 0.96;
          letter-spacing: -1px;
        }
        p {
          margin: 22px 0 0;
          max-width: 740px;
          color: rgba(32,38,35,0.70);
          font-size: 31px;
          line-height: 1.28;
          font-weight: 600;
        }
        .phoneShadow {
          position: absolute;
          left: 164px;
          top: 565px;
          width: 752px;
          height: 1324px;
          border-radius: 76px;
          background: rgba(15,17,21,0.16);
          filter: blur(22px);
          transform: translateY(18px);
        }
        .phone {
          position: absolute;
          left: 170px;
          top: 550px;
          width: 740px;
          height: 1320px;
          padding: 18px;
          border-radius: 74px;
          background: #10241F;
          box-shadow: inset 0 0 0 3px rgba(255,255,255,0.16);
          overflow: hidden;
        }
        .screen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          border-radius: 56px;
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
      <div class="phoneShadow"></div>
      <div class="phone"><img class="screen" src="${shot}" /></div>
    </body>
  </html>`;
}

function featureHtml() {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          width: 1024px;
          height: 500px;
          overflow: hidden;
          font-family: Inter, Arial, sans-serif;
          background:
            linear-gradient(90deg, rgba(12,31,27,0.50), rgba(12,31,27,0.08)),
            url("${img.coast}") center/cover no-repeat;
          color: #fff;
        }
        .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,20,17,0.68), rgba(8,20,17,0.14)); }
        .logo {
          position: absolute;
          left: 64px;
          top: 58px;
          width: 236px;
          padding: 13px 19px;
          border-radius: 26px;
          background: rgba(255,255,255,0.94);
        }
        .copy { position: absolute; left: 64px; top: 170px; width: 565px; }
        h1 { margin: 0; font-size: 62px; line-height: 0.96; letter-spacing: -1px; }
        p { margin: 20px 0 0; color: rgba(255,255,255,0.88); font-size: 24px; line-height: 1.24; font-weight: 600; }
        .pill {
          position: absolute;
          right: 58px;
          bottom: 52px;
          border-radius: 999px;
          padding: 17px 24px;
          background: #A8F0D4;
          color: #173A33;
          font-size: 20px;
          font-weight: 800;
        }
      </style>
    </head>
    <body>
      <div class="shade"></div>
      <img class="logo" src="${img.logo}" />
      <section class="copy">
        <h1>Choose the trip worth taking.</h1>
        <p>Save ideas, compare options, and turn the winner into a simple plan.</p>
      </section>
      <div class="pill">Collect. Compare. Commit.</div>
    </body>
  </html>`;
}

function iconHtml() {
  return `<!doctype html>
  <html>
    <head>
      <style>
        body { margin: 0; width: 512px; height: 512px; background: #F8F4EC; display: grid; place-items: center; }
        .tile { width: 512px; height: 512px; display: grid; place-items: center; background: linear-gradient(145deg, #A8F0D4, #F8F4EC 58%, #DFF7EF); }
        img { width: 390px; height: 390px; object-fit: contain; }
      </style>
    </head>
    <body><div class="tile"><img src="${img.icon}" /></div></body>
  </html>`;
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const rawScreens = await captureRawScreens(browser);

  await renderPng(browser, iconHtml(), path.join(outDir, 'app-icon-512.png'), { width: 512, height: 512 });
  await renderPng(browser, featureHtml(), path.join(outDir, 'feature-graphic-1024x500.png'), { width: 1024, height: 500 });

  for (const screen of rawScreens) {
    await renderPng(
      browser,
      screenshotHtml(screen),
      path.join(outDir, `${screen.id}-${slug(screen.headline)}-1080x1920.png`),
      { width: 1080, height: 1920 },
    );
  }

  await browser.close();
  console.log(`Generated Google Play assets in ${outDir}`);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
