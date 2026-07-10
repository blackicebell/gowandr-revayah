import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.GOWANDR_RECORDING_URL ?? 'http://localhost:8098';
const OUT_DIR = path.resolve('screen-recordings', 'gowandr-intro');
const VIEWPORT = { width: 390, height: 844 };

const asset = (name) => `${BASE_URL}/assets/?unstable_path=.%2Fassets%2Fstarter/${name}`;

const cityImages = {
  london: asset('city.jpg'),
  tokyo: asset('night-out.jpg'),
  lagos: asset('food.jpg'),
};

function demoTrips({ finalPlan = false } = {}) {
  return [
    {
      id: 'trip-london',
      title: 'London Long Weekend',
      subtitle: 'Markets, museums, and cozy neighborhood wandering with friends.',
      heroImage: cityImages.london,
      tags: ['food', 'culture', 'city'],
      pace: 'Balanced',
      companionType: 'Friends',
      finalPlan,
      planStartDate: finalPlan ? '2026-09-10' : undefined,
      planEndDate: finalPlan ? '2026-09-14' : undefined,
      latestMatchupResult: finalPlan
        ? {
            matchupName: 'First big city trip',
            groupMatch: 87,
            summary: 'London won because it has the clearest food, culture, and logistics path right now.',
            decidedAt: '2026-06-30T12:00:00.000Z',
          }
        : undefined,
      planChecklist: finalPlan
        ? [
            { id: 'lon-check-1', title: 'Confirm everyone can do September 10-14', done: true, category: 'Logistics' },
            { id: 'lon-check-2', title: 'Compare flights into Heathrow and Gatwick', done: false, category: 'Logistics' },
            { id: 'lon-check-3', title: 'Pick a neighborhood for the stay', done: false, category: 'Reservations' },
            { id: 'lon-check-4', title: 'Save dinner options near Shoreditch', done: false, category: 'Reservations' },
          ]
        : undefined,
      ideas: [
        {
          id: 'idea-london-1',
          title: 'Borough Market food crawl',
          note: 'Start with lunch, then walk toward the river.',
          link: 'https://www.tiktok.com/@visitlondon/video/7355555555555555555',
          category: 'Food',
          tags: ['Food', 'Culture'],
          priority: 'Must-do',
        },
        {
          id: 'idea-london-2',
          title: 'Late afternoon at Tate Modern',
          note: 'Good anchor before dinner.',
          link: 'https://www.instagram.com/reel/C7LondonWeekend/',
          category: 'Culture',
          tags: ['Culture'],
          priority: 'Must-do',
        },
        {
          id: 'idea-london-3',
          title: 'Sunday roast spot',
          note: 'Need one proper cozy meal.',
          link: 'https://maps.google.com/?q=London+Sunday+roast',
          category: 'Food',
          tags: ['Food'],
          priority: 'Maybe',
        },
      ],
    },
    {
      id: 'trip-tokyo',
      title: 'Tokyo Food Nights',
      subtitle: 'Neon dinners, tiny bars, and one relaxed day for temples.',
      heroImage: cityImages.tokyo,
      tags: ['food', 'nightlife', 'culture'],
      pace: 'Packed',
      companionType: 'Couple',
      ideas: [
        {
          id: 'idea-tokyo-1',
          title: 'Shinjuku ramen crawl',
          note: 'The save that started the Tokyo idea.',
          link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Food',
          tags: ['Food', 'Nightlife'],
          priority: 'Must-do',
          imageUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        },
        {
          id: 'idea-tokyo-2',
          title: 'Golden Gai night walk',
          note: 'Keep it slow and curious.',
          link: 'https://www.instagram.com/reel/C7TokyoNights/',
          category: 'Nightlife',
          tags: ['Nightlife'],
          priority: 'Must-do',
        },
        {
          id: 'idea-tokyo-3',
          title: 'Meiji Shrine reset',
          note: 'Quiet morning before a busy food night.',
          link: 'https://www.japan.travel/en/spot/1030/',
          category: 'Culture',
          tags: ['Culture', 'Relax'],
          priority: 'Maybe',
        },
      ],
    },
    {
      id: 'trip-lagos',
      title: 'Lagos, Nigeria Escape',
      subtitle: 'Beach clubs, food, art, and a trip that feels alive.',
      heroImage: cityImages.lagos,
      tags: ['food', 'beach', 'culture'],
      pace: 'Balanced',
      companionType: 'Friends',
      ideas: [
        {
          id: 'idea-lagos-1',
          title: 'Nike Art Gallery afternoon',
          note: 'A culture anchor before dinner.',
          link: 'https://www.instagram.com/reel/C7LagosArt/',
          category: 'Culture',
          tags: ['Culture'],
          priority: 'Must-do',
        },
        {
          id: 'idea-lagos-2',
          title: 'Tarkwa Bay beach day',
          note: 'Make this the slow day.',
          link: 'https://www.tiktok.com/@lagostravel/video/7344444444444444444',
          category: 'Beach',
          tags: ['Beach', 'Relax'],
          priority: 'Must-do',
        },
        {
          id: 'idea-lagos-3',
          title: 'Jollof and live music night',
          note: 'Ask locals for the right spot when dates are real.',
          link: '',
          category: 'Food',
          tags: ['Food', 'Nightlife'],
          priority: 'Maybe',
        },
      ],
    },
  ];
}

