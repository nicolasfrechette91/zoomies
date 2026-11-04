// DOM screens (title, rooms, intro, pause, results, credits) and the in-game HUD.
import { drawPortrait } from './art/ranchy.js';
import { drawRoom, THEMES } from './art/room.js';
import { drawVacuum, drawCucumber, drawTreat, drawBox, drawSunbeam, drawLaser } from './art/props.js';
import { Room, ROOM_W, ROOM_H, WALL } from './room.js';
import { Save } from './storage.js';
import { sfx } from './audio.js';
import { hashStr } from './util.js';

const $ = (sel) => document.querySelector(sel);

const NEW_THINGS = {
  laser: { name: 'Laser dot', text: 'Touch and drag (or click and drag). Ranchy chases it.' },
  treat: { name: 'Treats', text: '+5 seconds on the clock. Nom.' },
  sunbeam: { name: 'Sunbeam', text: 'Ranchy naps instantly. You lose 3 seconds.' },
  box: { name: 'Cardboard box', text: 'If he fits, he sits. The clock freezes.' },
  vacuum: { name: 'Robot vacuum', text: 'Ranchy bolts if it gets close. Furniture is safe.' },
  cucumber: { name: 'Cucumber', text: 'Big startled jump. Your combo is lost.' },
};

const FLAVOR = [
  'The apartment is suspiciously tidy. Fanny is impressed (and a little worried).',
  'A respectable little mess. Ranchy looks very innocent.',
  'Fanny is going to need a minute. And a broom.',
  'Total catastrophe. Ranchy has never been prouder.',
];

const fmt = (n) => Math.round(n).toLocaleString('en-US');

