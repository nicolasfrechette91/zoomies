// Room geometry: furniture footprints, surfaces Ranchy can hop on, and collision queries.

export const ROOM_W = 360;
export const ROOM_H = 640;
export const WALL = 14;

/** Defaults per furniture kind. z = height of the top surface in world units. */
export const KINDS = {
  counter: { z: 34, surface: true },
  island: { z: 34, surface: true },
  table: { z: 30, surface: true },
  chair: { z: 18, surface: true },
  sofa: { z: 20, surface: true },
  armchair: { z: 20, surface: true },
  coffeeTable: { z: 16, surface: true },
  tvStand: { z: 22, surface: true },
  sideTable: { z: 24, surface: true },
  bookshelf: { z: 52, surface: true },
  bed: { z: 22, surface: true },
  nightstand: { z: 24, surface: true },
  dresser: { z: 36, surface: true },
  desk: { z: 30, surface: true },
  catTree: { z: 44, surface: true },
  fridge: { z: 80, solid: true },
  plantBig: { z: 40, solid: true },
  floorLamp: { z: 60, solid: true },
  basket: { z: 20, solid: true },
  rug: { decor: true, grip: 13 },
  mat: { decor: true, grip: 10 },
  catBed: { decor: true },
  bowls: { decor: true },
  toy: { decor: true },
};

function normalize(spec, i) {
  const f = Object.assign({}, KINDS[spec.kind] || {}, spec);
  f.id = i;
  if (f.r !== undefined) {
    f.shape = 'circle';
    f.x = f.cx - f.r;
    f.y = f.cy - f.r;
    f.w = f.h = f.r * 2;
  } else {
    f.shape = 'rect';
    f.cx = f.x + f.w / 2;
    f.cy = f.y + f.h / 2;
  }
  f.z = f.z || 0;
  return f;
}

// ---------------------------------------------------------------- pushing circles out of furniture

/** Where the centre of the circle being resolved may be: the room shrunk by its radius. */
const box = { x0: 0, x1: 0, y0: 0, y1: 0 };
const inBox = (x, y) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;

/** Touching counts as clear (float noise would otherwise re-push a circle resting on a surface). */
const EPS = 1e-6;

/**
 * A way out this close to a corner of the room means the furniture has wedged the circle into a
 * tiny pocket it could never get out of again (the Dining room plant leaves one), so any other
 * way out is preferred.
 */
const POCKET = 3;

/** The best way out found by pushOut() (scratch object: this runs for every moving thing, every frame). */
const best = { x: 0, y: 0, nx: 0, ny: 0, d2: Infinity, pocket: true };

/** Offer a way out to (px, py) with outward normal (nx, ny); keep it if it beats the best so far. */
function consider(px, py, nx, ny, fromX, fromY) {
  if (!inBox(px, py)) return;
  const pocket = Math.min(px - box.x0, box.x1 - px) < POCKET && Math.min(py - box.y0, box.y1 - py) < POCKET;
  if (pocket && !best.pocket) return;
  const d2 = (px - fromX) * (px - fromX) + (py - fromY) * (py - fromY);
  if (pocket === best.pocket && d2 >= best.d2) return;
  best.x = px;
  best.y = py;
  best.nx = nx;
  best.ny = ny;
  best.d2 = d2;
  best.pocket = pocket;
}

/** Where the circle (f.cx, f.cy, rr) crosses the wall line x = X, as ways out. */
function slideAlongX(f, rr, X, fromX, fromY) {
  const k = rr * rr - (X - f.cx) * (X - f.cx);
  if (k < 0) return;
  const s = Math.sqrt(k);
  consider(X, f.cy - s, (X - f.cx) / rr, -s / rr, fromX, fromY);
  consider(X, f.cy + s, (X - f.cx) / rr, s / rr, fromX, fromY);
}

/** Where the circle (f.cx, f.cy, rr) crosses the wall line y = Y, as ways out. */
function slideAlongY(f, rr, Y, fromX, fromY) {
  const k = rr * rr - (Y - f.cy) * (Y - f.cy);
  if (k < 0) return;
  const s = Math.sqrt(k);
  consider(f.cx - s, Y, -s / rr, (Y - f.cy) / rr, fromX, fromY);
  consider(f.cx + s, Y, s / rr, (Y - f.cy) / rr, fromX, fromY);
}

/**
 * If a circle at (x, y) with radius r overlaps furniture f, find where to push it so it clears f
 * without going into a wall, and return true (the answer is in `best`).
 */