async function prepareOutput() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function createPage(browser, name, trips = demoTrips()) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
  await context.addInitScript(({ seededTrips }) => {
    window.localStorage.setItem('gowandr:hasSeenOnboarding', 'true');
    window.localStorage.setItem('gowandr:tripDrafts', JSON.stringify(seededTrips));
    window.localStorage.setItem('gowandr:ownedMatchupSessionIds', '[]');
    window.localStorage.setItem('gowandr:comparisonReadCounts', '{}');
  }, { seededTrips: trips });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  return { context, page, name };
}

async function hideBottomNav(page) {
  await page.evaluate(() => {
    const hideNav = () => {
      for (const node of Array.from(document.querySelectorAll('div'))) {
        const text = node.innerText?.replace(/\s+/g, ' ').trim();
        if (text !== 'Home Trips Compare Plan') continue;

        let target = node;
        for (let index = 0; index < 4 && target.parentElement; index += 1) {
          const rect = target.parentElement.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.45 || rect.height > 140) break;
          target = target.parentElement;
        }

        const rect = target.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.45) {
          target.style.display = 'none';
          target.style.pointerEvents = 'none';
        }
      }
    };

    hideNav();
    window.setInterval(hideNav, 250);
  });
}

async function finishRecording(recording) {
  const video = recording.page.video();
  await recording.page.waitForTimeout(500);
  await recording.context.close();
  if (!video) return;
  await video.saveAs(path.join(OUT_DIR, `${recording.name}.webm`));
  const rawPath = await video.path().catch(() => undefined);
  if (rawPath && path.basename(rawPath).startsWith('page@')) {
    await fs.unlink(rawPath).catch(() => undefined);
  }
}

async function tap(page, text, options = {}) {
  const { after, ...locatorOptions } = options;
  await page.getByText(text, locatorOptions).first().click();
  await page.waitForTimeout(options.after ?? 650);
}

async function tapIfVisible(page, text, options = {}) {
  const { after, ...locatorOptions } = options;
  const locator = page.getByText(text, locatorOptions).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click();
  await page.waitForTimeout(after ?? 350);
  return true;
}

async function tapMatch(page, pattern, after = 650) {
  await page.getByText(pattern).first().click();
  await page.waitForTimeout(after);
}

async function typeInto(page, index, value, delay = 20) {
  const input = page.locator('input, textarea').nth(index);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay });
  await page.waitForTimeout(350);
}

async function openOrganizeStep(page) {
  const nextOrganize = page.getByText('Next: Organize it').first();
  if (await nextOrganize.isVisible().catch(() => false)) {
    await nextOrganize.click();
    await page.waitForTimeout(650);
  }

  const favorite = page.getByText('Favorite', { exact: true }).first();
  if (!(await favorite.isVisible().catch(() => false))) {
    const organizeHeader = page.getByText('Organize it', { exact: true }).first();
    if (await organizeHeader.isVisible().catch(() => false)) {
      await organizeHeader.click();
      await page.waitForTimeout(500);
    }
  }

  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(250);
}

async function saveLinkIdea(page, { title, link, note, category, tag }) {
  await page.evaluate((value) => navigator.clipboard.writeText(value), link).catch(() => undefined);
  await tap(page, 'Paste here', { after: 900 });

  const linkInput = page.locator('input, textarea').first();
  const currentLink = await linkInput.inputValue().catch(() => '');
  if (!currentLink) {
    await typeInto(page, 0, link, 10);
  }

  const nextLabel = page.getByText('Next: Add a quick label').first();
  if (await nextLabel.isVisible().catch(() => false)) {
    await nextLabel.click();
    await page.waitForTimeout(650);
  }
  await typeInto(page, 0, title, 24);
  await typeInto(page, 1, note, 12);
  await openOrganizeStep(page);
  await tapIfVisible(page, category, { exact: true, after: 250 });
  await tapIfVisible(page, 'Favorite', { exact: true, after: 250 });
  if (tag) await tapIfVisible(page, tag, { exact: true, after: 250 });
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(300);
  await tap(page, 'Save Inspiration', { after: 1100 });
}

async function saveNoteIdea(page, { title, note, category, tag }) {
  await tap(page, 'Note', { after: 600 });
  await typeInto(page, 0, title, 24);
  await typeInto(page, 1, note, 12);
  await openOrganizeStep(page);
  await tapIfVisible(page, category, { exact: true, after: 250 });
  await tapIfVisible(page, 'Favorite', { exact: true, after: 250 });
  if (tag) await tapIfVisible(page, tag, { exact: true, after: 250 });
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(300);
  await tap(page, 'Save Inspiration', { after: 1100 });
}

