// Hazards, pickups, the laser dot and little speech bubbles.
import { INK, INK_SOFT, ell, circle, roundRectPath, fillInk, inkStroke } from './draw.js';
import { TAU, FONT } from '../util.js';

export function drawVacuum(ctx, v, t) {
  ctx.save();
  ctx.translate(v.x, v.y);
  // shadow
  ell(ctx, 1.5, 2.5, v.r + 1, v.r + 0.5);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.22)';
  ctx.fill();
  ctx.rotate(v.angle);
  // spinning side brush peeking out at the front-left
  ctx.save();
  ctx.translate(v.r * 0.62, -v.r * 0.62);
  ctx.rotate(v.brush);
  ctx.strokeStyle = 'rgba(75, 51, 38, 0.6)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, 0, 0, v.r);
  fillInk(ctx, '#f2f1ed', 1.6);
  // front bumper
  ctx.beginPath();
  ctx.arc(0, 0, v.r - 1.6, -Math.PI * 0.45, Math.PI * 0.45);
  ctx.strokeStyle = '#5d6470';
  ctx.lineWidth = 3;
  ctx.stroke();
  circle(ctx, -1, 0, v.r * 0.62);
  ctx.fillStyle = '#d8dadc';
  ctx.fill();
  inkStroke(ctx, 0.8, INK_SOFT);
  circle(ctx, -1, 0, v.r * 0.28);
  ctx.fillStyle = '#5d6470';
  ctx.fill();
  // status light: green when roaming, blue when frozen
  const blink = Math.sin(t * 6) > 0 ? 1 : 0.5;
  circle(ctx, v.r * 0.55, 0, 1.8);
  ctx.fillStyle = v.frozen ? '#7ec8f0' : `rgba(110, 200, 120, ${blink})`;
  ctx.fill();
  ctx.restore();
}

export function drawCucumber(ctx, c, t) {
  const k = c.appear;
  if (k <= 0) return;
  ctx.save();
  ctx.translate(c.x, c.y);
  const s = (1 + c.z * 0.0036) * (k < 1 ? 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.25 : 1);
  ell(ctx, 1.5, 2.5, 14 * s, 5 * s, c.angle);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.2)';
  ctx.fill();
  ctx.rotate(c.angle);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.bezierCurveTo(-13, -5.5, 13, -6.5, 13.5, -0.5);
  ctx.bezierCurveTo(13.5, 4.5, -13, 5.5, -13, 0);
  ctx.closePath();
  fillInk(ctx, '#5e8a4f', 1.5);
  ctx.beginPath();
  ctx.moveTo(-10, -1.5);
  ctx.bezierCurveTo(-4, -4.4, 6, -4.6, 11, -2);
  ctx.strokeStyle = 'rgba(200, 230, 170, 0.6)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(220, 240, 200, 0.7)';
  for (let i = 0; i < 7; i++) {
    circle(ctx, -9 + i * 3.2, (i % 2 ? 1.6 : -0.6), 0.6);
    ctx.fill();
  }
  ell(ctx, 13.6, -0.4, 1.4, 2);
  ctx.fillStyle = '#a7c48f';
  ctx.fill();
  ctx.restore();
}

export function drawTreat(ctx, tr, t) {
  const k = Math.min(1, tr.age * 4);
  if (k <= 0) return;
  const bob = Math.sin(t * 4 + tr.x) * 1.2;
  ctx.save();
  ctx.translate(tr.x, tr.y);
  const s = (1 + tr.z * 0.0036) * (0.3 + 0.7 * k + Math.sin(k * Math.PI) * 0.3);
  // glow ring
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  circle(ctx, 0, 0, 11 + pulse * 2);
  ctx.fillStyle = `rgba(255, 228, 150, ${0.25 + pulse * 0.15})`;
  ctx.fill();
  ell(ctx, 1, 3, 7 * s, 3 * s);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.18)';
  ctx.fill();
  ctx.translate(0, bob - 2);
  ctx.scale(s, s);
  ctx.rotate(-0.3);
  // fish-shaped treat
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-1, -6, 5, 0);
  ctx.quadraticCurveTo(-1, 6, -7, 0);
  ctx.closePath();
  ctx.moveTo(4, 0);
  ctx.lineTo(9, -4);
  ctx.lineTo(8.4, 0);
  ctx.lineTo(9, 4);
  ctx.closePath();
  fillInk(ctx, '#d98c4a', 1.3);
  circle(ctx, -3.6, -0.8, 0.9);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.5, -2.6);
  ctx.quadraticCurveTo(1, 0, -0.5, 2.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

export function drawBox(ctx, b, t) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const s = 1 + b.z * 0.0036;
  ctx.scale(s, s);
  roundRectPath(ctx, -16 + 3, -14 + 4, 32, 28, 2);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.22)';
  ctx.fill();
  if (b.used) {
    // flattened after use
    roundRectPath(ctx, -17, -14, 34, 28, 2);
    fillInk(ctx, '#c79a68', 1.5);
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.lineTo(17, 0);
    ctx.strokeStyle = 'rgba(90,60,30,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(240, 225, 190, 0.6)';
    ctx.fillRect(-3, -14, 6, 28);
    ctx.restore();
    return;
  }
  const wig = b.occupied ? Math.sin(t * 20) * 0.6 : 0;
  // flaps folded outward
  ctx.fillStyle = '#d6aa76';
  const flap = (x0, y0, x1, y1, x2, y2, x3, y3) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    fillInk(ctx, '#d6aa76', 1.3);
  };
  flap(-15, -13, 15, -13, 13 + wig, -21, -13 + wig, -21);
  flap(-15, 13, 15, 13, 13, 20, -13, 20);
  flap(-15, -13, -15, 13, -22, 11, -22, -11);
  flap(15, -13, 15, 13, 22 + wig, 11, 22 + wig, -11);
  roundRectPath(ctx, -15, -13, 30, 26, 1.5);
  fillInk(ctx, '#c4925c', 1.6);
  roundRectPath(ctx, -12.5, -10.5, 25, 21, 1);
  ctx.fillStyle = '#9b6e40';
  ctx.fill();
  ctx.fillStyle = 'rgba(240, 225, 190, 0.7)';
  ctx.fillRect(-3, -21, 6, 8);
  // a hint sparkle so it reads as a pickup
  if (!b.occupied) {
    const tw = (Math.sin(t * 3 + b.x) + 1) / 2;
    sparkle(ctx, 14, -18, 2 + tw * 2, `rgba(255, 245, 210, ${0.5 + tw * 0.5})`);
  }
  ctx.restore();
}

