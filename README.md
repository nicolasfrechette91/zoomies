# Zoomies, starring Ranchy

A tiny, cozy, mobile-first browser game made with love for Fanny.

Drag your finger and a red laser dot appears. Ranchy, an orange-and-white cat, chases it through
the apartment and knocks everything off the counters before Fanny gets home. Combos, treats,
cardboard boxes, sleepy sunbeams, a robot vacuum and one very suspicious cucumber are all included.

It's plain HTML, CSS and JavaScript (Canvas 2D). There's no framework, no build step and no network
requests. All the art is drawn in code and every sound is made with the Web Audio API.

## Play it locally

Because the game uses ES modules, it has to be served over HTTP (opening `index.html` from the file system won't work).
From the repository folder, run either of these:

```bash
python3 -m http.server 8000
```

```bash
npx serve .
```

Then open <http://localhost:8000>. To try it on your phone, open `http://<your-computer's-ip>:8000` while
both are on the same Wi-Fi.

## Deploy to GitHub Pages

1. Push to the `main` branch.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute the game is live at `https://<user>.github.io/zoomies/`.

All paths are relative, so it works from that sub-folder as-is. On the phone, use **Share → Add to Home Screen**
(iOS) or **Install app** (Android) and it opens fullscreen like a real app. It keeps working offline after the first visit.

## Add the credits photo

Put a photo of Fanny and Ranchy at `assets/photo.jpg` and commit it. The credits screen picks it up automatically
(a portrait-ish crop around 4:5 looks best). Until then it shows a drawn Ranchy in the polaroid frame.

## How to play

- **Touch and drag** (or click and drag with a mouse) to move the laser. On touch screens the dot floats just
  above your fingertip so you can see it.
- Ranchy chases the dot with a bit of lag and skids around corners on slippery floors. Run him into things on
  tables and shelves, or walk him slowly past them and he'll paw them off himself.
- Hold the dot still in front of him and he wiggles his butt and **pounces**.
- Knock things off in quick succession for a **combo** (up to x5).
- **Treats**: +5 seconds. **Cardboard box**: he sits in it and the clock freezes. **Sunbeam**: he naps and you lose 3 seconds.
- **Robot vacuum**: he bolts if it gets close, but furniture is safe. **Cucumber**: big startled jump, and the combo is lost.
- Leave him alone for a few seconds and he grooms, swishes his tail or flops over belly-up.
- Earn at least one star to unlock the next room. Progress is saved on the device.

## Project layout

```
index.html            page shell, menus and HUD markup
style.css             all styling (safe areas, HUD, menus)
manifest.webmanifest  home-screen / fullscreen app manifest
sw.js                 offline cache (network first, cache fallback)
icons/                app icons (rendered from the same canvas art)
assets/               cat-reference.jpg (reference only, not used in game), photo.jpg (optional, credits)
src/
  main.js       app controller: screens, game loop wiring, audio unlock
  loop.js       requestAnimationFrame loop with delta time
  view.js       canvas sizing, device pixel ratio, safe areas, camera
  input.js      laser pointer (touch + mouse)
  cat.js        Ranchy's AI: chase, drift, pounce, idle animations, reactions
  objects.js    knockable objects and their tabletop/falling physics
  room.js       furniture geometry, surfaces and collision queries
  levels.js     the six handcrafted levels, as data
  hazards.js    robot vacuum and cucumbers
  pickups.js    treats, cardboard boxes, sunbeams
  game.js       rules for one level: timer, score, combos, interactions, drawing order
  particles.js  dust puffs, shards, hearts, floating text, screen shake
  audio.js      synthesized sound effects (Web Audio API) and mute
  ui.js         DOM screens, HUD, results and credits
  storage.js    localStorage save (unlocked rooms, best stars and scores)
  art/          all drawing code: Ranchy, objects, rooms, props
```

## Handy URL flags for testing

- `?unlock` unlocks every room.
- `?level=3` jumps straight to a room's intro (if it's unlocked).

## Notes

- On iPhone, Web Audio follows the ring/silent switch. If there's no sound, flip the switch off silent.
- To reset progress, clear the site's data in the browser settings.