async function recordHomeReveal(browser) {
  const recording = await createPage(browser, '01-home-reveal');
  await hideBottomNav(recording.page);
  await recording.page.waitForTimeout(1400);
  await recording.page.mouse.wheel(0, 150);
  await recording.page.waitForTimeout(1200);
  await recording.page.mouse.wheel(0, -110);
  await recording.page.waitForTimeout(1100);
  await finishRecording(recording);
}

async function recordLondonTikTok(browser) {
  const recording = await createPage(browser, '02-add-london-tiktok', demoTrips().filter((trip) => trip.id === 'trip-london'));
  await tap(recording.page, 'Add Inspiration');
  await saveLinkIdea(recording.page, {
    title: 'Camden coffee and market walk',
    link: 'https://www.tiktok.com/@londonfood/video/7355555555555555555',
    note: 'A casual first afternoon before dinner.',
    category: 'Food',
    tag: 'Food',
  });
  await recording.page.mouse.wheel(0, 420);
  await recording.page.waitForTimeout(1000);
  await finishRecording(recording);
}

async function recordTokyoYouTube(browser) {
  const recording = await createPage(browser, '03-add-tokyo-youtube', demoTrips().filter((trip) => trip.id === 'trip-tokyo'));
  await tap(recording.page, 'Add Inspiration');
  await saveLinkIdea(recording.page, {
    title: 'Tsukiji breakfast guide',
    link: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    note: 'Start early, eat slowly, then leave the afternoon open.',
    category: 'Food',
    tag: 'Food',
  });
  await recording.page.waitForTimeout(1000);
  await finishRecording(recording);
}

async function recordLagosNote(browser) {
  const recording = await createPage(browser, '04-add-lagos-note', demoTrips().filter((trip) => trip.id === 'trip-lagos'));
  await tap(recording.page, 'Add Inspiration');
  await saveNoteIdea(recording.page, {
    title: 'Ask Chidi about live music in Victoria Island',
    note: 'This came from the group chat. Save it before it disappears.',
    category: 'Nightlife',
    tag: 'Nightlife',
  });
  await recording.page.waitForTimeout(1000);
  await finishRecording(recording);
}

async function recordTripDetail(browser) {
  const recording = await createPage(browser, '05-trip-detail-saved-inspiration');
  await tap(recording.page, 'Trips', { exact: true });
  await tap(recording.page, 'Lagos, Nigeria Escape');
  await recording.page.waitForTimeout(700);
  await tap(recording.page, 'Explore');
  await recording.page.waitForTimeout(900);
  await recording.page.mouse.wheel(0, 520);
  await recording.page.waitForTimeout(1100);
  await finishRecording(recording);
}

async function recordCompare(browser) {
  const recording = await createPage(browser, '06-compare-decision-flow');
  await tap(recording.page, 'Compare', { exact: true });
  await recording.page.waitForTimeout(900);
  await tapMatch(recording.page, /Continue/, 900);
  await recording.page.waitForTimeout(700);
  await tap(recording.page, 'Start', { after: 900 });
  await recording.page.waitForTimeout(700);
  await tap(recording.page, 'Begin', { after: 900 });
  await recording.page.waitForTimeout(700);
  await tap(recording.page, 'Start comparison', { after: 900 });
  await recording.page.waitForTimeout(500);
  await tap(recording.page, 'London Long Weekend', { after: 800 });
  await typeInto(recording.page, 0, 'It feels easiest to make real first.', 16);
  await tapIfVisible(recording.page, "I'm in", { exact: true, after: 450 });
  await recording.page.waitForTimeout(1000);
  await finishRecording(recording);
}

async function recordPlan(browser) {
  const recording = await createPage(browser, '07-plan-next-step', demoTrips({ finalPlan: true }));
  await tap(recording.page, 'Plan', { exact: true });
  await hideBottomNav(recording.page);
  await recording.page.waitForTimeout(900);
  await recording.page.mouse.wheel(0, 260);
  await recording.page.waitForTimeout(1400);
  await recording.page.mouse.wheel(0, -120);
  await recording.page.waitForTimeout(900);
  await finishRecording(recording);
}

async function main() {
  await prepareOutput();
  const browser = await chromium.launch({ headless: true });
  const selected = new Set(process.argv.slice(2));
  const shouldRecord = (clip) => selected.size === 0 || selected.has(clip);
  try {
    if (shouldRecord('1') || shouldRecord('01')) await recordHomeReveal(browser);
    if (shouldRecord('2') || shouldRecord('02')) await recordLondonTikTok(browser);
    if (shouldRecord('3') || shouldRecord('03')) await recordTokyoYouTube(browser);
    if (shouldRecord('4') || shouldRecord('04')) await recordLagosNote(browser);
    if (shouldRecord('5') || shouldRecord('05')) await recordTripDetail(browser);
    if (shouldRecord('6') || shouldRecord('06')) await recordCompare(browser);
    if (shouldRecord('7') || shouldRecord('07')) await recordPlan(browser);
  } finally {
    await browser.close();
  }

  const files = (await fs.readdir(OUT_DIR)).filter((file) => /^\d{2}-.*\.webm$/.test(file)).sort();
  console.log(`Recorded ${files.length} clips to ${OUT_DIR}`);
  for (const file of files) console.log(file);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
