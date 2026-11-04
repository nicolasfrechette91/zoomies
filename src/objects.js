// Knockable objects: definitions, tabletop sliding physics, and the tumble off the edge.
import { ROOM_W, ROOM_H } from './room.js';
import { ITEM_ART } from './art/items.js';
import { INK } from './art/draw.js';
import { TAU, clamp, rand, makeRng, hashStr } from './util.js';

/**
 * r: collision radius, mass: how hard it is to shove, value: base points,
 * mat: crash sound family, debris: what's left on the floor.
 */
export const ITEM_TYPES = {
  mug: { label: 'mug', r: 7, ext: 12, mass: 0.9, value: 100, mat: 'ceramic', liquid: 'coffee', debris: 'shatter', shardColor: '#f4efe6' },
  glass: { label: 'glass of water', r: 6.4, ext: 8, mass: 0.7, value: 125, mat: 'glass', liquid: 'water', debris: 'shatter', shardColor: '#e3f2f8' },
  wine: { label: 'wine glass', r: 6.3, ext: 8, mass: 0.6, value: 150, mat: 'glass', liquid: 'wine', debris: 'shatter', shardColor: '#eef3f4' },
  plant: { label: 'plant', r: 9, ext: 15, mass: 1.5, value: 150, mat: 'pot', debris: 'dirt', shardColor: '#d27d56' },
  succulent: { label: 'succulent', r: 6.5, ext: 8, mass: 0.9, value: 100, mat: 'pot', debris: 'dirt', shardColor: '#7fa9a5' },
  pen: { label: 'pen', r: 5, ext: 11, mass: 0.25, value: 50, mat: 'plastic', debris: 'whole' },
  remote: { label: 'remote', r: 7.5, ext: 12, mass: 0.6, value: 100, mat: 'plastic', debris: 'whole' },
  vase: { label: 'vase', r: 11, ext: 15, mass: 2.3, value: 250, mat: 'ceramic', liquid: 'water', debris: 'shatter', flowers: true, shardColor: '#8db4d4' },
  specs: { label: 'glasses', r: 8, ext: 11, mass: 0.35, value: 100, mat: 'plastic', debris: 'whole' },
  book: { label: 'book', r: 9, ext: 13, mass: 1.3, value: 75, mat: 'soft', debris: 'whole' },
  clock: { label: 'alarm clock', r: 8, ext: 11, mass: 1.0, value: 150, mat: 'metal', debris: 'whole' },
  frame: { label: 'photo frame', r: 8.5, ext: 11, mass: 0.9, value: 125, mat: 'glass', debris: 'shatter', shardColor: '#cfe6ee' },
  perfume: { label: 'perfume', r: 6, ext: 8, mass: 0.6, value: 125, mat: 'glass', liquid: 'perfume', debris: 'shatter', shardColor: '#f5c1cf' },
  plate: { label: 'plate', r: 10, ext: 12, mass: 1.1, value: 125, mat: 'ceramic', debris: 'shatter', food: true, shardColor: '#fbf8f3' },
};
for (const k in ITEM_TYPES) ITEM_TYPES[k].type = k;

const GRAVITY = 760;
const MAX_SPEED = 430;
const SURFACE_FRICTION = 3.4;
export const HEIGHT_SCALE = 0.0036;

export class Item {
  constructor(spec, room, index) {
    const def = ITEM_TYPES[spec.type];
    if (!def) throw new Error('Unknown item type ' + spec.type);
    this.def = def;
    this.type = spec.type;
    this.variant = spec.v ?? index;
    this.seed = hashStr(spec.type + index) % 100000;
    this.x = spec.x;
    this.y = spec.y;
    this.vx = 0;
    this.vy = 0;
    this.angle = spec.a ?? makeRng(this.seed)() * TAU;
    this.av = 0;
    this.r = def.r;
    this.mass = def.mass;
    this.surface = room.surfaceAt(this.x, this.y);
    this.z = this.surface ? this.surface.z : 0;
    this.startZ = this.z;
    this.groundZ = 0;
    this.vz = 0;
    this.state = 'rest'; // rest | falling | gone
    this.wobble = 0;
    this.tip = 0;
    this.lastHitBy = null;
  }
}

