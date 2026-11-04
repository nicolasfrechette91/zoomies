// Good things (treats, cardboard boxes) and the sleepy sunbeam.

export class Treat {
  constructor(spec, room) {
    this.x = spec.x;
    this.y = spec.y;
    this.z = room.groundAt(spec.x, spec.y);
    this.at = spec.at || 0;
    this.age = -1;
    this.spawned = false;
    this.taken = false;
  }
}

export class Box {
  constructor(spec, room) {
    this.x = spec.x;
    this.y = spec.y;
    this.z = room.groundAt(spec.x, spec.y);
    this.used = false;
    this.occupied = false;
  }
}

export class Sunbeam {
  constructor(spec) {
    this.x0 = spec.x;
    this.x = spec.x;
    this.y = spec.y;
    this.w = spec.w;
    this.h = spec.h;
    this.skew = spec.skew || 0;
    this.range = spec.drift || 0;
    this.period = spec.period || 24;
    this.t = spec.phase || 0;
    this.dwell = 0;
    this.armed = true;
  }

  update(dt) {
    this.t += dt;
    if (this.range) this.x = this.x0 + Math.sin((this.t / this.period) * Math.PI * 2) * this.range;
  }

  contains(px, py) {
    if (py < this.y || py > this.y + this.h) return false;
    const v = (py - this.y) / this.h;
    const left = this.x + this.skew * (1 - v);
    return px >= left && px <= left + this.w;
  }
}
