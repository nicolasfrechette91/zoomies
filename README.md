# Zoomies, starring Ranchy

A tiny, cozy, mobile-first browser game made with love for Fanny.

Drag your finger and a red laser dot appears. Ranchy, an orange-and-white cat, chases it through
the apartment and knocks everything off the counters before Fanny gets home. Combos, treats,
cardboard boxes, sleepy sunbeams, a robot vacuum and one very suspicious cucumber are all included.

It's plain HTML, CSS and JavaScript (Canvas 2D). There's no framework, no build step and nothing is
loaded from other sites. All the game art is drawn in code and every sound is made with the Web Audio API.

## Play it locally

The game uses ES modules, so it has to be served over HTTP (opening `index.html` from the file system won't work).
From the repository folder, run either of these:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

```bash
npx serve .
```

Then open <http://localhost:3000>.

To try it on your phone, open the same address with your computer's IP instead of `localhost`
(for example `http://192.168.1.20:8000`) while both are on the same Wi-Fi.

## Deploy to GitHub Pages

The game is live at **<https://nicolasfrechette91.github.io/zoomies/>**.

GitHub Pages serves the `main` branch (**Settings → Pages → Deploy from a branch → `main`, `/ (root)`**),
so getting a change live is just: push to `main` and wait a minute or two. All paths are relative, so the
`/zoomies/` sub-folder works as-is.

On the phone, open the link and use **Share → Add to Home Screen** (iPhone) or **Install app** (Android).
It opens full-screen like a real app and keeps working offline after the first visit.

## The credits photo

The credits show two polaroids side by side: the real Ranchy (`assets/ranchy-real.jpg`) and the drawn,
in-game Ranchy.

To use a photo of Fanny and Ranchy instead, add it as `assets/photo.jpg` and push. It replaces the
real-Ranchy photo and the caption changes from "Real Ranchy ♥" to "Fanny & Ranchy ♥"; the drawn Ranchy
stays. The photo is cropped to fill the frame, so a portrait shot around 4:5 works best. Until that file
exists, a 404 for `photo.jpg` in the browser console is expected.

## How to play

- **Touch and drag** (or click and drag with a mouse) to move the laser. On touch screens the dot floats just
  above your fingertip so you can see it.
- Ranchy chases the dot with a bit of lag and skids around corners on wood and tile (rugs and carpet are grippy).
  Run him into things on counters and shelves, or walk him slowly past them and he'll paw them off himself.
- Hold the dot still a little way in front of him and he wiggles his butt and **pounces**. Hold it right under
  his nose and he bats at it.
- You have **60 seconds** before Fanny gets home. Things still falling when the time runs out still count.
- Knock things off within about 2 seconds of each other for a **combo**: each one scores its value times the
  combo, up to **x5**.
- Knock *everything* off and Fanny comes home early: **+25 points for every second left**.
- If something lands on lower furniture, like a chair, instead of the floor, it's still in play. Knock it off again.
- **Treats**: +5 seconds. **Cardboard box**: he hops in and the clock stops for about 7 seconds (each box works once).
  **Sunbeam**: he naps and you lose 3 seconds.
- **Robot vacuum**: he bolts if it gets close while he's on the floor, but furniture is safe. It pauses while the
  clock is stopped.
- **Cucumbers** pop up now and then and vanish after 8 seconds. If he gets close: big startled jump, and your
  combo is lost.
- Leave him alone for about 3 seconds and he grooms, swishes his tail or flops over belly-up.
- Each room has three star targets (shown on its intro card). Earn at least one star to unlock the next room.
  Progress is saved on the device, and stars and best scores never go down.

## The rooms

Six rooms, unlocked in order, with up to three stars each: **18 stars** in all.

1. **Kitchen**: Kitchen Counter Crimes (the laser and treats)
2. **Living room**: Coffee Table Chaos (sunbeams and cardboard boxes)
3. **Bedroom**: Bedtime Rebellion (the robot vacuum)
4. **Study**: Bookshelf Heist (cucumbers)
5. **Dining room**: Dinner Party Disaster (the vacuum and cucumbers together)
6. **The whole apartment**: Total Zoomies (everything at once)

## Handy URL flags for testing

- `?unlock` unlocks every room, and saves that, so they stay unlocked afterwards.
- `?level=3` jumps straight to that room's intro (1 to 6), if it's unlocked. Combine them: `?unlock&level=6`.
- `?turbo=4` (debug) runs a room faster: the game updates that many times per frame while you play, so Ranchy,
  the clock and everything else in the room go 4 times as fast. Use 1 to 8; menus and intro cards stay normal.

## Tuning

- **Star targets**: each room's `stars: [a, b, c]` in `src/levels.js`. They're multiples of the room's total
  object value (the sum of each object's `value`, set per type in `ITEM_TYPES` in `src/objects.js`).
  `src/game.js` turns them into points: total × multiple, rounded to the nearest 25. The Kitchen's objects are
  worth 1,325, so `[0.45, 1.2, 3.0]` gives 600 / 1,600 / 3,975.
- **Ranchy's speed and chase feel**: the constants at the top of `src/cat.js`: `MAX_SPEED` (top running speed),
  `ACCEL` (how quickly he gets going), `BRAKE` (how quickly he stops), `CAT_MASS` (how hard he shoves things)
  and `CAT_R` (his size). How closely he follows the dot, how fast he turns and when he pounces are in
  `Cat.update()` in the same file. How much he skids comes from floor grip in `gripAt()` in `src/room.js`.
- **Combos**: `COMBO_WINDOW` (seconds between knocks) and `MAX_MULT` (top multiplier) in `src/game.js`.
- **Getting changes live**: push to `main` (see [Deploy to GitHub Pages](#deploy-to-github-pages)).

## Project layout

```
index.html            page shell, menus and HUD markup
style.css             all styling (safe areas, HUD, menus)
manifest.webmanifest  home-screen / fullscreen app manifest
sw.js                 offline support (network first, cache fallback)
icons/                browser and home-screen icons
assets/
  ranchy-real.jpg     the real Ranchy for the credits (cropped from cat-reference.jpg)
  cat-reference.jpg   reference photo only, not used in the game
  photo.jpg           optional: Fanny & Ranchy, replaces ranchy-real.jpg in the credits
src/
  main.js       app controller: screens, game loop wiring, audio unlock, URL flags
  loop.js       requestAnimationFrame loop with delta time
  view.js       canvas sizing, device pixel ratio, safe areas, camera
  input.js      laser pointer (touch + mouse)
  cat.js        Ranchy's AI: chase, drift, pounce, idle animations, reactions
  objects.js    knockable objects: types, values, tabletop and falling physics
  room.js       furniture geometry, surfaces and collision
  levels.js     the six rooms as data (plus the scene behind the menus)
  hazards.js    robot vacuum and cucumbers
  pickups.js    treats, cardboard boxes, sunbeams
  game.js       rules for one room: timer, score, combos, star targets, interactions, drawing order
  particles.js  dust puffs, shards, hearts, floating text, screen shake
  audio.js      synthesized sound effects (Web Audio API) and mute
  ui.js         DOM screens, HUD, results and credits
  storage.js    progress saved in localStorage (unlocked rooms, stars, best scores, mute)
  util.js       small math, random and easing helpers
  art/          all drawing code: Ranchy, objects, rooms, props
```

## Notes

- On iPhone, Web Audio follows the ring/silent switch. If there's no sound, flip the switch off silent.
- To reset progress, clear the site's data in the browser settings.
- After a deploy, the update shows on the next launch: the service worker always tries the network first and
  only falls back to its cached copy when offline.
