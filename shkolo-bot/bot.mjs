// Shkolo daily digest: logs into shkolo.bg as the parent, reads the pages that
// matter (grades, absences, homework, remarks, messages), works out what is new
// since the last run, and sends a short update to Telegram.
//
// It deliberately does not depend on Shkolo's HTML structure: it reads each
// page's visible text and diffs it line by line, so small redesigns of the
// site don't break it. An optional Claude step turns the raw diff into a
// readable Bulgarian summary.
//
//   node --env-file=.env bot.mjs            normal daily run
//   node --env-file=.env bot.mjs --login    open a browser, log in by hand once
//   node --env-file=.env bot.mjs --discover list the links found after login
//   node --env-file=.env bot.mjs --dry-run  print the digest, don't send or save

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(here, 'profile');
const STATE_DIR = path.join(here, 'state');
const SNAPSHOT_FILE = path.join(STATE_DIR, 'snapshot.json');

const args = new Set(process.argv.slice(2));
const MODE_LOGIN = args.has('--login');
const MODE_DISCOVER = args.has('--discover');
const DRY_RUN = args.has('--dry-run');

const env = process.env;
const BASE_URL = (env.SHKOLO_BASE_URL || 'https://app.shkolo.bg').replace(/\/$/, '');
const CHILD_NAME = (env.CHILD_NAME || '').trim();
const HEADFUL = MODE_LOGIN || env.HEADFUL === '1';

// Link texts (Bulgarian) of the Shkolo sections worth reading every day.
const SECTION_KEYWORDS = [
  'оценки', 'отсъств', 'домашн', 'отзив', 'забележ', 'похвал',
  'съобщен', 'известия', 'събити', 'изпит', 'контролн', 'дневник',
];
const MAX_AUTO_PAGES = 10;

// ---------------------------------------------------------------- browser

async function openBrowser() {
  // A persistent profile keeps the Shkolo session cookie and the Cloudflare
  // clearance between runs, so we rarely have to log in again.
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !HEADFUL,
    executablePath: env.CHROMIUM_PATH || undefined,
    locale: 'bg-BG',
    timezoneId: 'Europe/Sofia',
    viewport: { width: 1280, height: 900 },
  });
}

async function waitPastCloudflare(page) {
  for (let i = 0; i < 30; i++) {
    const title = await page.title().catch(() => '');
    if (!/just a moment|момент/i.test(title)) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(
    'Stuck on the Cloudflare check. Run `npm run login` once in a visible browser, then retry.',
  );
}

async function hasPasswordField(page) {
  return (await page.locator('input[type="password"]:visible').count()) > 0;
}

async function ensureLoggedIn(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitPastCloudflare(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!(await hasPasswordField(page))) return;

  if (!env.SHKOLO_USER || !env.SHKOLO_PASS) {
    throw new Error('Not logged in and SHKOLO_USER / SHKOLO_PASS are not set in .env.');
  }
  const user = page
    .locator('input[type="email"]:visible, input[name*="user" i]:visible, input[name*="email" i]:visible, input[type="text"]:visible')
    .first();
  await user.fill(env.SHKOLO_USER);
  await page.locator('input[type="password"]:visible').first().fill(env.SHKOLO_PASS);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.locator('input[type="password"]:visible').first().press('Enter'),
  ]);
  await page.waitForTimeout(2000);
  await waitPastCloudflare(page);
  if (await hasPasswordField(page)) {
    throw new Error(
      'Login failed (wrong password, captcha or 2FA?). Run `npm run login` and log in by hand.',
    );
  }
}

