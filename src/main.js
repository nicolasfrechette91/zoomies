// Zoomies, starring Ranchy. App controller: screens, loop, saving, audio unlock.
import { View } from './view.js';
import { startLoop } from './loop.js';
import { Laser, PointerInput } from './input.js';
import { Game } from './game.js';
import { LEVELS, MENU_SCENE } from './levels.js';
import { UI } from './ui.js';
import { Save } from './storage.js';
import { sfx } from './audio.js';
import { ROOM_W, ROOM_H } from './room.js';
import { rand, clamp } from './util.js';

Save.load(LEVELS.length);
const params = new URLSearchParams(location.search);
if (params.has('unlock')) {
  Save.data.unlocked = LEVELS.length;
  Save.write();
}
sfx.muted = !!Save.data.muted;

const canvas = document.getElementById('game');
const view = new View(canvas);
const laser = new Laser();
const input = new PointerInput(canvas, view, laser);

/** The self-playing laser that keeps Ranchy busy behind the menus. */
class DemoLaser extends Laser {
  constructor() {
    super();
    this.t = 0;
    this.wp = { x: 180, y: 320 };
    this.hold = 0;
    this.phase = 'on';
    this.phaseT = 6;
  }
  tick(dt, cat) {
    this.t += dt;
    this.phaseT -= dt;
    if (this.phaseT <= 0) {
      this.phase = this.phase === 'on' ? 'off' : 'on';
      this.phaseT = this.phase === 'on' ? rand(6, 9) : rand(6, 10);
    }
    if (this.phase === 'off') {
      this.set(false);
    } else {
      this.hold -= dt;
      if (this.hold <= 0) {
        this.hold = rand(0.6, 1.8);
        // dart somewhere not too far from the cat
        this.wp = {
          x: clamp(cat.x + rand(-170, 170), 30, ROOM_W - 30),
          y: clamp(cat.y + rand(-220, 220), 40, ROOM_H - 40),
        };
      }
      const nx = this.on ? this.x + (this.wp.x - this.x) * Math.min(1, dt * 4) : this.wp.x;
      const ny = this.on ? this.y + (this.wp.y - this.y) * Math.min(1, dt * 4) : this.wp.y;
      this.set(true, nx, ny);
    }
    this.update(dt);
  }
}

const demoLaser = new DemoLaser();
let demo = new Game(MENU_SCENE, -1, { demo: true });
let game = null;
let screen = 'title';
let creditsReturn = 'title';
let paused = false;
let needsRender = true;

const hooks = {
  time: (t, frozen) => ui.setTime(t, frozen),
  score: (s, k, n) => ui.setScore(s, k, n),
  combo: (m, f, bumped) => ui.setCombo(m, f, bumped),
  toast: (text, kind) => ui.toast(text, kind),
  end: (res) => onLevelEnd(res),
};

const ui = new UI(onAction);
ui.setMuted(sfx.muted);

function setScreen(name) {
  screen = name;
  ui.show(name);
  input.setEnabled(name === 'play');
  needsRender = true;
}

function disposeGame() {
  if (game) game.dispose();
  game = null;
}

/** The menu cat may be belly-up and purring; that purr must not follow us into a room. */
function quietMenuCat() {
  sfx.purr(false);
  demo.purring = false;
}

function openLevel(i) {
  disposeGame();
  quietMenuCat();
  game = new Game(LEVELS[i], i, { hooks });
  ui.showIntro(LEVELS[i], i, game.thresholds);
  ui.resetHud(game.items.length);
  setScreen('intro');
}

function startLevel(i) {
  disposeGame();
  quietMenuCat();
  game = new Game(LEVELS[i], i, { hooks });
  ui.resetHud(game.items.length);
  game.start();
  paused = false;
  setScreen('play');
}

function onLevelEnd(res) {
  const info = Save.record(res.levelIndex, res.stars, res.score, res.knocked, LEVELS.length);
  ui.showResults(res, info, LEVELS);
  setScreen('results');
}

