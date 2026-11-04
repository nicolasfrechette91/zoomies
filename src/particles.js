// Juice: dust puffs, shards, splashes, hearts, sparkles, floating score text and screen shake.
import { INK, INK_SOFT, circle, ell } from './art/draw.js';
import { sparkle } from './art/props.js';
import { TAU, rand, clamp, easeOutBack, FONT } from './util.js';

const MAX = 280;

export class FX {
  constructor() {
    this.p = [];
    this.texts = [];
    this.shake = 0;
    this.sx = 0;
    this.sy = 0;
  }

  clear() {
    this.p.length = 0;
    this.texts.length = 0;
    this.shake = 0;
  }

  addShake(a) {
    this.shake = Math.min(11, this.shake + a);
  }

  add(o) {
    if (this.p.length >= MAX) this.p.shift();
    o.age = 0;
    o.z = o.z || 0;
    o.vz = o.vz || 0;
    o.rot = o.rot || 0;
    o.vr = o.vr || 0;
    this.p.push(o);
    return o;
  }

  puff(x, y, n = 6, opts = {}) {
    const spread = opts.spread ?? 1;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(20, 70) * spread;
      this.add({
        k: 'dust',
        x: x + Math.cos(a) * 3,
        y: y + Math.sin(a) * 3,
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        r: rand(2.5, 5) * (opts.size || 1),
        life: rand(0.35, 0.6),
        color: opts.color || '#f1e6d4',
      });
    }
  }

  shards(x, y, z, colors, n = 10, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 140) * power;
      this.add({
        k: 'shard',
        x, y, z: z + 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: rand(60, 170) * power,
        r: rand(1.5, 3.2),
        life: rand(0.5, 0.8),
        color: colors[i % colors.length],
        rot: rand(0, TAU),
        vr: rand(-18, 18),
      });
    }
  }

  drops(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(30, 110);
      this.add({ k: 'drop', x, y, z: 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(50, 140), r: rand(1.2, 2.4), life: rand(0.4, 0.7), color });
    }
  }

  leaves(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const sp = rand(20, 70);
      this.add({ k: 'leaf', x, y, z: 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 120), r: rand(3, 4.5), life: rand(0.7, 1.1), color: i % 2 ? '#7fa36b' : '#5e8a55', rot: rand(0, TAU), vr: rand(-8, 8) });
    }
  }

  hearts(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'heart', x: x + rand(-8, 8), y: y + rand(-6, 4), vx: rand(-12, 12), vy: rand(-45, -28), r: rand(3.2, 4.6), life: rand(0.9, 1.3), color: i % 2 ? '#f28b9b' : '#ef6f86', rot: rand(0, TAU) });
    }
  }

  sparkles(x, y, n = 6, color = '#fff2b8', radius = 16) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const d = rand(4, radius);
      this.add({ k: 'spark', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20 - 10, r: rand(2, 3.6), life: rand(0.4, 0.75), color });
    }
  }

  stars(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, r: 2.8, life: 0.55, color: '#ffd76a' });
    }
  }

  zzz(x, y) {
    this.add({ k: 'zzz', x, y, vx: rand(4, 10), vy: -18, r: rand(7, 10), life: 1.4, phase: rand(0, TAU) });
  }

  text(x, y, str, opts = {}) {
    this.texts.push({
      x, y, str,
      sub: opts.sub || '',
      color: opts.color || '#fffaf1',
      size: opts.size || 15,
      life: opts.life || 1.0,
      rise: opts.rise ?? 34,
      age: 0,
    });
    if (this.texts.length > 16) this.texts.shift();
  }

  update(dt) {
    this.shake *= Math.exp(-11 * dt);
    if (this.shake < 0.05) this.shake = 0;
    this.sx = (Math.random() - 0.5) * 2 * this.shake;
    this.sy = (Math.random() - 0.5) * 2 * this.shake;
    const p = this.p;
    for (let i = p.length - 1; i >= 0; i--) {
      const o = p[i];
      o.age += dt;
      if (o.age >= o.life) {
        p[i] = p[p.length - 1];
        p.pop();
        continue;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rot += o.vr * dt;
      switch (o.k) {
        case 'dust':
          o.vx *= Math.exp(-5 * dt);
          o.vy *= Math.exp(-5 * dt);
          break;
        case 'shard':
        case 'drop':
        case 'leaf':
          o.vz -= (o.k === 'leaf' ? 260 : 620) * dt;
          o.z += o.vz * dt;
          if (o.z <= 0) {
            o.z = 0;
            o.vz = -o.vz * 0.3;
            o.vx *= 0.5;
            o.vy *= 0.5;
            o.vr *= 0.5;
          }
          break;
        case 'heart':
          o.vx += Math.sin(o.age * 6 + o.rot) * 40 * dt;
          break;
        case 'spark':
          o.vx *= Math.exp(-4 * dt);
          o.vy *= Math.exp(-4 * dt);
          break;
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const tx = this.texts[i];
      tx.age += dt;
      if (tx.age >= tx.life) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const o of this.p) {
      const k = o.age / o.life;
      const a = 1 - k;
      const y = o.y - o.z * 0.55;
      switch (o.k) {
        case 'dust': {
          const r = o.r * (1 + k * 1.3);
          ctx.globalAlpha = 0.75 * a;
          circle(ctx, o.x, o.y, r);
          ctx.fillStyle = o.color;
          ctx.fill();
          ctx.lineWidth = 0.7;
          ctx.strokeStyle = INK_SOFT;
          ctx.stroke();
          break;
        }
        case 'shard': {
          ctx.globalAlpha = clamp(a * 2, 0, 1);
          ctx.save();
          ctx.translate(o.x, y);
          ctx.rotate(o.rot);
          ctx.beginPath();
          ctx.moveTo(-o.r, -o.r * 0.5);
          ctx.lineTo(o.r, -o.r * 0.7);
          ctx.lineTo(o.r * 0.2, o.r);
          ctx.closePath();
          ctx.fillStyle = o.color;
          ctx.fill();
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = INK;
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'drop':
          ctx.globalAlpha = clamp(a * 2, 0, 1);
          circle(ctx, o.x, y, o.r);
          ctx.fillStyle = o.color;
          ctx.fill();
          break;
        case 'leaf':
          ctx.globalAlpha = clamp(a * 2, 0, 1);
          ell(ctx, o.x, y, o.r, o.r * 0.5, o.rot);
          ctx.fillStyle = o.color;
          ctx.fill();
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = INK_SOFT;
          ctx.stroke();
          break;
        case 'heart': {
          ctx.globalAlpha = clamp(a * 1.6, 0, 1);
          const r = o.r * (k < 0.15 ? k / 0.15 : 1);
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + r * 0.9);
          ctx.bezierCurveTo(o.x - r * 1.6, o.y - r * 0.2, o.x - r * 0.7, o.y - r * 1.4, o.x, o.y - r * 0.5);
          ctx.bezierCurveTo(o.x + r * 0.7, o.y - r * 1.4, o.x + r * 1.6, o.y - r * 0.2, o.x, o.y + r * 0.9);
          ctx.fillStyle = o.color;
          ctx.fill();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = INK;
          ctx.stroke();
          break;
        }
        case 'spark':
          ctx.globalAlpha = a;
          sparkle(ctx, o.x, o.y, o.r * (1 - k * 0.5), o.color);
          break;
        case 'zzz':
          ctx.globalAlpha = clamp(a * 1.5, 0, 1);
          ctx.font = `900 ${o.r}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#fffaf1';
          const zx = o.x + Math.sin(o.age * 3 + o.phase) * 4;
          ctx.strokeText('z', zx, o.y);
          ctx.fillStyle = '#7b8fb8';
          ctx.fillText('z', zx, o.y);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const tx of this.texts) {
      const k = tx.age / tx.life;
      const pop = tx.age < 0.22 ? easeOutBack(tx.age / 0.22) : 1;
      const y = tx.y - tx.rise * Math.min(1, k * 1.6);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.save();
      ctx.translate(tx.x, y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${tx.size}px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(tx.str, 0, 0);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.str, 0, 0);
      if (tx.sub) {
        ctx.font = `800 ${tx.size * 0.62}px ${FONT}`;
        ctx.lineWidth = 3;
        ctx.strokeText(tx.sub, 0, tx.size * 0.85);
        ctx.fillStyle = '#ffe08a';
        ctx.fillText(tx.sub, 0, tx.size * 0.85);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
