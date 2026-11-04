// One play session of a level: rules (timer, score, combos), interactions, and drawing.
import { Room, ROOM_W, ROOM_H } from './room.js';
import { Cat, CAT_R, CAT_MASS } from './cat.js';
import { Item, stepItems, drawItem, drawItemShadow, itemRender, itemFriction, warmItemSprites } from './objects.js';
import { Vacuum, Cucumbers } from './hazards.js';
import { Treat, Box, Sunbeam } from './pickups.js';
import { FX } from './particles.js';
import { sfx } from './audio.js';
import { drawRoom, drawBackdrop, drawDoor, THEMES } from './art/room.js';
import { drawCat } from './art/ranchy.js';
import { drawDebris } from './art/items.js';
import { drawVacuum, drawCucumber, drawTreat, drawBox, drawSunbeam, drawLaser, drawMark, drawSpeech } from './art/props.js';
import { clamp, rand, hashStr } from './util.js';

export const COMBO_WINDOW = 2.2;
export const MAX_MULT = 5;
const NO_LASER = { on: false, x: 0, y: 0, speed: 0, stillT: 0 };
const LIQUID_DROPS = { coffee: '#7a4b2e', water: '#7ebede', wine: '#9e3b4e', perfume: '#f5aabe' };

/** Is this object pressed against one of the room's walls? */
const touchesWall = (it) => it.x - it.r < 3 || it.y - it.r < 3 || it.x + it.r > ROOM_W - 3 || it.y + it.r > ROOM_H - 3;

/** How far a surface extends along an edge's direction (a counter's depth, a round table's width). */
const surfaceDepth = (f, edge) => (f.shape === 'circle' ? f.r * 2 : Math.abs(edge.nx) > Math.abs(edge.ny) ? f.w : f.h);

const SPEECH = [
  'Aww... were you good today?',
  'Ranchy... what happened here?',
  'RANCHY! Seriously?!',
  'RANCHY!!! What did you DO?!',
];

export class Game {
  constructor(level, index, opts = {}) {
    this.level = level;
    this.index = index;
    this.demo = !!opts.demo;
    this.hooks = opts.hooks || {};
    this.room = new Room({ ...level, theme: THEMES[level.theme] || THEMES.living });
    this.items = level.items.map((s, i) => new Item(s, this.room, i));
    this.totalValue = this.items.reduce((a, it) => a + it.def.value, 0);
    this.thresholds = level.stars.map((f) => Math.max(25, Math.round((this.totalValue * f) / 25) * 25));
    const c = level.cat || { x: 180, y: 540 };
    this.cat = new Cat(c.x, c.y, c.a ?? -Math.PI / 2);
    this.vacuums = (level.vacuums || []).map((v) => new Vacuum(v, this.room));
    this.cucumbers = new Cucumbers(level.cucumbers);
    this.treats = (level.treats || []).map((t) => new Treat(t, this.room));
    this.boxes = (level.boxes || []).map((b) => new Box(b, this.room));
    this.sunbeams = (level.sunbeams || []).map((s) => new Sunbeam(s));
    this.fx = new FX();
    this.decals = [];
    this.bg = null;
    this.bgCtx = null;
    this.bgVersion = -1;
    this.seed = hashStr(level.id);

    this.time = level.time || 60;
    this.timeLeft = this.time;
    this.elapsed = 0;
    this.freezeT = 0;
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.knocked = 0;
    this.state = this.demo ? 'demo' : 'ready';
    this.endT = 0;
    this.doorOpen = 0;
    this.doorDelay = 0.25;
    this.doorSounded = false;
    this.jingled = false;
    this.lastTick = 99;
    this.timeBonus = 0;
    this.endReason = null;
    this.stars = 0;
    this.t = 0;
    this.purring = false;
    this.heartT = 0;
    this.zzzT = 0;
    this.drawList = [];
  }

  get playing() {
    return this.state === 'play';
  }

  start() {
    this.state = 'play';
    this.hooks.time?.(this.timeLeft, false);
    this.hooks.score?.(this.score, this.knocked, this.items.length);
  }

  // ------------------------------------------------------------ update

