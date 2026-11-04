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
   * Push a circle out of walls and the given furniture list.
   * Returns a shared result object {x, y, hit, nx, ny}.
   */
  resolveCircle(x, y, r, list) {
    const res = this._res;
    res.hit = false;
    res.nx = 0;
    res.ny = 0;
    if (x < r) { x = r; res.hit = true; res.nx = 1; }
    if (x > ROOM_W - r) { x = ROOM_W - r; res.hit = true; res.nx = -1; }
    if (y < r) { y = r; res.hit = true; res.ny = 1; }
    if (y > ROOM_H - r) { y = ROOM_H - r; res.hit = true; res.ny = -1; }
    if (list) {
      for (const f of list) {
        if (f.shape === 'circle') {
          const dx = x - f.cx;
          const dy = y - f.cy;
          const rr = f.r + r;
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.001;
            x = f.cx + (dx / d) * rr;
            y = f.cy + (dy / d) * rr;
            res.hit = true;
            res.nx = dx / d;
            res.ny = dy / d;
          }
        } else {
          const qx = Math.max(f.x, Math.min(x, f.x + f.w));
          const qy = Math.max(f.y, Math.min(y, f.y + f.h));
          let dx = x - qx;
          let dy = y - qy;
          const d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            if (d2 > 0.0001) {
              const d = Math.sqrt(d2);
              x = qx + (dx / d) * r;
              y = qy + (dy / d) * r;
              res.nx = dx / d;
              res.ny = dy / d;
            } else {
              // center inside the rectangle: push out along the shortest axis
              const l = x - f.x;
              const rt = f.x + f.w - x;
              const t = y - f.y;
              const b = f.y + f.h - y;
              const m = Math.min(l, rt, t, b);
              if (m === l) { x = f.x - r; res.nx = -1; res.ny = 0; }
              else if (m === rt) { x = f.x + f.w + r; res.nx = 1; res.ny = 0; }
              else if (m === t) { y = f.y - r; res.nx = 0; res.ny = -1; }
              else { y = f.y + f.h + r; res.nx = 0; res.ny = 1; }
            }
            res.hit = true;
          }
        }
      }
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