/** Integrate sliding, item-vs-item bumps, and falling. Calls onLand(item) when it hits the floor. */
export function stepItems(items, dt, room, onLand, onBump) {
  for (const it of items) {
    if (it.state === 'rest') {
      const sp = Math.hypot(it.vx, it.vy);
      if (sp > MAX_SPEED) {
        it.vx *= MAX_SPEED / sp;
        it.vy *= MAX_SPEED / sp;
      }
      const fr = Math.exp(-SURFACE_FRICTION * (0.6 + it.mass * 0.45) * dt);
      it.vx *= fr;
      it.vy *= fr;
      if (Math.abs(it.vx) < 0.5) it.vx = 0;
      if (Math.abs(it.vy) < 0.5) it.vy = 0;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.angle += it.av * dt;
      it.av *= Math.exp(-5 * dt);
      it.wobble = Math.max(0, it.wobble - dt * 3);
      // walls
      if (it.x < it.r) { it.x = it.r; it.vx = Math.abs(it.vx) * 0.3; }
      if (it.x > ROOM_W - it.r) { it.x = ROOM_W - it.r; it.vx = -Math.abs(it.vx) * 0.3; }
      if (it.y < it.r) { it.y = it.r; it.vy = Math.abs(it.vy) * 0.3; }
      if (it.y > ROOM_H - it.r) { it.y = ROOM_H - it.r; it.vy = -Math.abs(it.vy) * 0.3; }
      bounceOffSolids(it, room);
      // still on something?
      if (it.surface && !room.contains(it.surface, it.x, it.y)) {
        const other = room.surfaceAt(it.x, it.y, it.z + 1);
        if (other && Math.abs(other.z - it.z) < 8) {
          it.surface = other;
          it.z = other.z;
        } else {
          // over the edge it goes
          it.state = 'falling';
          it.startZ = it.z;
          it.vz = 30;
          const sp2 = Math.hypot(it.vx, it.vy) || 1;
          it.vx += (it.vx / sp2) * 25;
          it.vy += (it.vy / sp2) * 25;
          it.av = (Math.random() < 0.5 ? -1 : 1) * rand(7, 14);
          it.surface = null;
        }
      }
    } else if (it.state === 'falling') {
      it.vz -= GRAVITY * dt;
      it.z += it.vz * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.vx *= Math.exp(-0.8 * dt);
      it.vy *= Math.exp(-0.8 * dt);
      it.angle += it.av * dt;
      it.tip = Math.min(1, it.tip + dt * 4);
      it.x = clamp(it.x, it.r * 0.5, ROOM_W - it.r * 0.5);
      it.y = clamp(it.y, it.r * 0.5, ROOM_H - it.r * 0.5);
      bounceOffSolids(it, room);
      const below = room.surfaceAt(it.x, it.y, it.startZ - 4);
      it.groundZ = below ? below.z : 0;
      if (below && it.z <= below.z) {
        // landed on something lower (a chair, the bed...) - it survives, for now
        it.state = 'rest';
        it.surface = below;
        it.z = below.z;
        it.vx *= 0.35;
        it.vy *= 0.35;
        it.vz = 0;
        it.tip = 0;
        it.wobble = 1;
        if (onBump) onBump(it);
      } else if (it.z <= 0) {
        it.z = 0;
        it.state = 'gone';
        onLand(it);
      }
    }
  }

  // tabletop bumps between objects on the same surface
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a.state !== 'rest') continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (b.state !== 'rest' || b.surface !== a.surface) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const overlap = rr - d;
      const ia = 1 / a.mass;
      const ib = 1 / b.mass;
      const tot = ia + ib;
      a.x -= nx * overlap * (ia / tot);
      a.y -= ny * overlap * (ia / tot);
      b.x += nx * overlap * (ib / tot);
      b.y += ny * overlap * (ib / tot);
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) {
        const jimp = (1.45 * rel) / tot;
        a.vx -= nx * jimp * ia;
        a.vy -= ny * jimp * ia;
        b.vx += nx * jimp * ib;
        b.vy += ny * jimp * ib;
        b.wobble = 1;
        b.lastHitBy = a.lastHitBy;
        if (rel > 40 && onBump) onBump(b, rel);
      }
    }
  }
}