  update(dt, laser) {
    this.t += dt;
    const playing = this.playing;
    const L = playing || this.demo ? laser : NO_LASER;
    const c = this.cat;

    if (playing) {
      this.elapsed += dt;
      if (this.freezeT > 0) this.freezeT -= dt;
      else this.timeLeft -= dt;
      const sec = Math.ceil(this.timeLeft);
      if (sec !== this.lastTick && sec <= 10 && sec > 0) {
        this.lastTick = sec;
        sfx.tick(sec <= 5);
      }
      if (!this.jingled && this.timeLeft <= 4.5) {
        this.jingled = true;
        sfx.jingle();
        this.hooks.toast?.("Jingle jingle... Fanny's at the door!", 'warn');
      }
      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) {
          this.combo = 0;
        }
      }
      this.hooks.time?.(this.timeLeft, this.freezeT > 0);
      this.hooks.combo?.(this.combo >= 2 ? Math.min(this.combo, MAX_MULT) : 0, this.comboT / COMBO_WINDOW);
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.finish('time');
      }
    }

    c.update(dt, L, this.room, this.t);
    this.handleCatEvents();

    // hazards
    const frozen = this.freezeT > 0 || !(playing || this.demo);
    let near = 0;
    for (const v of this.vacuums) {
      v.update(dt, this.room, frozen);
      const d = Math.hypot(v.x - c.x, v.y - c.y);
      near = Math.max(near, clamp(1 - (d - 40) / 260, 0, 1));
      if (playing && !frozen && d < 64 && c.onFloor && c.scare(v.x, v.y)) {
        this.fx.addShake(2);
      }
    }
    // this.playing, not the `playing` read at the top: finish() may have just stopped the vacuum this frame
    if (this.vacuums.length) sfx.vacuumLevel(this.playing ? (frozen ? 0.12 : 0.25 + near * 0.75) : 0);
    if (playing) {
      this.cucumbers.update(dt, this);
      for (let i = this.cucumbers.list.length - 1; i >= 0; i--) {
        const cu = this.cucumbers.list[i];
        if (cu.appear < 1 || Math.abs(c.z - cu.z) > 18) continue;
        if (Math.hypot(cu.x - c.x, cu.y - c.y) < 30 && c.startle(cu.x, cu.y)) {
          sfx.boing();
          this.fx.puff(cu.x, cu.y, 7, { color: '#cfe0c0' });
          this.fx.addShake(3);
          this.cucumbers.list.splice(i, 1);
          if (this.combo > 0) {
            this.combo = 0;
            this.comboT = 0;
            this.fx.text(c.x, c.y - 30, 'combo lost!', { color: '#ff9b8a', size: 12 });
          }
        }
      }
    }

    // objects
    this.collideCatItems();
    stepItems(this.items, dt, this.room, (it) => this.onLand(it), (it) => sfx.clink(it.def.mat));
    if (playing || this.demo) this.autoSwat();

    for (const sb of this.sunbeams) sb.update(dt);
    if (playing) this.updatePickups(dt);
    else if (this.demo) this.updateSunbeams(dt);

    // little ambient touches
    const purr = c.pose === 'belly' && (playing || this.demo);
    if (purr !== this.purring) {
      this.purring = purr;
      sfx.purr(purr);
    }
    if (c.pose === 'belly') {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 1.3;
        this.fx.hearts(c.x, c.y - 10, 1);
      }
    }
    if (c.state === 'nap') {
      this.zzzT -= dt;
      if (this.zzzT <= 0) {
        this.zzzT = 0.45;
        this.fx.zzz(c.x + 8, c.y - 16);
      }
    }

    this.fx.update(dt);

    if (this.state === 'ending') {
      this.endT += dt;
      this.doorOpen = clamp((this.endT - this.doorDelay) / 0.7, 0, 1);
      if (!this.doorSounded && this.endT >= this.doorDelay) {
        this.doorSounded = true;
        sfx.door();
      }
      if (this.endT > this.doorDelay + 1.7) {
        this.state = 'done';
        this.hooks.end?.(this.result());
      }
    }
  }

  handleCatEvents() {
    const c = this.cat;
    const fx = this.fx;
    for (const e of c.events) {
      switch (e.type) {
        case 'skid': {
          const bx = e.x - Math.cos(c.heading) * 12;
          const by = e.y - Math.sin(c.heading) * 12;
          fx.puff(bx, by, 1, { size: 0.8, spread: 0.4 });
          sfx.skid(e.power);
          break;
        }
        case 'hop':
          sfx.hop(e.up);
          fx.puff(e.x, e.y, 2, { size: 0.6, spread: 0.5 });
          break;
        case 'land':
          sfx.land(e.big);
          fx.puff(e.x, e.y, e.big ? 8 : 3, { size: e.big ? 1.1 : 0.7 });
          if (e.big) fx.addShake(2);
          break;
        case 'pounce':
          sfx.whoosh();
          break;
        case 'bonk':
          sfx.bonk();
          fx.stars(e.x, e.y - 8, 5);
          fx.addShake(1.5);
          break;
        case 'scared':
          sfx.hiss();
          fx.puff(e.x, e.y, 9, { spread: 1.5 });
          break;
        case 'notice':
          if (e.fromBelly || Math.random() < 0.5) sfx.meow('chirp');
          break;
        case 'wake':
          sfx.meow('sleepy');
          break;
        case 'boxOut':
          sfx.hop(true);
          fx.puff(e.x, e.y, 3, { size: 0.7 });
          break;
      }
    }
    c.events.length = 0;
  }

  collideCatItems() {
    const c = this.cat;
    if (c.state === 'box' || c.state === 'nap' || c.state === 'ending') return;
    const hx = c.x + Math.cos(c.heading) * 5;
    const hy = c.y + Math.sin(c.heading) * 5;
    const R = CAT_R + 1.5;
    for (const it of this.items) {
      if (it.state !== 'rest') continue;
      if (Math.abs(it.z - c.z) > 13) continue;
      const dx = it.x - hx;
      const dy = it.y - hy;
      const rr = R + it.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = rr - d;
      const im = 1 / it.mass;
      const cm = 1 / CAT_MASS;
      const tot = im + cm;
      it.x += nx * overlap * (im / tot);
      it.y += ny * overlap * (im / tot);
      c.x -= nx * overlap * (cm / tot);
      c.y -= ny * overlap * (cm / tot);
      const rel = (c.vx - it.vx) * nx + (c.vy - it.vy) * ny;
      if (rel > 0) {
        const boost = c.state === 'pounce' ? 1.35 : 1;
        const j = (1.4 * rel * boost) / tot;
        it.vx += nx * j * im;
        it.vy += ny * j * im;
        c.vx -= nx * j * cm * 0.6;
        c.vy -= ny * j * cm * 0.6;
        const tang = -c.vx * ny + c.vy * nx;
        it.av += clamp((tang * 0.08) / it.mass, -15, 15);
        it.wobble = 1;
        if (rel > 50) sfx.clink(it.def.mat);
      }
    }
  }

  /** Cats knock things off tables on purpose. If he ambles past something on a surface, he paws it toward the edge. */
  autoSwat() {
    const c = this.cat;
    if (c.swatCD > 0 || !c.controllable || c.state === 'crouch' || c.speed > 150 || c.hopT < c.hopDur) return;
    const ch = Math.cos(c.heading);
    const sh = Math.sin(c.heading);
    const hx = c.x + ch * 14;
    const hy = c.y + sh * 14;
    for (const it of this.items) {
      if (it.state !== 'rest' || !it.surface || Math.abs(it.z - c.baseZ) > 6) continue;
      const dx = it.x - hx;
      const dy = it.y - hy;
      if (dx * dx + dy * dy > 24 * 24) continue;
      let edge = this.room.openEdge(it.surface, it.x, it.y);
      if (!edge) {
        // tucked in a corner: shove it out toward the middle of the room
        const mx = ROOM_W / 2 - it.x;
        const my = ROOM_H / 2 - it.y;
        const m = Math.hypot(mx, my) || 1;
        edge = { nx: mx / m, ny: my / m, dist: 36 };
      }
      // Normally he only paws things near an edge. Something shoved flush against a wall is
      // stuck there (bumping it only pins it harder), so for those he reaches across the whole surface.
      if (edge.dist > (touchesWall(it) ? surfaceDepth(it.surface, edge) : 42)) continue;
      // just enough push to slide it past the edge (with a little extra flair)
      const sp = Math.min(430, (edge.dist + it.r + 12) * itemFriction(it) * rand(1.1, 1.35));
      it.vx += edge.nx * sp;
      it.vy += edge.ny * sp;
      it.av += rand(-8, 8);
      it.wobble = 1;
      const side = ch * dy - sh * dx > 0 ? 1 : -1;
      c.swatAt(side);
      sfx.swat();
      break;
    }
  }

  onLand(it) {
    const def = it.def;
    const fx = this.fx;
    this.knocked++;
    // things still mid-air when the clock runs out still count
    const scoring = this.playing || (this.state === 'ending' && this.endReason === 'time');
    if (scoring) {
      if (this.comboT > 0) this.combo++;
      else this.combo = 1;
      this.comboT = COMBO_WINDOW;
      const mult = Math.min(this.combo, MAX_MULT);
      this.bestCombo = Math.max(this.bestCombo, mult);
      const pts = def.value * mult;
      this.score += pts;
      fx.text(it.x, it.y - 10, '+' + pts, {
        color: mult > 1 ? '#ffd76a' : '#fffaf1',
        sub: mult > 1 ? 'x' + mult + ' combo!' : '',
        size: 14 + Math.min(mult, 5),
      });
      if (mult >= 2) {
        sfx.meow(mult >= 4 ? 'big' : 'happy');
        sfx.comboDing(mult);
        this.cat.celebrate();
        fx.hearts(this.cat.x, this.cat.y - 12, 1 + mult);
      }
      this.hooks.score?.(this.score, this.knocked, this.items.length);
      if (this.playing) this.hooks.combo?.(mult >= 2 ? mult : 0, 1, true);
      else this.stars = this.thresholds.filter((th) => this.score >= th).length;
    }
    // juice
    fx.addShake(2.2 + def.value / 70);
    fx.puff(it.x, it.y, 6, { size: 1 });
    if (def.debris === 'shatter') {
      fx.shards(it.x, it.y, 0, [def.shardColor, '#ffffff'], 9, 1);
      if (def.liquid) fx.drops(it.x, it.y, LIQUID_DROPS[def.liquid], 8);
      if (def.flowers) fx.leaves(it.x, it.y, 4);
    } else if (def.debris === 'dirt') {
      fx.shards(it.x, it.y, 0, ['#6b4a35', def.shardColor], 10, 0.8);
      fx.leaves(it.x, it.y, 5);
    } else {
      fx.puff(it.x, it.y, 3, { size: 0.7 });
    }
    sfx.crash(def.mat, def.liquid, 0.8 + def.value / 400);
    const d = { def, variant: it.variant, seed: it.seed, x: it.x, y: it.y, angle: it.angle };
    this.decals.push(d);
    if (this.bgCtx) this.paintDecal(this.bgCtx, d);
    if (this.playing && this.items.every((i) => i.state === 'gone')) this.finish('clear');
  }

  updatePickups(dt) {
    const c = this.cat;
    const fx = this.fx;
    for (const tr of this.treats) {
      if (tr.taken) continue;
      if (!tr.spawned) {
        if (this.elapsed < tr.at) continue;
        tr.spawned = true;
        tr.age = 0;
        fx.sparkles(tr.x, tr.y, 7);
        if (tr.at > 0) sfx.pop();
      }
      tr.age += dt;
      if (c.state !== 'box' && Math.abs(c.z - tr.z) < 14 && Math.hypot(c.x - tr.x, c.y - tr.y) < 18) {
        tr.taken = true;
        this.timeLeft += 5;
        fx.text(tr.x, tr.y - 12, '+5s', { color: '#a6eaa8', sub: 'treat!' });
        fx.hearts(c.x, c.y - 10, 3);
        fx.sparkles(tr.x, tr.y, 6);
        sfx.nom();
      }
    }
    for (const b of this.boxes) {
      if (b.occupied && c.state !== 'box') {
        b.occupied = false;
        b.used = true;
      }
      if (b.used || b.occupied) continue;
      if (Math.abs(c.z - b.z) < 12 && Math.hypot(c.x - b.x, c.y - b.y) < 17 && c.enterBox(b)) {
        b.occupied = true;
        this.freezeT = c.boxDur + 6;
        fx.text(b.x, b.y - 26, 'If I fits, I sits!', { size: 12, sub: 'time freeze!', life: 1.6, rise: 20 });
        fx.sparkles(b.x, b.y, 10, '#cfeeff', 24);
        sfx.boxThump();
        sfx.freeze();
        this.hooks.toast?.('Time freeze! The clock stops for a bit.', 'cool');
      }
    }
    this.updateSunbeams(dt, true);
  }

  updateSunbeams(dt, rules = false) {
    const c = this.cat;
    for (const sb of this.sunbeams) {
      const inside = sb.contains(c.x, c.y) && c.z < c.groundZ + 6;
      if (!inside) {
        sb.dwell = 0;
        sb.armed = true;
        continue;
      }
      if (!sb.armed || !c.controllable) continue;
      sb.dwell += dt;
      if (sb.dwell > 0.22) {
        sb.armed = false;
        if (c.nap(1.5)) {
          sfx.napStart();
          if (rules) {
            this.timeLeft = Math.max(0.5, this.timeLeft - 3);
            this.fx.text(c.x, c.y - 20, '-3s', { color: '#ff9b8a', sub: 'nap time...' });
            this.hooks.toast?.('Sunbeam nap! -3 seconds', 'bad');
          }
        }
      }
    }
  }

  finish(reason) {
    if (this.state !== 'play') return;
    this.state = 'ending';
    this.endReason = reason;
    this.endT = 0;
    if (reason === 'clear') {
      this.timeBonus = Math.ceil(this.timeLeft) * 25;
      this.score += this.timeBonus;
      this.doorDelay = this.jingled ? 0.4 : 1.1;
      if (!this.jingled) {
        this.jingled = true;
        sfx.jingle();
      }
      this.hooks.toast?.('Total chaos! Everything is on the floor!', 'good');
    }
    this.stars = this.thresholds.filter((th) => this.score >= th).length;
    const dr = this.room.doorRect();
    this.cat.endPose({ x: dr.x + dr.w / 2, y: dr.y + dr.h / 2 });
    sfx.purr(false);
    sfx.stopVacuum();
    this.purring = false;
    this.hooks.combo?.(0, 0);
    this.hooks.score?.(this.score, this.knocked, this.items.length);
  }

  result() {
    this.stars = this.thresholds.filter((th) => this.score >= th).length;
    return {
      levelIndex: this.index,
      score: this.score,
      stars: this.stars,
      thresholds: this.thresholds,
      knocked: this.knocked,
      total: this.items.length,
      bestCombo: this.bestCombo,
      timeBonus: this.timeBonus,
      reason: this.endReason,
    };
  }

  dispose() {
    sfx.purr(false);
    sfx.stopVacuum();
  }

  // ------------------------------------------------------------ drawing

  buildBackground(view) {
    if (!this.bg) this.bg = document.createElement('canvas');
    this.bg.width = view.canvas.width;
    this.bg.height = view.canvas.height;
    const g = this.bg.getContext('2d');
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawBackdrop(g, view.cssW, view.cssH);
    view.worldTransform(g);
    drawRoom(g, this.room, this.seed);
    for (const d of this.decals) this.paintDecal(g, d);
    this.bgCtx = g;
    this.bgVersion = view.version;
    itemRender.pxScale = view.pxScale * 1.25;
    warmItemSprites(this.items);
  }

  paintDecal(g, d) {
    g.save();
    g.translate(d.x, d.y);
    drawDebris(g, d.def, d.variant, d.seed, d.angle);
    g.restore();
  }

  render(view, laser) {
    const ctx = view.ctx;
    if (this.bgVersion !== view.version) this.buildBackground(view);
    const sx = this.fx.sx;
    const sy = this.fx.sy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sx || sy) {
      ctx.fillStyle = '#3a2a24';
      ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
    }
    ctx.drawImage(this.bg, Math.round(sx * view.dpr), Math.round(sy * view.dpr));
    view.worldTransform(ctx, sx, sy);
    itemRender.pxScale = view.pxScale * 1.25;
    const t = this.t;
    const c = this.cat;

    for (const b of this.boxes) drawBox(ctx, b, t);
    for (const tr of this.treats) if (tr.spawned && !tr.taken) drawTreat(ctx, tr, t);
    for (const v of this.vacuums) drawVacuum(ctx, v, t);
    for (const it of this.items) if (it.state !== 'gone') drawItemShadow(ctx, it);

    // depth-sort the things that live at different heights
    const list = this.drawList;
    list.length = 0;
    for (const it of this.items) if (it.state === 'rest') list.push(it);
    for (const cu of this.cucumbers.list) list.push(cu);
    list.push(c);
    list.sort((a, b) => (a === c ? a.z + 0.5 : a.z) - (b === c ? b.z + 0.5 : b.z));
    for (const e of list) {
      if (e === c) drawCat(ctx, c, t);
      else if (e.appear !== undefined) drawCucumber(ctx, e, t);
      else drawItem(ctx, e, t);
    }
    for (const it of this.items) if (it.state === 'falling') drawItem(ctx, it, t);
    for (const sb of this.sunbeams) drawSunbeam(ctx, sb, t);
    drawDoor(ctx, this.room, this.doorOpen);
    this.fx.draw(ctx);
    if (c.markT > 0 && c.mark) drawMark(ctx, c.x, c.y - 26 - c.z * 0.3, c.mark, c.markDur - c.markT);
    this.fx.drawTexts(ctx);
    if (laser && (this.playing || this.demo)) drawLaser(ctx, laser, t);
    if (this.state === 'ending' || this.state === 'done') {
      const k = this.endT - this.doorDelay - 0.35;
      if (k > 0) {
        const dr = this.room.doorRect();
        let bx = clamp(dr.x + dr.w / 2, 90, ROOM_W - 90);
        let by = clamp(dr.y + dr.h / 2, 30, ROOM_H - 30);
        if (this.room.door.wall === 'bottom') by -= 40;
        else if (this.room.door.wall === 'top') by += 40;
        else if (this.room.door.wall === 'left') bx += 20;
        else bx -= 20;
        drawSpeech(ctx, bx, by, SPEECH[this.stars], k);
      }
    }
  }
}
