// Things Ranchy does not appreciate: the robot vacuum and the dreaded cucumber.
import { rand, angleDiff, TAU } from './util.js';

export class Vacuum {
  constructor(spec, room) {
    this.r = 15;
    this.speed = spec.speed || 52;
    this.angle = spec.a ?? rand(0, TAU);
    const res = room.resolveCircle(spec.x, spec.y, this.r, room.blockers);
    this.x = res.x;
    this.y = res.y;
    this.state = 'drive';
    this.t = 0;
    this.stateT = 0;
    this.target = this.angle;
    this.brush = 0;
    this.frozen = false;
    this.nextTurn = rand(3, 6);
  }

  update(dt, room, frozen) {
    this.frozen = frozen;
    if (frozen) return;
    this.brush += dt * 22;
    this.t += dt;
    this.stateT += dt;
    if (this.state === 'drive') {
      this.angle += Math.sin(this.t * 0.8) * 0.18 * dt;
      const res = room.resolveCircle(
        this.x + Math.cos(this.angle) * this.speed * dt,
        this.y + Math.sin(this.angle) * this.speed * dt,
        this.r,
        room.blockers,
      );
      this.x = res.x;
      this.y = res.y;
      if (res.hit) {
        this.state = 'backup';
        this.stateT = 0;
      }
      this.nextTurn -= dt;
      if (this.nextTurn <= 0) {
        this.state = 'turn';
        this.target = this.angle + rand(-2.2, 2.2);
        this.nextTurn = rand(3, 7);
      }
    } else if (this.state === 'backup') {
      const res = room.resolveCircle(this.x - Math.cos(this.angle) * 28 * dt, this.y - Math.sin(this.angle) * 28 * dt, this.r, room.blockers);
      this.x = res.x;
      this.y = res.y;
      if (this.stateT > 0.3) {
        this.state = 'turn';
        this.target = this.angle + (Math.random() < 0.5 ? -1 : 1) * rand(1.6, 2.8);
      }
    } else {
      const d = angleDiff(this.angle, this.target);
      const step = 2.6 * dt;
      if (Math.abs(d) <= step) {
        this.angle = this.target;
        this.state = 'drive';
        this.stateT = 0;
      } else this.angle += Math.sign(d) * step;
    }
  }
}

/** Cucumbers appear somewhere every so often. Ranchy is not okay with this. */
export class Cucumbers {
  constructor(cfg) {
    this.cfg = cfg || null;
    this.list = [];
    this.timer = cfg ? cfg.first ?? 8 : Infinity;
  }

  update(dt, game) {
    if (!this.cfg) return;
    const cfg = this.cfg;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = rand(cfg.every?.[0] ?? 10, cfg.every?.[1] ?? 14);
      if (this.list.length < (cfg.max || 1)) this.spawn(game);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.age += dt;
      c.appear = Math.min(1, c.age * 3);
      if (c.age > c.life) {
        game.fx.puff(c.x, c.y, 6, { color: '#cfe0c0' });
        this.list.splice(i, 1);
      }
    }
  }

  spawn(game) {
    const avoid = [{ x: game.cat.x, y: game.cat.y, r: 110 }];
    for (const it of game.items) if (it.state === 'rest') avoid.push({ x: it.x, y: it.y, r: 22 });
    for (const p of game.treats) if (!p.taken) avoid.push({ x: p.x, y: p.y, r: 30 });
    for (const b of game.boxes) avoid.push({ x: b.x, y: b.y, r: 34 });
    const spot = game.room.randomSpot(avoid, 90, 26);
    this.list.push({ x: spot.x, y: spot.y, z: spot.z, angle: rand(0, TAU), age: 0, appear: 0, life: this.cfg.life || 9 });
    game.fx.puff(spot.x, spot.y, 5, { color: '#cfe0c0' });
  }
}