function bounceOffSolids(it, room) {
  if (!room.solids.length) return;
  const res = room.resolveCircle(it.x, it.y, it.r * 0.8, room.solids);
  if (!res.hit) return;
  it.x = res.x;
  it.y = res.y;
  const vn = it.vx * res.nx + it.vy * res.ny;
  if (vn < 0) {
    it.vx -= 1.3 * vn * res.nx;
    it.vy -= 1.3 * vn * res.ny;
  }
}

// ---------------------------------------------------------------- rendering

/** Things are drawn a touch larger than their collision circles so they read on a phone. */
export const ITEM_DRAW_SCALE = 1.12;

const spriteCache = new Map();
let cacheScale = 0;

function getSprite(type, variant, seed, pxScale) {
  if (pxScale !== cacheScale) {
    spriteCache.clear();
    cacheScale = pxScale;
  }
  const key = type + ':' + variant;
  let spr = spriteCache.get(key);
  if (spr) return spr;
  const def = ITEM_TYPES[type];
  const ext = def.ext + 2;
  const size = Math.ceil(ext * 2 * pxScale);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(pxScale, pxScale);
  g.translate(ext, ext);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  ITEM_ART[type](g, variant, makeRng(seed + variant * 31));
  spr = { canvas: c, ext };
  spriteCache.set(key, spr);
  return spr;
}

/** Pixel density used for item sprites (set by the game from the view). */
export const itemRender = { pxScale: 2 };

export function drawItemShadow(ctx, it) {
  const gap = it.state === 'falling' ? Math.max(0, it.z - it.groundZ) : 0;
  const hs = 1 + it.groundZ * HEIGHT_SCALE;
  const k = clamp(1 - gap * 0.01, 0.4, 1);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.2)';
  ctx.beginPath();
  ctx.ellipse(
    it.x + 1.2 + gap * 0.22,
    it.y + 1.8 + gap * 0.32,
    it.r * hs * k * 1.05 * ITEM_DRAW_SCALE,
    it.r * hs * k * 0.95 * ITEM_DRAW_SCALE,
    0,
    0,
    TAU,
  );
  ctx.fill();
}

export function drawItem(ctx, it, t) {
  const spr = getSprite(it.type, it.variant, it.seed, itemRender.pxScale);
  const hs = (1 + it.z * HEIGHT_SCALE) * ITEM_DRAW_SCALE;
  const wob = it.wobble > 0 ? Math.sin(t * 40) * 0.12 * it.wobble : 0;
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.rotate(it.angle + wob);
  if (it.state === 'falling') {
    // tumbling: squash as it tips over
    const sq = 1 - 0.35 * Math.abs(Math.sin(it.tip * Math.PI * 1.5));
    ctx.scale(hs, hs * sq);
  } else {
    ctx.scale(hs, hs);
  }
  const e = spr.ext;
  ctx.drawImage(spr.canvas, -e, -e, e * 2, e * 2);
  ctx.restore();
}

/** Small outline helper used by the HUD/intro icons. */
export function drawItemIcon(ctx, type, variant, size) {
  const def = ITEM_TYPES[type];
  const s = size / (def.ext * 2 + 4);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ITEM_ART[type](ctx, variant, makeRng(7));
  ctx.restore();
}