function pause() {
  if (screen !== 'play' || !game || !game.playing) return;
  paused = true;
  sfx.purr(false);
  sfx.vacuumLevel(0);
  setScreen('pause');
}

function resume() {
  paused = false;
  setScreen('play');
}

function onAction(action, el) {
  switch (action) {
    case 'play':
      // first time ever: straight into the kitchen
      if (Save.data.unlocked === 1 && !Save.stars(0) && !Save.data.plays) openLevel(0);
      else {
        ui.buildLevels(LEVELS);
        setScreen('levels');
      }
      break;
    case 'title':
      disposeGame();
      setScreen('title');
      break;
    case 'levels':
      disposeGame();
      paused = false;
      ui.buildLevels(LEVELS);
      setScreen('levels');
      break;
    case 'level':
      openLevel(Number(el.dataset.level));
      break;
    case 'go':
      if (game) {
        game.start();
        paused = false;
        setScreen('play');
      }
      break;
    case 'pause':
      pause();
      break;
    case 'resume':
      resume();
      break;
    case 'retry':
      if (game) startLevel(game.index);
      break;
    case 'next':
      if (game && game.index + 1 < LEVELS.length) openLevel(game.index + 1);
      break;
    case 'credits':
      creditsReturn = screen === 'results' ? 'levels' : screen;
      if (screen === 'results') disposeGame();
      ui.showCredits(LEVELS);
      Save.data.seenCredits = true;
      Save.write();
      setScreen('credits');
      break;
    case 'credits-back':
      if (creditsReturn === 'levels') ui.buildLevels(LEVELS);
      setScreen(creditsReturn === 'credits' ? 'title' : creditsReturn);
      break;
    case 'mute': {
      const m = !sfx.muted;
      sfx.setMuted(m);
      Save.setMuted(m);
      ui.setMuted(m);
      if (!m) sfx.click();
      break;
    }
  }
}

// Audio may only start after a user gesture.
const unlock = () => sfx.unlock();
['pointerdown', 'touchend', 'keydown', 'click'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

// Keyboard niceties on desktop
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p') {
    if (screen === 'play') pause();
    else if (screen === 'pause') resume();
  } else if (e.key === 'm') onAction('mute');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    sfx.suspend();
  } else {
    sfx.resume();
    loop.reset();
  }
});

let resizeQueued = false;
const onResize = () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    view.resize();
    needsRender = true;
    const landscapePhone = window.innerWidth > window.innerHeight && window.innerHeight < 500 && matchMedia('(pointer: coarse)').matches;
    if (landscapePhone) pause();
  });
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

const turbo = Math.max(1, Math.min(8, Number(params.get('turbo')) || 1)); // debug: simulate faster

const loop = startLoop((dt) => {
  const inLevel = game && (screen === 'play' || screen === 'intro' || screen === 'results' || screen === 'pause');
  if (inLevel) {
    if (screen === 'play' && !paused) {
      for (let k = 0; k < turbo && game; k++) {
        laser.update(dt);
        game.update(dt, laser);
      }
      needsRender = true;
    } else if (screen === 'intro' || screen === 'results') {
      game.update(dt, null);
      needsRender = true;
    }
    if (needsRender) game.render(view, laser);
  } else {
    demoLaser.tick(dt, demo.cat);
    demo.update(dt, demoLaser);
    demo.render(view, demoLaser);
  }
  needsRender = false;
  ui.frame(dt);
});

// Deep links for testing: ?level=3 jumps straight to that room's intro.
if (params.has('level')) {
  const i = clamp(Number(params.get('level')) - 1, 0, LEVELS.length - 1);
  if (i < Save.data.unlocked) openLevel(i);
  else setScreen('title');
} else {
  setScreen('title');
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// handy for debugging from the console
window.zoomies = { get game() { return game; }, get demo() { return demo; }, laser, view, Save, LEVELS, startLevel, openLevel };
