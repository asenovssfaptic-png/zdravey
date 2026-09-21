import { chromium } from 'playwright';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--ignore-certificate-errors'],
});

for (const [label, vp] of [['desktop', { width: 1400, height: 900 }],
                           ['phone', { width: 390, height: 820 }]]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const bad = [], tiles = [];
  p.on('console', m => { if (m.type() === 'error') bad.push(m.text()); });
  p.on('pageerror', e => bad.push('PAGEERROR ' + e.message));
  p.on('response', r => { if (r.url().includes('/tiles/')) tiles.push(r.status()); });

  await p.goto('http://127.0.0.1:8811/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(5500);

  const m = await p.evaluate(() => ({
    mapH: document.getElementById('map').clientHeight,
    mapW: document.getElementById('map').clientWidth,
    tilesLoaded: document.querySelectorAll('.leaflet-tile-loaded').length,
    vectorPaths: document.querySelectorAll('#map path').length,
    sitesInList: document.querySelectorAll('.sitebtn').length,
    layerToggles: document.querySelectorAll('.layer').length,
    statOsmKm: document.getElementById('st-osm') && document.getElementById('st-osm').textContent,
    statDetKm: document.getElementById('st-det') && document.getElementById('st-det').textContent,
    firstSite: (document.querySelector('.sitebtn .nm') || {}).innerText,
    perfTableRows: document.querySelectorAll('#perfbody table.m tr').length,
    bodyScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  console.log(label, JSON.stringify(m));
  console.log('  tile responses:', tiles.length, '| non-200:', tiles.filter(s => s !== 200).length);
  console.log('  console errors:', bad.length ? bad.slice(0, 4) : 'none');

  await p.evaluate(() => { const b = document.querySelector('.sitebtn'); if (b) b.click(); });
  await p.waitForTimeout(800);
  console.log('  detail:', JSON.stringify(await p.evaluate(() => ({
    shown: !document.getElementById('detail').hidden,
    heading: (document.querySelector('#detail h2') || {}).textContent,
    coord: (document.querySelector('#detail .coord') || {}).textContent,
    notesMount: !!document.getElementById('notes'),
    notesMsg: (document.querySelector('#notes .note') || {}).textContent,
  }))));
  await ctx.close();
}
await b.close();