function pushOut(f, x, y, r) {
  best.d2 = Infinity;
  best.pocket = true;
  let px;
  let py;
  let ux;
  let uy;
  if (f.shape === 'circle') {
    const dx = x - f.cx;
    const dy = y - f.cy;
    const rr = f.r + r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr - EPS) return false;
    const d = Math.sqrt(d2);
    ux = d > 1e-9 ? dx / d : 1;
    uy = d > 1e-9 ? dy / d : 0;
    px = f.cx + ux * rr;
    py = f.cy + uy * rr;
    if (inBox(px, py)) {
      consider(px, py, ux, uy, x, y);
      return true;
    }
    // Straight out would go into a wall: the gap between this solid and the wall is narrower
    // than the circle. Slide along the walls to where it just clears the solid.
    slideAlongX(f, rr, box.x0, x, y);
    slideAlongX(f, rr, box.x1, x, y);
    slideAlongY(f, rr, box.y0, x, y);
    slideAlongY(f, rr, box.y1, x, y);
  } else {
    const qx = Math.max(f.x, Math.min(x, f.x + f.w));
    const qy = Math.max(f.y, Math.min(y, f.y + f.h));
    const dx = x - qx;
    const dy = y - qy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r - EPS) return false;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      ux = dx / d;
      uy = dy / d;
      px = qx + ux * r;
      py = qy + uy * r;
      if (inBox(px, py)) {
        consider(px, py, ux, uy, x, y);
        return true;
      }
    } else {
      // centre inside the rectangle: there's no "straight out", only its four sides
      px = x;
      py = y;
      ux = 0;
      uy = 0;
    }
    // leave by the nearest side that keeps the circle in the room
    consider(f.x - r, y, -1, 0, x, y);
    consider(f.x + f.w + r, y, 1, 0, x, y);
    consider(x, f.y - r, 0, -1, x, y);
    consider(x, f.y + f.h + r, 0, 1, x, y);
  }
  if (best.d2 === Infinity) {
    // no way out inside the room at all (can't happen with real rooms): straight out, held in the room
    best.x = Math.max(box.x0, Math.min(px, box.x1));
    best.y = Math.max(box.y0, Math.min(py, box.y1));
    best.nx = ux;
    best.ny = uy;
  }
  return true;
}

export class Room {
  constructor(level) {
    this.level = level;
    this.floor = level.floor || 'wood';
    this.theme = level.theme || {};
    this.door = level.door || { wall: 'bottom', at: 300, w: 54 };
    this.windows = level.windows || [];
    this.zones = level.floorZones || [];
    this.furniture = level.furniture.map(normalize);
    this.surfaces = this.furniture.filter((f) => f.surface);
    this.solids = this.furniture.filter((f) => f.solid);
    this.blockers = this.furniture.filter((f) => !f.decor);
    this.grippy = this.furniture.filter((f) => f.grip);
    this._res = { x: 0, y: 0, hit: false, nx: 0, ny: 0 };
  }

  contains(f, x, y, m = 0) {
    if (f.shape === 'circle') {
      const dx = x - f.cx;
      const dy = y - f.cy;
      return dx * dx + dy * dy < (f.r + m) * (f.r + m);
    }
    return x > f.x - m && x < f.x + f.w + m && y > f.y - m && y < f.y + f.h + m;
  }

  /** Highest surface under a point, or null for the floor. */
  surfaceAt(x, y, maxZ = Infinity) {
    let best = null;
    for (const s of this.surfaces) {
      if (s.z < maxZ && this.contains(s, x, y) && (!best || s.z > best.z)) best = s;
    }
    return best;
  }

  groundAt(x, y) {
    const s = this.surfaceAt(x, y);
    return s ? s.z : 0;
  }

  /** How much lateral grip the paws get (wood and tile are slippery, rugs are not). */
  gripAt(x, y, z) {
    if (z > 4) return 8;
    for (const f of this.grippy) if (this.contains(f, x, y)) return f.grip;
    for (const zn of this.zones) {
      if (x > zn.x && x < zn.x + zn.w && y > zn.y && y < zn.y + zn.h) return zn.floor === 'carpet' ? 11 : 4.2;
    }
    return this.floor === 'carpet' ? 11 : 4.2;
  }