export function sparkle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.quadraticCurveTo(x, y, x + r * 1.6, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 1.6);
  ctx.quadraticCurveTo(x, y, x - r * 1.6, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 1.6);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Warm parallelogram of light, split into window panes, with drifting dust. */
export function drawSunbeam(ctx, sb, t) {
  const { x, y, w, h, skew } = sb;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pane = (u0, u1, v0, v1) => {
    const px = (u, v) => x + skew * (1 - v) + w * u;
    const py = (v) => y + h * v;
    ctx.beginPath();
    ctx.moveTo(px(u0, v0), py(v0));
    ctx.lineTo(px(u1, v0), py(v0));
    ctx.lineTo(px(u1, v1), py(v1));
    ctx.lineTo(px(u0, v1), py(v1));
    ctx.closePath();
    ctx.fill();
  };
  const flick = 0.03 * Math.sin(t * 1.3);
  ctx.fillStyle = `rgba(255, 214, 120, ${0.16 + flick})`;
  pane(-0.04, 1.04, -0.04, 1.04);
  ctx.fillStyle = `rgba(255, 226, 150, ${0.2 + flick})`;
  pane(0.03, 0.48, 0.04, 0.48);
  pane(0.52, 0.97, 0.04, 0.48);
  pane(0.03, 0.48, 0.52, 0.96);
  pane(0.52, 0.97, 0.52, 0.96);
  // dust motes
  ctx.fillStyle = 'rgba(255, 250, 225, 0.75)';
  for (let i = 0; i < 9; i++) {
    const u = (i * 0.137 + Math.sin(t * 0.3 + i) * 0.08 + 1) % 1;
    const v = (i * 0.291 + t * 0.03 * (1 + (i % 3))) % 1;
    const mx = x + skew * (1 - v) + w * u;
    const my = y + h * v;
    ctx.fillRect(mx, my, 1.4, 1.4);
  }
  ctx.restore();
}

let laserGlow = null;
function getGlow() {
  if (laserGlow) return laserGlow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255, 60, 60, 0.9)');
  grd.addColorStop(0.25, 'rgba(255, 40, 50, 0.45)');
  grd.addColorStop(1, 'rgba(255, 30, 40, 0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  laserGlow = c;
  return c;
}

export function drawLaser(ctx, laser, t) {
  if (!laser.on && laser.fade <= 0) return;
  const a = laser.on ? 1 : laser.fade;
  const jx = Math.sin(t * 53) * 0.5 + Math.sin(t * 31) * 0.3;
  const jy = Math.cos(t * 47) * 0.5 + Math.cos(t * 29) * 0.3;
  const x = laser.x + jx;
  const y = laser.y + jy;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  // short trail
  const tr = laser.trail;
  for (let i = 0; i < tr.length; i += 2) {
    const k = 1 - i / tr.length;
    ctx.globalAlpha = a * k * 0.35;
    ctx.drawImage(getGlow(), tr[i] - 7 * k, tr[i + 1] - 7 * k, 14 * k, 14 * k);
  }
  ctx.globalAlpha = a;
  const pulse = 1 + Math.sin(t * 18) * 0.08;
  ctx.drawImage(getGlow(), x - 16 * pulse, y - 16 * pulse, 32 * pulse, 32 * pulse);
  ctx.globalCompositeOperation = 'source-over';
  circle(ctx, x, y, 3.3);
  ctx.fillStyle = '#ff3b3b';
  ctx.fill();
  circle(ctx, x - 0.3, y - 0.3, 1.6);
  ctx.fillStyle = '#ffe3e3';
  ctx.fill();
  ctx.restore();
}

/** A small "!" style bubble above something. */
export function drawMark(ctx, x, y, text, k) {
  const s = Math.min(1, k * 5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  roundRectPath(ctx, -8, -10, 16, 15, 6);
  ctx.fillStyle = '#fffaf1';
  ctx.fill();
  inkStroke(ctx, 1.3);
  ctx.beginPath();
  ctx.moveTo(-2, 5);
  ctx.lineTo(0, 9);
  ctx.lineTo(3, 5);
  ctx.fillStyle = '#fffaf1';
  ctx.fill();
  ctx.fillStyle = '#e5574f';
  ctx.font = `900 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -2.2);
  ctx.restore();
}

/** Fanny's speech bubble at the door. */
export function drawSpeech(ctx, x, y, text, k) {
  const s = Math.min(1, k * 4);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.font = `800 13px ${FONT}`;
  const w = ctx.measureText(text).width + 20;
  roundRectPath(ctx, -w / 2, -14, w, 26, 12);
  ctx.fillStyle = '#fffaf1';
  ctx.fill();
  inkStroke(ctx, 1.6);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -0.5);
  ctx.restore();
}
