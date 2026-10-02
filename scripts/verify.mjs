// Automated check of The Little Weather Wizard.
//   npm run build && npm run verify          (checks the single-file build in dist/)
//   npm run verify -- --dev                  (checks the source index.html via the dev server)
// Taps the island with a real (simulated) finger, checks every weather reaction, the three
// wishes, the rainbow picnic, reset and the layout on phone / tablet / desktop sizes.
// Screenshots land in verify-shots/.
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { mkdirSync, existsSync } from 'node:fs';

const useDev = process.argv.includes('--dev') || !existsSync('dist/index.html');
const server = useDev ? await createServer({ server: { port: 5199 }, logLevel: 'error' }) : await preview({ preview: { port: 5199 }, logLevel: 'error' });
if (useDev) await server.listen();
const URL = 'http://localhost:5199/';
mkdirSync('verify-shots', { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });

async function open(w, h, touch) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__wizard);
  await sleep(600);
  return { ctx, page, errors };
}

// ---------------- full play-through on a phone ----------------
// Conditions are polled (not timed) so the check also works with slow software rendering.
{
  const { ctx, page, errors } = await open(390, 844, true);
  const W = (fn, arg) => page.evaluate(fn, arg);
  const until = async (fn, arg, timeout = 15000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 100 }); return true; } catch { return false; } };
  const tap = async (x, y) => { await page.touchscreen.tap(x, y); await sleep(150); };
  const tapButton = async (kind) => { const b = await page.locator(`.wx[data-kind="${kind}"]`).boundingBox(); await tap(b.x + b.width / 2, b.y + b.height / 2); };
  const tapObj = async (expr) => { const p = await W(`window.__wizard.screen(${expr})`); await tap(p.x, p.y); return p; };
  const tapGround = async (x, z) => { const p = await W(`window.__wizard.screenOfGround(${x}, ${z})`); await tap(p.x, p.y); };

  check('animated hand demonstrates the first wish', await until(() => +getComputedStyle(document.getElementById('hand')).opacity > 0.5));
  await sleep(900);
  await page.screenshot({ path: 'verify-shots/01-phone-start-with-hand.png' });
  check('first wish is "help a flower bloom": sun button hinted, flower highlighted', await W(() => window.__wizard.wishes.index === 0 && document.querySelector('.wx[data-kind="sun"]').classList.contains('hint')));

  // RAIN: flowers grow, puddles appear
  await tapButton('rain');
  check('tapping the hand away + rain picture button selects rain', await W(() => document.querySelector('.wx[data-kind="rain"]').classList.contains('selected') && +getComputedStyle(document.getElementById('hand')).opacity < 0.5));
  const g0 = await W(() => window.__wizard.flowers[2].growth);
  await tapObj('window.__wizard.flowers[2]');
  check('rain makes a flower grow', await until((g) => window.__wizard.flowers[2].growth === g + 1, g0));
  check('raindrops fall from a little cloud', await W(() => window.__wizard.particleCount() > 0));
  await page.screenshot({ path: 'verify-shots/02-rain-on-flower.png' });
  await tapGround(-0.2, 2.2);
  check('rain makes puddles appear', await until(() => window.__wizard.patches.some((p) => p.kind === 'puddle')));
  check('rain gives the bunny a leaf umbrella', await W(() => window.__wizard.bunny.umbrella.userData.s.t === 1));

  // SUN: puddles sparkle (and slowly dry), blossoms open -> wish 1
  await tapButton('sun');
  const before = await W(() => window.__wizard.patches.filter((p) => p.kind === 'puddle').map((p) => p.spring.t));
  await tapGround(-0.2, 2.2);
  const after = await W(() => window.__wizard.patches.filter((p) => p.kind === 'puddle').map((p) => ({ t: p.spring.t, s: p.sparkle })));
  check('sunshine makes puddles sparkle', after.some((p) => p.s > 0));
  check('sunshine starts drying puddles (reversible)', after.length > 0 && after[0].t < before[0]);
  await page.screenshot({ path: 'verify-shots/03-sun-sparkles-puddle.png' });
  const wf = await W(() => window.__wizard.flowers.indexOf(window.__wizard.wishes.flower));
  check('wish flower starts as a closed bud', await W((i) => window.__wizard.flowers[i].bloomT < 0.5, wf));
  await tapObj(`window.__wizard.flowers[${wf}]`);
  check('sunshine opens blossoms', await until((i) => window.__wizard.flowers[i].bloom > 0.8, wf));
  await page.screenshot({ path: 'verify-shots/04-sun-opens-flower.png' });
  check('wish 1 (help a flower bloom) completes', await until(() => window.__wizard.wishes.done[0] === true));
  check('wish 2 (spin the pinwheel) is offered next', await until(() => window.__wizard.wishes.index === 1 && document.querySelector('.wx[data-kind="wind"]').classList.contains('hint')));

  // WIND: pinwheel spins, leaves fly -> wish 2
  await tapButton('wind');
  await tapObj('window.__wizard.pinwheel');
  const speed = await W(() => window.__wizard.pinwheel.speed);
  check('wind spins the pinwheel', speed > 8, `speed ${speed.toFixed(1)} rad/s`);
  check('wind carries leaves', await W(() => window.__wizard.particleCount() > 10));
  await page.screenshot({ path: 'verify-shots/05-wind-pinwheel-leaves.png' });
  check('wish 2 completes, wish 3 (snow friend) offered', await until(() => window.__wizard.wishes.done[1] === true && window.__wizard.wishes.index === 2));

  // SNOW: tree hat, snow friend -> wish 3 -> rainbow picnic
  await tapButton('snow');
  await tapObj('window.__wizard.tree');
  check('snow gives the tree a fluffy hat', await until(() => window.__wizard.tree.cap.group.scale.x > 0.4));
  await tapObj('window.__wizard.snowFriend');
  check('snow builds a tiny snow friend', await until(() => window.__wizard.snowFriend.level >= 3));
  await sleep(600);
  await page.screenshot({ path: 'verify-shots/06-snow-friend.png' });
  check('completing all three wishes makes a rainbow picnic', await until(() => window.__wizard.picnic.shown));
  await sleep(2500);
  await page.screenshot({ path: 'verify-shots/07-rainbow-picnic.png' });
  check('new wishes are offered after the picnic', await until(() => window.__wizard.wishes.round === 1 && window.__wizard.wishes.index === 0 && window.__wizard.wishes.done.every((d) => !d), undefined, 20000));

  // Reversibility: sunshine melts hats and the snow friend
  await tapButton('sun');
  await tapObj('window.__wizard.tree');
  check('sunshine melts the tree hat', await until(() => window.__wizard.tree.cap.level < 0.5));
  await tapObj('window.__wizard.snowFriend');
  check('sunshine gently melts the snow friend', await until(() => window.__wizard.snowFriend.level === 0));
  await tapObj('window.__wizard.bunny');
  check('sunshine folds the bunny umbrella away', await W(() => window.__wizard.bunny.umbrella.userData.s.t === 0), JSON.stringify(await W(() => window.__wizard.lastWeather())));

  // more reversibility: snow tucks a grown flower down, wind carries tree blossoms away
  await tapButton('snow');
  await tapObj('window.__wizard.flowers[2]');
  check('snow tucks a rain-grown flower back down a size', await W(() => window.__wizard.flowers[2].growth === 0));
  await tapButton('sun');
  await tapObj('window.__wizard.flowers[2]');
  check('sunshine melts the flower snow hat', await W(() => window.__wizard.flowers[2].cap.level === 0));
  await tapButton('rain');
  await tapObj('window.__wizard.tree');
  check('rain gives the tree blossoms', await W(() => window.__wizard.tree.blossomCount > 0));
  await tapButton('wind');
  await tapObj('window.__wizard.tree');
  check('wind carries the blossoms away', await W(() => window.__wizard.tree.blossomCount === 0));

  // free play: lots of taps, nothing breaks
  for (const k of ['rain', 'sun', 'wind', 'snow']) { await tapButton(k); for (let i = 0; i < 4; i++) await tapGround(Math.random() * 10 - 5, Math.random() * 10 - 5); }
  await sleep(500);
  await page.screenshot({ path: 'verify-shots/08-free-play.png' });
  check('free play: island stays busy and happy', await W(() => window.__wizard.patches.length > 0));

  // RESET
  const r = await page.locator('#reset').boundingBox();
  await tap(r.x + r.width / 2, r.y + r.height / 2);
  const ok = await until(() => { const w = window.__wizard; return w.flowers.every((f) => f.growth === 0) && w.patches.length === 0 && !w.picnic.shown && w.snowFriend.level === 0 && w.tree.cap.level === 0 && w.bushes.every((b) => b.cap.level === 0); });
  check('reset island restores everything', ok, ok ? '' : JSON.stringify(await W(() => ({ p: window.__wizard.patches.length, sf: window.__wizard.snowFriend.level }))));
  await sleep(800);
  await page.screenshot({ path: 'verify-shots/09-after-reset.png' });

  // mute + calm motion toggles
  const s = await page.locator('#sound').boundingBox(); await tap(s.x + s.width / 2, s.y + s.height / 2);
  const m = await page.locator('#motion').boundingBox(); await tap(m.x + m.width / 2, m.y + m.height / 2);
  check('mute toggles', await W(() => window.__wizard.settings.muted === true && document.getElementById('sound').getAttribute('aria-pressed') === 'true'));
  check('reduced motion toggles', await W(() => window.__wizard.settings.calm === true && document.body.classList.contains('calm')));
  check('no visible words on screen', await W(() => document.body.innerText.trim() === ''));
  check('no errors or warnings in the console', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------------- layouts ----------------
for (const [name, w, h, touch] of [['phone-small', 320, 568, true], ['phone', 390, 844, true], ['phone-landscape', 844, 390, true], ['tablet', 820, 1180, true], ['tablet-landscape', 1180, 820, true], ['desktop', 1440, 900, false]]) {
  const { ctx, page, errors } = await open(w, h, touch);
  const res = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.wx, #reset, #sound, #motion, #wish')].map((e) => ({ id: e.id || e.dataset.kind, r: e.getBoundingClientRect() }));
    const inView = els.every(({ r }) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight);
    const big = els.filter((e) => ['sun', 'rain', 'wind', 'snow', 'reset'].includes(e.id)).every(({ r }) => r.width >= 56 && r.height >= 56);
    let overlap = false;
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i].r, b = els[j].r; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlap = true; }
    const ring = Array.from({ length: 24 }, (_, i) => window.__wizard.screenOfGround(Math.cos(i / 24 * Math.PI * 2) * 7.3, Math.sin(i / 24 * Math.PI * 2) * 7.3));
    const islandIn = ring.every((p) => p.x >= 0 && p.x <= innerWidth && p.y >= 0 && p.y <= innerHeight);
    const xs = ring.map((p) => p.x); const islandW = (Math.max(...xs) - Math.min(...xs)) / innerWidth;
    return { inView, big, overlap, islandIn, islandW, scroll: document.documentElement.scrollWidth > innerWidth };
  });
  check(`${name} ${w}x${h}: buttons on screen, big, not overlapping`, res.inView && res.big && !res.overlap, JSON.stringify({ inView: res.inView, big: res.big, overlap: res.overlap }));
  check(`${name} ${w}x${h}: whole island visible (${Math.round(res.islandW * 100)}% of width), no scrolling`, res.islandIn && !res.scroll);
  check(`${name}: no console errors`, errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: `verify-shots/layout-${name}.png` });
  await ctx.close();
}

await browser.close();
await (server.close ? server.close() : server.httpServer.close());
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${useDev ? ' (dev server)' : ' (single-file build)'}`);
process.exit(failed ? 1 : 0);