async function selectChild(page) {
  // Parent accounts with several children show a child switcher. If a name is
  // configured and visible as a link/button, click it; otherwise carry on.
  if (!CHILD_NAME) return;
  const target = page.getByRole('link', { name: CHILD_NAME }).or(
    page.getByRole('button', { name: CHILD_NAME }),
  );
  if ((await target.count()) > 0) {
    await target.first().click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}

async function discoverSections(page) {
  const links = await page.$$eval('a[href]', (as) =>
    as.map((a) => ({ text: (a.innerText || a.title || '').trim(), href: a.href })),
  );
  const seen = new Set();
  const out = [];
  for (const { text, href } of links) {
    if (!href.startsWith('http') || href.includes('logout') || seen.has(href)) continue;
    seen.add(href);
    out.push({ text: text.replace(/\s+/g, ' '), href });
  }
  return out;
}

function pickSections(links) {
  if (env.SHKOLO_PAGES) {
    return env.SHKOLO_PAGES.split(',').map((s) => s.trim()).filter(Boolean)
      .map((href) => ({ text: href, href: new URL(href, BASE_URL).href }));
  }
  const origin = new URL(BASE_URL).origin;
  const picked = links.filter(
    (l) => l.href.startsWith(origin) &&
      SECTION_KEYWORDS.some((k) => l.text.toLowerCase().includes(k)),
  );
  return picked.slice(0, MAX_AUTO_PAGES);
}

async function readPageText(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitPastCloudflare(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  const text = await page.evaluate(() => {
    const main = document.querySelector('main, [role="main"], .page-content, #content, .content');
    return (main || document.body).innerText;
  });
  return normalizeLines(text);
}

// ---------------------------------------------------------------- diffing

function normalizeLines(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  return [...new Set(lines)];
}

async function loadSnapshot() {
  try {
    return JSON.parse(await fs.readFile(SNAPSHOT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function saveSnapshot(snapshot) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

function diffSections(current, previous) {
  const changes = [];
  for (const [title, lines] of Object.entries(current)) {
    const before = new Set(previous?.[title] ?? []);
    const added = lines.filter((l) => !before.has(l));
    if (added.length) changes.push({ title, added });
  }
  return changes;
}

// ---------------------------------------------------------------- digest

function rawDigest(changes, firstRun) {
  const head = firstRun
    ? `📚 Shkolo: първо четене${CHILD_NAME ? ` за ${CHILD_NAME}` : ''} (текущо състояние)`
    : `📚 Shkolo: ново днес${CHILD_NAME ? ` за ${CHILD_NAME}` : ''}`;
  const body = changes
    .map((c) => `\n▶ ${c.title}\n` + c.added.slice(0, 40).map((l) => `• ${l}`).join('\n'))
    .join('\n');
  return head + '\n' + body;
}

async function claudeDigest(changes, firstRun) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const today = new Date().toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia' });
  const material = changes
    .map((c) => `## ${c.title}\n${c.added.join('\n')}`)
    .join('\n\n');

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system:
      'You write a short daily school update for a parent, in Bulgarian, as a Telegram message ' +
      '(plain text, emoji allowed, no Markdown tables). The input is text scraped from the ' +
      'Shkolo e-diary: lines that are new since yesterday, grouped by page. It may include menu ' +
      'labels and other noise; ignore anything that is not about the child\'s school life. ' +
      'Lead with anything needing the parent\'s attention (low grades, absences, remarks, ' +
      'deadlines, messages from teachers), then new grades, homework and upcoming tests/events. ' +
      'Keep it under 15 lines. Never invent facts; if a line is ambiguous, quote it. ' +
      'If nothing meaningful is new, say so in one line.',
    messages: [
      {
        role: 'user',
        content:
          `Date: ${today}. Child: ${CHILD_NAME || '(not specified)'}.\n` +
          (firstRun
            ? 'This is the first run, so this is the full current state; summarise the most recent items only.\n\n'
            : 'New lines since the last update:\n\n') +
          material,
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new Error('Claude declined to summarise.');
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new Error('Claude returned an empty summary.');
  return `📚 Shkolo${CHILD_NAME ? ` · ${CHILD_NAME}` : ''} · ${today}\n\n${text}`;
}

// ---------------------------------------------------------------- telegram

async function sendTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set.');
  // Telegram caps a message at 4096 characters.
  for (let i = 0; i < text.length; i += 4000) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(i, i + 4000) }),
    });
    if (!res.ok) throw new Error(`Telegram error ${res.status}: ${await res.text()}`);
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const context = await openBrowser();
  const page = context.pages()[0] ?? (await context.newPage());
  try {
    if (MODE_LOGIN) {
      await page.goto(BASE_URL);
      console.log('Log in to Shkolo in the opened window, then close the window.');
      await new Promise((resolve) => context.on('close', resolve));
      console.log('Session saved in ./profile. You can now run `npm run dry-run`.');
      return;
    }

    await ensureLoggedIn(page);
    await selectChild(page);
    const links = await discoverSections(page);

    if (MODE_DISCOVER) {
      for (const l of links) console.log(`${l.text || '(no text)'}\n    ${l.href}`);
      console.log(`\nPut the ones you want in SHKOLO_PAGES (comma-separated) in .env.`);
      return;
    }

    const sections = pickSections(links);
    if (!sections.length) {
      throw new Error('No Shkolo sections found. Run `npm run discover` and set SHKOLO_PAGES.');
    }

    const current = {};
    for (const s of sections) {
      const title = s.text && s.text !== s.href ? s.text : new URL(s.href).pathname;
      current[title] = await readPageText(page, s.href);
    }

    const previous = await loadSnapshot();
    const changes = diffSections(current, previous?.sections);
    const firstRun = !previous;

    let message;
    if (!changes.length) {
      if (env.QUIET_WHEN_NOTHING_NEW === '1') {
        console.log('Nothing new; staying quiet.');
      } else {
        message = `📚 Shkolo${CHILD_NAME ? ` · ${CHILD_NAME}` : ''}: нищо ново днес 🙂`;
      }
    } else if (env.ANTHROPIC_API_KEY) {
      try {
        message = await claudeDigest(changes, firstRun);
      } catch (err) {
        console.error('Claude summary failed, sending raw changes instead:', err.message);
        message = rawDigest(changes, firstRun);
      }
    } else {
      message = rawDigest(changes, firstRun);
    }

    if (DRY_RUN) {
      console.log(message ?? '(no message)');
      return;
    }
    if (message) await sendTelegram(message);
    await saveSnapshot({ takenAt: new Date().toISOString(), sections: current });
    console.log('Done.');
  } catch (err) {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await page.screenshot({ path: path.join(STATE_DIR, 'last-error.png'), fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch(async (err) => {
  console.error('shkolo-bot failed:', err.message);
  // Tell the parent the bot is broken rather than failing silently.
  if (!DRY_RUN && !MODE_LOGIN && !MODE_DISCOVER && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    await sendTelegram(`⚠️ Shkolo бот: не успях да прочета Shkolo днес.\n${err.message}`).catch(() => {});
  }
  process.exit(1);
});
