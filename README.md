# The Little Weather Wizard

A gentle, wordless 3D weather toy for a five-year-old. A tiny storybook island has smiling flowers, a pond with a duck, a pinwheel, a sleepy tree with a bird, a bunny and a spot where a snow friend can live. The child picks a weather picture, then taps the island to make that weather in that spot.

Built with **Three.js** and **Vite**. The whole game lives in a single file, `index.html`, and every model, texture and sound is generated in code.

## Run it

```bash
npm install
npm run dev          # opens a dev server; the "Network" URL works on a phone or tablet on the same Wi-Fi
```

Make a single, self-contained file:

```bash
npm run build        # -> dist/index.html (Three.js inlined, no other files, works offline)
npm run preview      # serve the build locally
```

`dist/index.html` can be copied anywhere and opened by double-clicking it, or hosted as one static file.
The source `index.html` also opens directly without Vite. In that case it loads Three.js from a CDN (through an import map), so it needs an internet connection.

## How to play (for grown-ups)

| Picture | Tap a part of the island and… |
|---|---|
| ☀️ Sunshine | buds open into smiling blossoms, puddles sparkle and slowly dry, snow hats and the snow friend melt into sparkles, the sleepy tree wakes and the bird sings, butterflies appear on open grass, the lotus opens, berries appear on the bushes |
| 🌧️ Gentle rain | a smiling cloud rains, flowers grow taller (3 sizes), puddles appear, the tree gets pink blossoms, the bunny opens a leaf umbrella, the duck splashes |
| 🍃 Soft breeze | the pinwheel spins, leaves (and any tree blossoms) are carried across the island, flowers and the tree sway, the bird flies a loop, the duck glides |
| ❄️ Snow | trees, bushes, flowers and the duck get fluffy snow hats, snow patches form, and tapping the pebble ring builds a snow friend (then a scarf and a bobble hat). The bunny gets a cosy scarf, and flowers close up cosily and tuck down a size |

- **Every effect can be undone with another weather:** sun ↔ snow open and close blossoms, and sunshine melts hats, patches and the snow friend. Rain ↔ snow grow flowers and tuck them back down. Sunshine dries puddles, rain melts snow patches, wind carries rain's tree blossoms away, and the pinwheel slows down on its own. The **big pink reset button** (circular arrow around a little island) puts the whole island back the way it started.
- **Wishes** (top-left bubble) are optional and picture-only, offered one at a time: *help a flower bloom* → *spin the pinwheel* → *make a snow friend*. The target glows with a ring and a floating star, and the matching weather button gets a dashed halo. An animated hand demonstrates the first wish. Tapping the wish bubble replays the hand for any wish. Finishing all three makes a **rainbow picnic** (rainbow, blanket, cupcakes, animals gather, confetti), then new wishes are offered. Free play is always available.
- **Sound** button: mute or unmute. **Snail** button: calm motion (fewer particles, slower and smaller movement). Calm motion is on by default when the device asks for reduced motion. Both settings are remembered.

### Design choices for a five-year-old

- No words, numbers, timers, scores or ways to fail. Every tap anywhere (sky and sea included) lands on the island and does something visible straight away.
- One finger only: extra fingers are ignored, and pinch, double-tap zoom and the long-press menu are blocked. Dragging a finger paints weather as it goes.
- Large picture buttons (at least 56 px), generous invisible hit areas around every object, and a 1.9-unit weather radius.
- A fixed camera that fits the island to any screen and keeps it clear of the buttons. In portrait, the buttons sit under the island. On short landscape phones they move to a column on the right.
- The weather is always friendly: smiling clouds and sun, and no thunder, lightning, dark skies or loud sounds. The audio is soft synthesized chimes, patters and whooshes, and only starts after the first tap.
- If a slow device struggles, the game renders fewer pixels so it doesn't stutter.

## Verify

```bash
npx playwright install chromium   # once
npm run build && npm run verify   # checks the single-file build (or: npm run verify -- --dev)
```

`scripts/verify.mjs` drives the game with simulated finger taps on a phone-sized screen. It checks:

- each weather interaction on its target object
- that effects reverse
- all three wishes, the rainbow picnic and the new round
- reset, mute and calm motion
- that no words appear on screen and the console has no errors
- the layout at 320×568, 390×844, 844×390, 820×1180, 1180×820 and 1440×900: buttons on screen, large, not overlapping, whole island visible, no scrolling

Screenshots are saved to `verify-shots/`.
