# Shkolo daily digest bot

Logs into [Shkolo](https://app.shkolo.bg) with your parent account once a day,
reads your son's grades, absences, homework, remarks and messages, works out
what's **new since yesterday**, and sends you a short Telegram message.

This is a standalone tool. It is not part of the Zdravey app and isn't bundled
into it.

```
📚 Shkolo · Иван · 29.09.2026

⚠️ Нова оценка: Английски 4 (контролна)
📝 Домашно: Математика, задачи 1–5, до петък
✅ Няма отсъствия днес
```

## How it works

Shkolo has no public API, so the bot drives a real (headless) Chromium browser:

1. It logs in with your username and password. The browser profile is saved in
   `./profile`, so the session and the Cloudflare check survive between runs.
2. It finds the sections to read from the menu (links such as *Оценки*,
   *Отсъствия*, *Домашни*, *Отзиви*, *Съобщения*, *Събития*), or reads the
   pages you list in `SHKOLO_PAGES`.
3. It reads each page's visible text and compares it line by line with the
   last run (`./state/snapshot.json`). Because it doesn't depend on Shkolo's
   HTML structure, small site redesigns don't break it.
4. It sends you what changed:
   - **without** an Anthropic key: a plain list of the new lines;
   - **with** `ANTHROPIC_API_KEY`: a short summary in Bulgarian written by
     Claude, with anything that needs your attention (low grades, absences,
     remarks, teacher messages) at the top.
5. If something breaks (for example, the password changed), you get a ⚠️
   message instead of silence. A screenshot is saved to `state/last-error.png`.

## Setup (about 10 minutes)

You need Node.js 20.6 or newer, on a computer that's on every day: your laptop,
a home PC, a Raspberry Pi or a small VPS. It has to run from a normal home or
office connection, because Shkolo sits behind Cloudflare, which tends to block
cloud and CI servers such as GitHub Actions.

```bash
cd shkolo-bot
npm install
npx playwright install chromium
cp .env.example .env        # then edit .env
```

### 1. Telegram bot

1. In Telegram, open **@BotFather**, send `/newbot` and follow the prompts.
   Put the token in `TELEGRAM_BOT_TOKEN`.
2. Send any message to your new bot. Then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy the
   number from `"chat":{"id": …}` into `TELEGRAM_CHAT_ID`.

### 2. Shkolo login

Put your parent login in `SHKOLO_USER` and `SHKOLO_PASS`, and your son's name
(as Shkolo shows it) in `CHILD_NAME`. Then check it works:

```bash
npm run dry-run     # logs in and prints the digest without sending it
```

If the login needs a captcha or a code, or you normally log in with
Google/Facebook, log in by hand once. The session is saved and reused:

```bash
npm run login       # opens a browser window; log in, then close the window
```

If the digest reads the wrong pages, list what the bot can see and pick pages
yourself:

```bash
npm run discover    # prints every link found after login
# then in .env:
# SHKOLO_PAGES=https://app.shkolo.bg/...,https://app.shkolo.bg/...
```

### 3. Optional: Claude summary

Set `ANTHROPIC_API_KEY` (from <https://console.anthropic.com>) to get a written
summary instead of the raw list. Only the **changed text** from Shkolo is sent
to the Anthropic API. If the call fails, the bot sends the raw list instead.
Each daily call costs a fraction of a cent.

### 4. Run it every day

Send the first real message now. The first run describes the current state;
after that you only get what's new.

```bash
npm start
```

**macOS / Linux**: `crontab -e`, then add this line to run at 18:30 every
weekday:

```
30 18 * * 1-5 cd /path/to/shkolo-bot && /usr/bin/env node --env-file=.env bot.mjs >> state/cron.log 2>&1
```

(Use the full path from `which node` if cron can't find `node`.)

**Windows**: open Task Scheduler, choose *Create Basic Task*, then *Daily*.
Set the program to `node`, the arguments to `--env-file=.env bot.mjs`, and
*Start in* to the `shkolo-bot` folder.

Set `QUIET_WHEN_NOTHING_NEW=1` if you don't want the "нищо ново днес" message
on quiet days.

## Privacy

- `.env` (your password), `profile/` (the login session) and `state/` (the
  snapshot of your son's school data) stay on your computer and are
  git-ignored. Don't commit them.
- The bot only talks to Shkolo, Telegram and, if you set a key, the Anthropic
  API.
- It uses your own parent account to read your own child's data, the same as
  opening the site yourself. Keep the schedule to once or twice a day.