export class UI {
  constructor(onAction) {
    this.onAction = onAction;
    this.screens = {};
    document.querySelectorAll('.screen').forEach((el) => (this.screens[el.id.replace('screen-', '')] = el));
    this.hud = $('#hud');
    this.el = {
      time: $('#hud-time'),
      timePill: $('#pill-time'),
      score: $('#hud-score'),
      mess: $('#hud-mess'),
      combo: $('#hud-combo'),
      comboX: $('#hud-combo-x'),
      comboBar: $('#hud-combo-bar'),
      toast: $('#hud-toast'),
      mute: $('#btn-mute'),
    };
    this.last = { time: null, frozen: null, score: null, mess: null, combo: null };
    this.toastTimer = 0;
    this.current = null;
    this.portraitT = 0;
    this.titlePortrait = $('#title-portrait');
    this.creditsPortrait = $('#credits-placeholder');
    this.thumbs = new Map();

    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || b.disabled) return;
      sfx.unlock();
      if (b.dataset.action !== 'mute') sfx.click();
      this.onAction(b.dataset.action, b);
    });
    this.setupPortrait(this.titlePortrait);
    this.setupPortrait(this.creditsPortrait);
    this.loadPhoto();
  }

  show(name) {
    for (const k in this.screens) this.screens[k].classList.toggle('active', k === name);
    this.hud.hidden = !(name === 'play' || name === 'pause');
    this.hud.classList.toggle('dim', name === 'pause');
    this.current = name;
  }

  // ------------------------------------------------------------ portraits

  setupPortrait(canvas) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 200 * dpr;
    canvas.height = 220 * dpr;
    canvas._dpr = dpr;
  }

  drawPortraitTo(canvas, t, opts) {
    if (!canvas) return;
    const g = canvas.getContext('2d');
    g.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
    g.clearRect(0, 0, 200, 220);
    drawPortrait(g, t, opts);
  }

  frame(dt) {
    this.portraitT += dt;
    if (this.current === 'title') this.drawPortraitTo(this.titlePortrait, this.portraitT);
    if (this.current === 'credits') this.drawPortraitTo(this.creditsPortrait, this.portraitT, { eyes: Math.sin(this.portraitT * 0.6) > 0.6 ? 'happy' : 'open' });
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
  }

  loadPhoto() {
    const img = new Image();
    img.alt = 'Fanny and Ranchy';
    img.onload = () => {
      this.photoLoaded = true;
      const box = $('#credits-photo');
      box.innerHTML = '';
      box.appendChild(img);
      box.classList.add('has-photo');
      $('#credits-photo-caption').textContent = 'Fanny & Ranchy ♥';
    };
    img.onerror = () => {
      this.photoLoaded = false;
    };
    img.src = 'assets/photo.jpg';
  }

  // ------------------------------------------------------------ level list

  thumb(level) {
    if (this.thumbs.has(level.id)) return this.thumbs.get(level.id);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 54;
    const H = Math.round((W * (ROOM_H + WALL * 2)) / (ROOM_W + WALL * 2));
    const c = document.createElement('canvas');
    c.width = W * dpr;
    c.height = H * dpr;
    c.className = 'thumb';
    const g = c.getContext('2d');
    const s = (W / (ROOM_W + WALL * 2)) * dpr;
    g.setTransform(s, 0, 0, s, WALL * s, WALL * s);
    const room = new Room({ ...level, theme: THEMES[level.theme] });
    drawRoom(g, room, hashStr(level.id));
    this.thumbs.set(level.id, c);
    return c;
  }

  buildLevels(levels) {
    const list = $('#level-list');
    list.innerHTML = '';
    const data = Save.data;
    levels.forEach((lv, i) => {
      const locked = i >= data.unlocked;
      const stars = Save.stars(i);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'level' + (locked ? ' locked' : '');
      b.dataset.action = 'level';
      b.dataset.level = String(i);
      b.disabled = locked;
      b.setAttribute('aria-label', `Level ${i + 1}, ${lv.name}${locked ? ', locked' : `, ${stars} of 3 stars`}`);
      const th = this.thumb(lv).cloneNode(false);
      th.getContext('2d').drawImage(this.thumb(lv), 0, 0);
      b.appendChild(th);
      const txt = document.createElement('span');
      txt.className = 'lv-text';
      const best = Save.best(i);
      txt.innerHTML = `<small>Level ${i + 1} · ${lv.room}</small><b>${lv.name}</b>${best ? `<span class="lv-best">Best ${fmt(best)}</span>` : locked ? '<span class="lv-best">Earn a star in the room before</span>' : '<span class="lv-best">New!</span>'}`;
      b.appendChild(txt);
      const st = document.createElement('span');
      st.className = 'lv-stars';
      if (locked) st.innerHTML = '<svg viewBox="0 0 24 24" class="lock" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none"/></svg>';
      else for (let k = 0; k < 3; k++) st.innerHTML += `<i class="${k < stars ? 'on' : ''}">★</i>`;
      b.appendChild(st);
      li.appendChild(b);
      list.appendChild(li);
    });
    $('#star-count').textContent = `★ ${Save.totalStars()}/${levels.length * 3}`;
  }

  // ------------------------------------------------------------ intro

  icon(kind) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = c.height = 44 * dpr;
    c.className = 'new-icon';
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#f3e3cc';
    g.beginPath();
    g.arc(22, 22, 21, 0, Math.PI * 2);
    g.fill();
    g.translate(22, 22);
    const t = 1.2;
    switch (kind) {
      case 'laser':
        drawLaser(g, { on: true, x: 0, y: 0, trail: [], fade: 1 }, 0.3);
        break;
      case 'treat':
        drawTreat(g, { x: 0, y: 1, z: 0, age: 2 }, t);
        break;
      case 'sunbeam':
        g.scale(0.55, 0.55);
        g.fillStyle = '#e9d6b6';
        g.fillRect(-36, -30, 72, 60);
        drawSunbeam(g, { x: -24, y: -22, w: 40, h: 44, skew: 10 }, t);
        break;
      case 'box':
        g.scale(0.85, 0.85);
        drawBox(g, { x: 0, y: 2, z: 0, used: false, occupied: false }, t);
        break;
      case 'vacuum':
        g.scale(1.05, 1.05);
        drawVacuum(g, { x: 0, y: 0, r: 15, angle: -0.6, brush: 0.5, frozen: false }, t);
        break;
      case 'cucumber':
        drawCucumber(g, { x: 0, y: 0, z: 0, angle: -0.5, appear: 1 }, t);
        break;
    }
    return c;
  }

  showIntro(level, index, thresholds) {
    $('#intro-chip').textContent = `Level ${index + 1} · ${level.room}`;
    $('#intro-title').textContent = level.name;
    $('#intro-text').textContent = level.intro;
    const nl = $('#intro-new');
    nl.innerHTML = '';
    for (const k of level.newThings || []) {
      const info = NEW_THINGS[k];
      const li = document.createElement('li');
      li.appendChild(this.icon(k));
      const s = document.createElement('span');
      s.innerHTML = `<b>${info.name}${k === 'laser' ? '' : ' <em>new!</em>'}</b>${info.text}`;
      li.appendChild(s);
      nl.appendChild(li);
    }
    nl.hidden = !(level.newThings || []).length;
    const tl = $('#intro-tips');
    tl.innerHTML = '';
    for (const tip of level.tips || []) {
      const li = document.createElement('li');
      li.textContent = tip;
      tl.appendChild(li);
    }
    const g = $('#intro-goals');
    g.innerHTML = thresholds.map((th, i) => `<span><i>${'★'.repeat(i + 1)}</i>${fmt(th)}</span>`).join('');
  }

  // ------------------------------------------------------------ hud

  setTime(t, frozen) {
    const s = Math.max(0, Math.ceil(t));
    if (s !== this.last.time) {
      this.last.time = s;
      this.el.time.textContent = s + 's';
      this.el.timePill.classList.toggle('urgent', s <= 10);
      if (s <= 10 && s > 0) {
        this.el.timePill.classList.remove('tick');
        void this.el.timePill.offsetWidth;
        this.el.timePill.classList.add('tick');
      }
    }
    if (frozen !== this.last.frozen) {
      this.last.frozen = frozen;
      this.el.timePill.classList.toggle('frozen', frozen);
    }
  }

  setScore(score, knocked, total) {
    if (score !== this.last.score) {
      const bump = this.last.score !== null && score > this.last.score;
      this.last.score = score;
      this.el.score.textContent = fmt(score);
      if (bump) {
        this.el.score.classList.remove('bump');
        void this.el.score.offsetWidth;
        this.el.score.classList.add('bump');
      }
    }
    const m = `${knocked}/${total} knocked`;
    if (m !== this.last.mess) {
      this.last.mess = m;
      this.el.mess.textContent = m;
    }
  }

  setCombo(mult, frac, bumped) {
    if (mult !== this.last.combo) {
      this.last.combo = mult;
      this.el.combo.classList.toggle('show', mult >= 2);
      if (mult >= 2) {
        this.el.comboX.textContent = 'x' + mult;
        this.el.combo.classList.remove('pop');
        void this.el.combo.offsetWidth;
        this.el.combo.classList.add('pop');
      }
    }
    if (mult >= 2) this.el.comboBar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac)).toFixed(3)})`;
  }

  toast(text, kind = '') {
    const el = this.el.toast;
    el.textContent = text;
    el.className = 'toast show ' + kind;
    this.toastTimer = 2.4;
  }

  resetHud(total) {
    this.last = { time: null, frozen: null, score: null, mess: null, combo: null };
    this.setTime(60, false);
    this.setScore(0, 0, total);
    this.setCombo(0, 0);
    this.el.toast.classList.remove('show');
  }

  setMuted(m) {
    this.el.mute.classList.toggle('muted', m);
    this.el.mute.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    this.el.mute.setAttribute('aria-pressed', String(m));
  }

  // ------------------------------------------------------------ results

  showResults(res, info, levels) {
    const lv = levels[res.levelIndex];
    $('#res-title').textContent = res.reason === 'clear' ? 'Total chaos!' : "Fanny's home!";
    $('#res-sub').textContent = `${lv.name}`;
    $('#res-score').textContent = '0';
    $('#res-knocked').textContent = `${res.knocked}/${res.total}`;
    $('#res-combo').textContent = res.bestCombo >= 2 ? 'x' + res.bestCombo : '-';
    $('#res-bonus-row').hidden = !res.timeBonus;
    $('#res-bonus').textContent = '+' + fmt(res.timeBonus);
    $('#res-best').hidden = !info.newBest;
    $('#res-flavor').textContent = FLAVOR[res.stars];
    const nextGoal = res.thresholds.find((th) => th > res.score);
    let note = '';
    if (res.stars === 0) note = `You need ${fmt(res.thresholds[0])} points for a star to open the next room.`;
    else if (nextGoal) note = `${fmt(nextGoal)} points for ${'★'.repeat(res.stars + 1)}`;
    else note = 'Three stars. Purrfect.';
    if (info.unlockedNext && res.levelIndex + 1 < levels.length) note += ` · ${levels[res.levelIndex + 1].room} unlocked!`;
    $('#res-note').textContent = note;
    const last = res.levelIndex === levels.length - 1;
    const nextBtn = $('#res-next-btn');
    const canNext = res.levelIndex + 1 < Save.data.unlocked;
    nextBtn.hidden = !(canNext || (last && res.stars > 0));
    nextBtn.textContent = last ? 'Credits ♥' : 'Next room ›';
    nextBtn.dataset.action = last ? 'credits' : 'next';
    const stars = [...document.querySelectorAll('#res-stars .star')];
    stars.forEach((s) => s.classList.remove('on', 'pop'));
    // count up the score, then pop the stars one by one
    const t0 = performance.now();
    const dur = 700;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      $('#res-score').textContent = fmt(res.score * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && this.current === 'results') requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    for (let i = 0; i < res.stars; i++) {
      setTimeout(() => {
        if (this.current !== 'results') return;
        stars[i].classList.add('on', 'pop');
        sfx.star(i);
      }, 750 + i * 380);
    }
    setTimeout(() => this.current === 'results' && sfx.fanfare(res.stars), 750 + res.stars * 380 + 100);
  }

  // ------------------------------------------------------------ credits

  showCredits(levels) {
    $('#credits-knocked').textContent = fmt(Save.data.knockedTotal);
    $('#credits-stars').textContent = `${Save.totalStars()}/${levels.length * 3}`;
  }
}