  /**
   * Push a circle out of walls and the given furniture list. It never ends up inside a wall:
   * where a solid stands closer to a wall than the circle is wide (a potted plant in a corner),
   * it slides along the wall out of the gap instead of being pushed into the wall.
   * Returns a shared result object {x, y, hit, nx, ny}; nx/ny is the outward normal of the
   * last surface (wall or furniture) it was pushed out of.
   */
  resolveCircle(x, y, r, list) {
    const res = this._res;
    res.hit = false;
    res.nx = 0;
    res.ny = 0;
    box.x0 = r;
    box.x1 = ROOM_W - r;
    box.y0 = r;
    box.y1 = ROOM_H - r;
    if (x < box.x0) { x = box.x0; res.hit = true; res.nx = 1; }
    if (x > box.x1) { x = box.x1; res.hit = true; res.nx = -1; }
    if (y < box.y0) { y = box.y0; res.hit = true; res.ny = 1; }
    if (y > box.y1) { y = box.y1; res.hit = true; res.ny = -1; }
    if (list && list.length) {
      // pushing out of one piece of furniture can land in another, so go round a few times
      for (let pass = 0; pass < 3; pass++) {
        let pushed = false;
        for (const f of list) {
          if (!pushOut(f, x, y, r)) continue;
          x = best.x;
          y = best.y;
          res.nx = best.nx;
          res.ny = best.ny;
          res.hit = pushed = true;
        }
        if (!pushed) break;
      }
    }
    // Every push above stays in the room; this is the last word if furniture squeezes it anyway.
    if (!inBox(x, y)) {
      const cx = Math.max(box.x0, Math.min(x, box.x1));
      const cy = Math.max(box.y0, Math.min(y, box.y1));
      res.nx = Math.sign(cx - x);
      res.ny = Math.sign(cy - y);
      res.hit = true;
      x = cx;
      y = cy;
    }
    res.x = x;
    res.y = y;
    return res;
  }

  /**
   * The nearest edge of a surface that an object could actually fall off
   * (not against a wall, not flush with a same-height neighbour).
   */
  openEdge(f, x, y) {
    if (f.shape === 'circle') {
      const dx = x - f.cx;
      const dy = y - f.cy;
      const d = Math.hypot(dx, dy) || 0.001;
      return { nx: dx / d, ny: dy / d, dist: f.r - d };
    }
    let best = null;
    const tryEdge = (nx, ny, dist, wall) => {
      if (wall) return;
      const px = x + nx * (dist + 8);
      const py = y + ny * (dist + 8);
      const nb = this.surfaceAt(px, py);
      if (nb && nb !== f && Math.abs(nb.z - f.z) < 8) return;
      for (const s of this.solids) if (this.contains(s, px, py, 4)) return;
      if (!best || dist < best.dist) best = { nx, ny, dist };
    };
    tryEdge(-1, 0, x - f.x, f.x <= 2);
    tryEdge(1, 0, f.x + f.w - x, f.x + f.w >= ROOM_W - 2);
    tryEdge(0, -1, y - f.y, f.y <= 2);
    tryEdge(0, 1, f.y + f.h - y, f.y + f.h >= ROOM_H - 2);
    return best;
  }

  /** A random free spot (on the floor or on top of something), away from `avoid` points. */
  randomSpot(avoid = [], minDist = 90, margin = 22) {
    for (let tries = 0; tries < 60; tries++) {
      const x = margin + Math.random() * (ROOM_W - margin * 2);
      const y = margin + Math.random() * (ROOM_H - margin * 2);
      let ok = true;
      for (const s of this.solids) if (this.contains(s, x, y, 14)) ok = false;
      for (const a of avoid) if (Math.hypot(a.x - x, a.y - y) < (a.r || minDist)) ok = false;
      if (ok) return { x, y, z: this.groundAt(x, y) };
    }
    return { x: ROOM_W / 2, y: ROOM_H / 2, z: this.groundAt(ROOM_W / 2, ROOM_H / 2) };
  }

  /** World-space geometry of the front door opening. */
  doorRect() {
    const d = this.door;
    const w = d.w || 54;
    switch (d.wall) {
      case 'top': return { x: d.at - w / 2, y: -WALL, w, h: WALL, hx: d.at - w / 2, hy: 0, dir: 1, axis: 'x' };
      case 'left': return { x: -WALL, y: d.at - w / 2, w: WALL, h: w, hx: 0, hy: d.at - w / 2, dir: 1, axis: 'y' };
      case 'right': return { x: ROOM_W, y: d.at - w / 2, w: WALL, h: w, hx: ROOM_W, hy: d.at - w / 2, dir: -1, axis: 'y' };
      default: return { x: d.at - w / 2, y: ROOM_H, w, h: WALL, hx: d.at - w / 2, hy: ROOM_H, dir: -1, axis: 'x' };
    }
  }
}
