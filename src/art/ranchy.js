// Ranchy, drawn entirely with canvas shapes.
// Orange-and-white bicolor: orange back and head, white blaze + muzzle,
// white chest/belly and paws, amber eyes, fluffy orange tail with faint rings.
import { INK, INK_SOFT, paint, ell, circle } from './draw.js';
import { TAU, clamp } from '../util.js';

export const FUR = {
  orange: '#eba25c',
  orangeHi: 'rgba(255, 214, 160, 0.55)',
  orangeDeep: '#d4843f',
  ring: '#dd9150',
  stripe: 'rgba(176, 96, 38, 0.42)',
  white: '#fff9f0',
  whiteShade: '#efe2d1',
  earPink: '#f2b3ac',
  nose: '#e98f8c',
  eye: '#e2ad3f',
  eyeDeep: '#b98326',
  pupil: '#2b1d14',
  tongue: '#f08c8c',
  blush: 'rgba(240, 140, 130, 0.28)',
};

const OL = 1.35; // outline half width, in world units
export const TAIL_SEG = 3.3;
/** Ranchy is drawn a bit larger than his collision circle so he reads well on small screens. */
export const CAT_DRAW_SCALE = 1.14;
const tailPts = new Float32Array(64);

function limb(ctx, mode, x0, y0, x1, y1, w, color = FUR.orange) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  if (mode === 0) {
    ctx.lineWidth = w + OL * 2;
    ctx.stroke();
    ctx.lineWidth = OL * 2;
  } else {
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = OL * 2;
  }
}

function paw(ctx, mode, x, y, rot = 0, s = 1) {
  ell(ctx, x, y, 3.1 * s, 2.55 * s, rot);
  paint(ctx, mode, FUR.white);
}

/** A paw drawn on top of everything, with its own outline. */
function stickerPaw(ctx, x, y, rot = 0, s = 1) {
  ell(ctx, x, y, 3.1 * s, 2.55 * s, rot);
  ctx.lineWidth = OL * 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = FUR.white;
  ctx.fill();
}

function fluffPath(ctx, x, y, rx, ry, amt, spikes = 20) {
  ctx.beginPath();
  for (let i = 0; i <= spikes; i++) {
    const a = (i / spikes) * TAU;
    const k = i % 2 === 0 ? 1 + amt : 1 - amt * 0.25;
    const px = x + Math.cos(a) * rx * k;
    const py = y + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function bodyBlob(ctx, mode, x, y, rx, ry, puff) {
  if (puff > 0.05) fluffPath(ctx, x, y, rx, ry, 0.16 * puff, 22);
  else ell(ctx, x, y, rx, ry);
  paint(ctx, mode, FUR.orange);
}

// ---------------------------------------------------------------- head (top-down)

function eyesTop(ctx, e) {
  const closed = e.eyes === 'closed' || e.blink > 0.5;
  for (let s = -1; s <= 1; s += 2) {
    const x = 3.6;
    const y = s * 4.5;
    if (closed || e.eyes === 'happy') {
      ctx.beginPath();
      ctx.moveTo(x - 1.9, y);
      ctx.quadraticCurveTo(x, y + (e.eyes === 'happy' ? -1.8 : 1.5) * s * -1, x + 1.9, y);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = INK;
      ctx.stroke();
      continue;
    }
    const big = e.eyes === 'wide' ? 1.22 : 1;
    ell(ctx, x, y, 2.35 * big, 2.05 * big, s * 0.35);
    ctx.fillStyle = FUR.eye;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
    const dil = e.eyes === 'wide' || e.eyes === 'dilated';
    if (dil) circle(ctx, x + 0.3, y, 1.35 * big);
    else ell(ctx, x + 0.3, y, 1.25, 0.75, 0);
    ctx.fillStyle = FUR.pupil;
    ctx.fill();
    circle(ctx, x + 0.9, y - 0.6 * s - 0.2, 0.55);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

/** Head seen from above, facing +x. e = {eyes, blink, ears (0 perked..1 flat), tongue} */
export function headTop(ctx, mode, e) {
  const f = e.ears || 0;
  for (let s = -1; s <= 1; s += 2) {
    const tx = -1.5 - f * 5.5;
    const ty = s * (12.4 - f * 2.4);
    ctx.beginPath();
    ctx.moveTo(-6, s * 4.0);
    ctx.quadraticCurveTo(-4.6 - f * 3, s * (10 - f * 1.5), tx, ty);
    ctx.quadraticCurveTo(1.8 - f * 3, s * (11.6 - f * 2), 3.4 - f * 2, s * 7.4);
    ctx.closePath();
    paint(ctx, mode, FUR.orange);
  }
  ell(ctx, 0, 0, 8.7, 9.4);
  paint(ctx, mode, FUR.orange);
  ell(ctx, 5.9, 0, 3.5, 4.6);
  paint(ctx, mode, FUR.white);
  if (mode === 0) return;

  // inner ears
  ctx.fillStyle = FUR.earPink;
  for (let s = -1; s <= 1; s += 2) {
    const tx = -1.5 - f * 5.5;
    const ty = s * (12.4 - f * 2.4);
    ctx.beginPath();
    ctx.moveTo(-4.2, s * 5.4);
    ctx.quadraticCurveTo(-3.6 - f * 3, s * (9.4 - f * 1.4), tx + 0.5, ty - s * 1.6);
    ctx.quadraticCurveTo(0.6 - f * 3, s * (9.8 - f * 2), 1.4 - f * 2, s * 7.2);
    ctx.closePath();
    ctx.fill();
  }
  // soft highlight on the crown
  ell(ctx, -2.5, -2.5, 4.5, 3.2, -0.3);
  ctx.fillStyle = FUR.orangeHi;
  ctx.fill();
  // white blaze running from the muzzle up between the eyes
  ctx.fillStyle = FUR.white;
  ctx.beginPath();
  ctx.moveTo(7.6, -3.9);
  ctx.quadraticCurveTo(2.4, -2.5, -3.6, -0.35);
  ctx.quadraticCurveTo(-4.3, 0, -3.6, 0.35);
  ctx.quadraticCurveTo(2.4, 2.5, 7.6, 3.9);
  ctx.closePath();
  ctx.fill();
  // faint tabby marks on the crown
  ctx.strokeStyle = FUR.stripe;
  ctx.lineWidth = 1.05;
  for (let s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.moveTo(-6, s * 2.6);
    ctx.quadraticCurveTo(-3.6, s * 3.4, -1.4, s * 3.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6.6, s * 5.2);
    ctx.quadraticCurveTo(-4.4, s * 5.6, -2.8, s * 5.8);
    ctx.stroke();
  }
  eyesTop(ctx, e);
  // nose
  ctx.beginPath();
  ctx.moveTo(9.5, -1.4);
  ctx.quadraticCurveTo(10.1, 0, 9.5, 1.4);
  ctx.lineTo(7.9, 0);
  ctx.closePath();
  ctx.fillStyle = FUR.nose;
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (e.tongue) {
    ell(ctx, 10.3, 0.6, 1.4, 1.0);
    ctx.fillStyle = FUR.tongue;
    ctx.fill();
  }
  // whiskers
  ctx.strokeStyle = 'rgba(75, 51, 38, 0.3)';
  ctx.lineWidth = 0.4;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.moveTo(7.6, s * (3.4 + k * 0.8));
      ctx.quadraticCurveTo(10.5, s * (6 + k * 1.4), 10.5 + k * 1.5, s * (9.5 + k * 1.8));
      ctx.stroke();
    }
  }
  // subtle line where the head meets the neck
  ctx.beginPath();
  ctx.arc(0, 0, 8.4, Math.PI * 0.7, Math.PI * 1.3);
  ctx.strokeStyle = 'rgba(150, 80, 30, 0.35)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = OL * 2;
}

function headAt(ctx, mode, x, y, rot, e, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (s !== 1) ctx.scale(s, s);
  headTop(ctx, mode, e);
  ctx.restore();
}

// ---------------------------------------------------------------- face (front view)

/**
 * Front-facing face, centered at 0,0 with "up" = -y. Head is about 21 units wide.
 * Used for belly-up, the box, the title portrait and the app icon.
 */
export function faceFront(ctx, mode, e = {}) {
  const earTw = e.earTwitch || 0;
  // ears
  for (let s = -1; s <= 1; s += 2) {
    const tw = s > 0 ? earTw : 0;
    ctx.beginPath();
    ctx.moveTo(s * 10.2, -2.5);
    ctx.quadraticCurveTo(s * (11 + tw), -10, s * (9.6 + tw * 1.5), -14.2 + tw);
    ctx.quadraticCurveTo(s * 6, -11.5, s * 2.6, -8.2);
    ctx.closePath();
    paint(ctx, mode, FUR.orange);
  }
  // head with cheek fluff
  ctx.beginPath();
  ctx.moveTo(0, -9.6);
  ctx.bezierCurveTo(7, -9.8, 10.8, -6, 11, -1.5);
  ctx.quadraticCurveTo(12.6, 1.2, 11.2, 2.4);
  ctx.quadraticCurveTo(12.2, 4.6, 10, 5.4);
  ctx.bezierCurveTo(8, 8.8, 4, 9.6, 0, 9.6);
  ctx.bezierCurveTo(-4, 9.6, -8, 8.8, -10, 5.4);
  ctx.quadraticCurveTo(-12.2, 4.6, -11.2, 2.4);
  ctx.quadraticCurveTo(-12.6, 1.2, -11, -1.5);
  ctx.bezierCurveTo(-10.8, -6, -7, -9.8, 0, -9.6);
  ctx.closePath();
  paint(ctx, mode, FUR.orange);
  if (mode === 0) return;

  // inner ears + fluff
  for (let s = -1; s <= 1; s += 2) {
    const tw = s > 0 ? earTw : 0;
    ctx.beginPath();
    ctx.moveTo(s * 9, -4);
    ctx.quadraticCurveTo(s * (9.6 + tw), -9.5, s * (9 + tw * 1.4), -12.2 + tw);
    ctx.quadraticCurveTo(s * 6.2, -10, s * 4.2, -7.6);
    ctx.closePath();
    ctx.fillStyle = FUR.earPink;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * (6.4 + k * 0.9), -6.6 - k * 0.3);
      ctx.lineTo(s * (7.6 + k * 0.6), -9.6 - k * 0.6);
      ctx.stroke();
    }
  }
  // crown highlight
  ell(ctx, -3.5, -6.2, 4.5, 2.2, -0.2);
  ctx.fillStyle = FUR.orangeHi;
  ctx.fill();
  // tabby forehead marks
  ctx.strokeStyle = FUR.stripe;
  ctx.lineWidth = 0.9;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * (2.4 + k * 1.5), -9.2 + k * 0.15);
      ctx.quadraticCurveTo(s * (2.9 + k * 1.6), -7.4, s * (2.6 + k * 1.5), -5.8 + k * 0.3);
      ctx.stroke();
    }
  }
  // white blaze + muzzle + chin (a touch wider on Ranchy's right cheek)
  ctx.beginPath();
  ctx.moveTo(-0.8, -9.4);
  ctx.lineTo(0.8, -9.4);
  ctx.quadraticCurveTo(1.3, -4.6, 2.7, -1.6);
  ctx.bezierCurveTo(7.4, -0.6, 8.6, 4.8, 6.4, 7.4);
  ctx.quadraticCurveTo(3.4, 9.7, 0, 9.6);
  ctx.quadraticCurveTo(-4.4, 9.7, -7.2, 7.2);
  ctx.bezierCurveTo(-9.8, 4.6, -8.4, -0.8, -2.7, -1.6);
  ctx.quadraticCurveTo(-1.3, -4.6, -0.8, -9.4);
  ctx.closePath();
  ctx.fillStyle = FUR.white;
  ctx.fill();
  // blush
  ell(ctx, -6.8, 3.4, 2.2, 1.3);
  ctx.fillStyle = FUR.blush;
  ctx.fill();
  ell(ctx, 6.8, 3.4, 2.2, 1.3);
  ctx.fill();
  // eyes
  const closed = e.eyes === 'closed' || (e.blink || 0) > 0.5;
  for (let s = -1; s <= 1; s += 2) {
    const ex = s * 4.6;
    const ey = -2.4;
    if (closed || e.eyes === 'happy') {
      ctx.beginPath();
      if (e.eyes === 'happy') {
        ctx.moveTo(ex - 2.2, ey + 0.6);
        ctx.quadraticCurveTo(ex, ey - 2, ex + 2.2, ey + 0.6);
      } else {
        ctx.moveTo(ex - 2.3, ey);
        ctx.quadraticCurveTo(ex, ey + 1.6, ex + 2.3, ey);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      continue;
    }
    ell(ctx, ex, ey, 2.55, 2.75);
    const g = ctx.createRadialGradient(ex, ey + 0.3, 0.3, ex, ey, 2.8);
    g.addColorStop(0, '#f3cf6a');
    g.addColorStop(0.65, FUR.eye);
    g.addColorStop(1, FUR.eyeDeep);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    const wide = e.eyes === 'wide' || e.eyes === 'dilated';
    ell(ctx, ex + (e.lookX || 0) * 0.6, ey + 0.1, wide ? 1.6 : 1.05, wide ? 2.05 : 2.1);
    ctx.fillStyle = FUR.pupil;
    ctx.fill();
    circle(ctx, ex - 0.8, ey - 1.1, 0.7);
    ctx.fillStyle = '#fff';
    ctx.fill();
    circle(ctx, ex + 0.9, ey + 0.9, 0.32);
    ctx.fill();
  }
  // nose
  ctx.beginPath();
  ctx.moveTo(-1.6, 1.1);
  ctx.quadraticCurveTo(0, 0.6, 1.6, 1.1);
  ctx.quadraticCurveTo(0.6, 2.4, 0, 2.6);
  ctx.quadraticCurveTo(-0.6, 2.4, -1.6, 1.1);
  ctx.closePath();
  ctx.fillStyle = FUR.nose;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.55;
  ctx.stroke();
  // mouth
  ctx.beginPath();
  ctx.moveTo(0, 2.6);
  ctx.lineTo(0, 3.4);
  ctx.quadraticCurveTo(-0.9, 4.4, -2, 3.8);
  ctx.moveTo(0, 3.4);
  ctx.quadraticCurveTo(0.9, 4.4, 2, 3.8);
  ctx.lineWidth = 0.55;
  ctx.stroke();
  if (e.mouthOpen) {
    ell(ctx, 0, 4.6, 1.3, 1.1 * e.mouthOpen);
    ctx.fillStyle = '#9c4a46';
    ctx.fill();
  }
  // whiskers
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 0.4;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * 3.2, 2.6 + k * 0.6);
      ctx.quadraticCurveTo(s * 8, 1.6 + k * 1.2, s * 13.5, 0.4 + k * 2.2);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = OL * 2;
}

function stickerFace(ctx, x, y, rot, s, e) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.lineWidth = (OL * 2) / s;
  faceFront(ctx, 0, e);
  faceFront(ctx, 1, e);
  ctx.restore();
  ctx.lineWidth = OL * 2;
}

// ---------------------------------------------------------------- tail

function computeTail(c) {
  const n = c.tailA.length;
  const ch = Math.cos(c.heading);
  const sh = Math.sin(c.heading);
  let x = c.rumpX * ch - c.rumpY * sh;
  let y = c.rumpX * sh + c.rumpY * ch;
  for (let i = 0; i < n; i++) {
    x += Math.cos(c.tailA[i]) * TAIL_SEG;
    y += Math.sin(c.tailA[i]) * TAIL_SEG;
    tailPts[i * 2] = x;
    tailPts[i * 2 + 1] = y;
  }
  return n;
}

function drawTail(ctx, mode, c, n) {
  const puff = 1 + c.puff * 0.75;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const r = (3.5 + 1.9 * Math.sin(Math.PI * Math.min(1, u * 1.08 + 0.08))) * puff;
    circle(ctx, tailPts[i * 2], tailPts[i * 2 + 1], r);
    paint(ctx, mode, i % 2 === 1 ? FUR.ring : FUR.orange);
  }
}

// ---------------------------------------------------------------- body poses (local: +x forward)

function headOpts(c) {
  return { eyes: c.eyes, blink: c.blink, ears: c.earsBack, tongue: c.tongue };
}

function poseRun(ctx, mode, c, t) {
  const amp = clamp(c.speed / 210, 0, 1);
  const ph = c.phase;
  const pf = 1 + c.puff * 0.22;
  const ext = Math.sin(ph) * amp;
  const stride = 7.5 * amp;
  for (let s = -1; s <= 1; s += 2) {
    const o = s > 0 ? 0.5 : 0;
    const fx = 7.5 + stride * Math.sin(ph + o);
    const bx = -8.5 - stride * Math.sin(ph + o + 0.35);
    limb(ctx, mode, 4.5, s * 4.5, fx, s * 8.3 * pf, 4.3);
    paw(ctx, mode, fx + 1, s * 8.4 * pf, 0);
    limb(ctx, mode, -6, s * 5, bx, s * 8.6 * pf, 4.8);
    paw(ctx, mode, bx - 0.5, s * 8.7 * pf, 0);
  }
  bodyBlob(ctx, mode, -6 - 1.2 * ext, 0, 10.6 * pf, 9.6 * pf, c.puff);
  bodyBlob(ctx, mode, 4 + 1.2 * ext, 0, 10.4 * pf, 8.8 * pf, c.puff);
  if (mode === 1) bodyDetails(ctx, -1.2 * ext, pf);
  headAt(ctx, mode, 14.2 + 0.9 * ext, 0, c.look, headOpts(c));
}

function bodyDetails(ctx, dx, pf = 1) {
  // white bib peeking at the front of the chest
  for (let s = -1; s <= 1; s += 2) {
    ell(ctx, 9.5, s * 5.6 * pf, 3.6, 2.6, s * 0.5);
    ctx.fillStyle = FUR.white;
    ctx.fill();
    ell(ctx, -4 + dx, s * 8.4 * pf, 4.6, 1.5, 0);
    ctx.fill();
  }
  // back highlight
  ell(ctx, -1 + dx * 0.5, -2.2, 11.5, 3.6, 0);
  ctx.fillStyle = FUR.orangeHi;
  ctx.fill();
  // faint tabby bands across the back
  ctx.strokeStyle = FUR.stripe;
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const x = -12.5 + k * 4.6 + dx;
    ctx.beginPath();
    ctx.moveTo(x + 1.6, -6.4 * pf);
    ctx.quadraticCurveTo(x - 1.6, 0, x + 1.6, 6.4 * pf);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = OL * 2;
}

function poseSit(ctx, mode, c, t) {
  for (let s = -1; s <= 1; s += 2) paw(ctx, mode, -3.5, s * 11.4, 0, 0.95);
  bodyBlob(ctx, mode, -4, 0, 11.4, 11.6, 0);
  bodyBlob(ctx, mode, 4.5, 0, 7.6, 8.2, 0);
  for (let s = -1; s <= 1; s += 2) paw(ctx, mode, 16.2, s * 3.3, 0, 0.92);
  if (mode === 1) {
    ell(ctx, -4.5, -2.6, 7.5, 4.2, -0.2);
    ctx.fillStyle = FUR.orangeHi;
    ctx.fill();
    for (let s = -1; s <= 1; s += 2) {
      ell(ctx, 6.4, s * 5.6, 3.2, 2.4, s * 0.6);
      ctx.fillStyle = FUR.white;
      ctx.fill();
    }
    ctx.strokeStyle = FUR.stripe;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(-4, 0, 4 + k * 3.2, Math.PI * 0.62, Math.PI * 1.38);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = OL * 2;
  }
  const nod = c.pose === 'groom' ? Math.sin(t * 9) * 0.1 : 0;
  const turn = c.pose === 'groom' ? -0.55 : c.look;
  headAt(ctx, mode, 9.6, 0, turn + nod, headOpts(c));
  if (c.pose === 'groom' && mode === 1) {
    // raised paw at the mouth, moving in little licks
    const k = Math.sin(t * 9);
    stickerPaw(ctx, 13.5 + k * 0.8, -5.4 - k * 0.6, -0.4, 0.95);
  }
}

function poseCrouch(ctx, mode, c, t) {
  const wig = Math.sin(t * 24) * 2.2 * clamp(c.poseT * 3, 0, 1);
  for (let s = -1; s <= 1; s += 2) {
    paw(ctx, mode, 15.5, s * 6.2, 0);
    paw(ctx, mode, -9.5 + wig * 0.2, s * 9 + wig, 0);
  }
  bodyBlob(ctx, mode, -7, wig * 0.8, 10.4, 9.6, 0);
  bodyBlob(ctx, mode, 5, 0, 10.8, 8.4, 0);
  if (mode === 1) bodyDetails(ctx, 0);
  headAt(ctx, mode, 15.4, 0, c.look * 0.5, headOpts(c), 0.97);
}

function posePounce(ctx, mode, c, t) {
  for (let s = -1; s <= 1; s += 2) {
    limb(ctx, mode, 6, s * 4, 23, s * 5.5, 4.2);
    paw(ctx, mode, 24.5, s * 5.6, 0);
    limb(ctx, mode, -7, s * 4.5, -20, s * 5, 4.6);
    paw(ctx, mode, -21.5, s * 5, 0);
  }
  bodyBlob(ctx, mode, -8, 0, 11, 8.8, c.puff);
  bodyBlob(ctx, mode, 6.5, 0, 11.5, 8.2, c.puff);
  if (mode === 1) bodyDetails(ctx, -1);
  headAt(ctx, mode, 18.5, 0, 0, headOpts(c));
}

function poseBat(ctx, mode, c, t) {
  const side = c.swatSide || 1;
  const ext = c.swat;
  for (let s = -1; s <= 1; s += 2) {
    paw(ctx, mode, -8.5, s * 8.6, 0);
    if (s !== side) paw(ctx, mode, 8.5, s * 8.2, 0);
  }
  limb(ctx, mode, 6, side * 4, 12 + 11 * ext, side * (6 - 2 * ext), 4.2);
  paw(ctx, mode, 13 + 11 * ext, side * (6 - 2 * ext), 0, 1.05);
  bodyBlob(ctx, mode, -6, 0, 10.6, 9.6, 0);
  bodyBlob(ctx, mode, 4, 0, 10.4, 8.8, 0);
  if (mode === 1) bodyDetails(ctx, 0);
  headAt(ctx, mode, 14, 0, c.look * 0.6 + side * 0.15 * ext, headOpts(c));
}

function poseStretch(ctx, mode, c, t) {
  for (let s = -1; s <= 1; s += 2) {
    limb(ctx, mode, 8, s * 4, 22, s * 5.2, 4.2);
    paw(ctx, mode, 23.5, s * 5.2, 0);
    paw(ctx, mode, -10, s * 9.2, 0);
  }
  bodyBlob(ctx, mode, -7, 0, 11.4, 10.6, 0);
  bodyBlob(ctx, mode, 7, 0, 10.6, 7.8, 0);
  if (mode === 1) bodyDetails(ctx, 0);
  headAt(ctx, mode, 17, 0, 0, { eyes: 'closed', tongue: c.poseT < 0.35, ears: 0.3 });
}

function poseStartled(ctx, mode, c, t) {
  const pf = 1 + c.puff * 0.25;
  const jit = Math.sin(t * 40) * 0.8;
  for (let s = -1; s <= 1; s += 2) {
    limb(ctx, mode, 4, s * 5, 13 + jit, s * 14.5, 4.2);
    paw(ctx, mode, 14 + jit, s * 15.5, s * 0.6);
    limb(ctx, mode, -5, s * 5, -13 - jit, s * 14.5, 4.6);
    paw(ctx, mode, -14 - jit, s * 15.5, -s * 0.6);
  }
  bodyBlob(ctx, mode, -5.5, 0, 10.8 * pf, 10 * pf, c.puff);
  bodyBlob(ctx, mode, 4, 0, 10.4 * pf, 9.2 * pf, c.puff);
  if (mode === 1) bodyDetails(ctx, 0, pf);
  headAt(ctx, mode, 14.5, 0, 0, { eyes: 'wide', ears: 0.9 });
}

function poseBelly(ctx, mode, c, t) {
  const roll = Math.sin(t * 1.3) * 0.09;
  ctx.rotate(roll);
  const knead = Math.sin(t * 4.5);
  // back legs: orange thighs splayed, white feet in the air
  for (let s = -1; s <= 1; s += 2) {
    limb(ctx, mode, -7, s * 6, -3.5, s * 15, 5.6);
    paw(ctx, mode, -2.5, s * 16.6, s * 0.4, 1.08);
  }
  ell(ctx, -1, 0, 14.2, 10.8);
  paint(ctx, mode, FUR.orange);
  if (mode === 0) return;
  // white belly and chest, like the reference photo
  ell(ctx, 0.5, 0, 12, 7.8);
  ctx.fillStyle = FUR.white;
  ctx.fill();
  ell(ctx, 9.5, 0, 5.5, 6.8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 175, 150, 0.5)';
  ctx.lineWidth = 0.7;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-6 + k * 4, -2.5);
    ctx.quadraticCurveTo(-7 + k * 4, 0, -6 + k * 4, 2.5);
    ctx.stroke();
  }
  // front legs: orange upper with curled white paws on the chest
  ctx.strokeStyle = INK;
  ctx.lineWidth = OL * 2;
  for (let s = -1; s <= 1; s += 2) {
    const kk = s > 0 ? knead : -knead;
    ctx.beginPath();
    ctx.moveTo(5.5, s * 9.2);
    ctx.quadraticCurveTo(11, s * 11, 10.5 + kk * 0.6, s * 5.8);
    ctx.lineWidth = 4.2 + OL * 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = FUR.orange;
    ctx.stroke();
    stickerPaw(ctx, 9.8 + kk * 0.7, s * 4.6, s * 0.8, 1.02);
  }
  // face, upside-down-ish and tilted, looking up at you
  stickerFace(ctx, 15.5, 0, Math.PI / 2 + 0.35 + roll, 0.86, {
    eyes: c.blink > 0.5 ? 'closed' : c.eyes === 'happy' ? 'happy' : 'open',
  });
}

function poseNap(ctx, mode, c, t) {
  const br = 1 + Math.sin(t * 2.4) * 0.025;
  ctx.scale(br, br);
  paw(ctx, mode, -6, 11.5, 0.3, 0.95);
  ell(ctx, -1.5, 0, 13.2, 12.4);
  paint(ctx, mode, FUR.orange);
  if (mode === 0) return;
  ell(ctx, -4, -3, 8, 5, -0.4);
  ctx.fillStyle = FUR.orangeHi;
  ctx.fill();
  ctx.strokeStyle = FUR.stripe;
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(-1.5, 0, 6 + k * 2.6, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = OL * 2;
  stickerPaw(ctx, 11.2, 4.8, 0.6, 0.95);
  ctx.save();
  ctx.translate(6, 4.6);
  ctx.rotate(2.1);
  headTop(ctx, 0, { eyes: 'closed', ears: 0.35 });
  headTop(ctx, 1, { eyes: 'closed', ears: 0.35 });
  ctx.restore();
  stickerPaw(ctx, 7.5, 11.2, 0.2, 0.95);
}

function poseBox(ctx, mode, c, t) {
  if (mode === 0) return;
  const peek = clamp(c.poseT * 4, 0, 1);
  stickerFace(ctx, 0, -1 + (1 - peek) * 4, Math.sin(t * 1.6) * 0.08, 0.82, {
    eyes: c.blink > 0.5 ? 'closed' : 'dilated',
    lookX: Math.sin(t * 0.8),
  });
  stickerPaw(ctx, -4.4, 7.4, 0, 0.95);
  stickerPaw(ctx, 4.4, 7.4, 0, 0.95);
}

const POSES = {
  run: poseRun,
  stand: poseRun,
  scared: poseRun,
  sit: poseSit,
  swish: poseSit,
  groom: poseSit,
  crouch: poseCrouch,
  pounce: posePounce,
  bat: poseBat,
  stretch: poseStretch,
  startled: poseStartled,
  belly: poseBelly,
  nap: poseNap,
  box: poseBox,
};

/** Draw the cat in world space. `c` is a Cat (see cat.js). */
export function drawCat(ctx, c, t) {
  const gap = Math.max(0, c.z - c.groundZ);
  const hs = (1 + c.z * 0.0036) * CAT_DRAW_SCALE;
  const pop = c.pop || 0;
  const flat = c.pose === 'belly' || c.pose === 'nap';

  // shadow on whatever is below
  ctx.save();
  ctx.translate(c.x + 1.5 + gap * 0.22, c.y + 2.5 + gap * 0.32);
  ctx.rotate(c.heading);
  const ss = (1 + c.groundZ * 0.0036) * clamp(1 - gap * 0.007, 0.55, 1) * CAT_DRAW_SCALE;
  ctx.scale(ss, ss);
  ctx.fillStyle = 'rgba(70, 40, 25, 0.2)';
  if (c.pose === 'box') ell(ctx, 0, 0, 0.01, 0.01);
  else if (flat) ell(ctx, -1, 0, 15.5, 13);
  else ell(ctx, -1, 0, 19, 11);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(hs, hs);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pose = POSES[c.pose] || poseRun;
  const n = c.pose === 'box' ? 0 : computeTail(c);
  for (let mode = 0; mode < 2; mode++) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = OL * 2;
    if (n) drawTail(ctx, mode, c, n);
    ctx.save();
    ctx.rotate(c.pose === 'box' ? 0 : c.heading);
    if (pop > 0) ctx.scale(1 + pop * 0.14, 1 - pop * 0.1);
    pose(ctx, mode, c, t);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- portrait (front, sitting)

/**
 * Big front-view portrait of Ranchy sitting, for menus and credits.
 * Drawn into a 200 x 220 box (scaled by caller). t animates blink and tail.
 */
export function drawPortrait(ctx, t, opts = {}) {
  const blink = opts.blink ?? (t % 4.2 > 4.05 ? 1 : 0);
  const sway = Math.sin(t * 1.4);
  const ink = INK;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // shadow
  ell(ctx, 100, 207, 74, 9);
  ctx.fillStyle = 'rgba(75, 51, 38, 0.18)';
  ctx.fill();

  const strokeFill = (fill, lw = 3) => {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = ink;
    ctx.stroke();
  };

  const tailPath = () => {
    ctx.beginPath();
    ctx.moveTo(146, 176);
    ctx.bezierCurveTo(192, 160, 196 + sway * 3, 206, 150, 207);
    ctx.bezierCurveTo(118, 208, 84, 209, 58 + sway * 5, 199 - sway * 2);
  };

  // haunches
  ell(ctx, 58, 172, 32, 33, 0.15);
  strokeFill(FUR.orange);
  ell(ctx, 142, 172, 32, 33, -0.15);
  strokeFill(FUR.orange);
  // body
  ctx.beginPath();
  ctx.moveTo(70, 92);
  ctx.bezierCurveTo(48, 120, 44, 176, 64, 198);
  ctx.lineTo(136, 198);
  ctx.bezierCurveTo(156, 176, 152, 120, 130, 92);
  ctx.closePath();
  strokeFill(FUR.orange);
  // white chest and belly
  ctx.beginPath();
  ctx.moveTo(74, 96);
  ctx.bezierCurveTo(62, 130, 66, 176, 78, 198);
  ctx.lineTo(122, 198);
  ctx.bezierCurveTo(134, 176, 138, 130, 126, 96);
  ctx.closePath();
  ctx.fillStyle = FUR.white;
  ctx.fill();
  // chest fluff tufts
  ctx.strokeStyle = 'rgba(200, 175, 150, 0.7)';
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(88 + k * 8, 118 + (k % 2) * 6);
    ctx.quadraticCurveTo(92 + k * 8, 124 + (k % 2) * 6, 90 + k * 8, 130 + (k % 2) * 6);
    ctx.stroke();
  }
  // haunch stripes
  ctx.strokeStyle = FUR.stripe;
  ctx.lineWidth = 3;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const x = 100 + s * (66 - k * 9);
      ctx.moveTo(x, 150 + k * 3);
      ctx.quadraticCurveTo(x + s * 6, 164, x - s * 1, 180 - k * 2);
      ctx.stroke();
    }
  }
  // back feet tucked under the haunches
  ell(ctx, 40, 200, 13, 7);
  strokeFill(FUR.white, 2.6);
  ell(ctx, 160, 200, 13, 7);
  strokeFill(FUR.white, 2.6);

  // fluffy tail wrapped around the front, with faint rings
  tailPath();
  ctx.lineWidth = 25;
  ctx.strokeStyle = ink;
  ctx.stroke();
  tailPath();
  ctx.lineWidth = 19.5;
  ctx.strokeStyle = FUR.orange;
  ctx.stroke();
  ctx.setLineDash([9, 13]);
  ctx.lineDashOffset = 2;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = FUR.ring;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';

  // front legs (white socks all the way down)
  for (let s = -1; s <= 1; s += 2) {
    const x = 100 + s * 11.5;
    ctx.beginPath();
    ctx.moveTo(x - 10.5, 128);
    ctx.lineTo(x - 11, 192);
    ctx.quadraticCurveTo(x, 204, x + 11, 192);
    ctx.lineTo(x + 10.5, 128);
    ctx.closePath();
    ctx.fillStyle = FUR.white;
    ctx.fill();
  }
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(100, 138);
  ctx.lineTo(100, 192);
  ctx.moveTo(78.5, 140);
  ctx.quadraticCurveTo(76.5, 170, 78.5, 192);
  ctx.moveTo(121.5, 140);
  ctx.quadraticCurveTo(123.5, 170, 121.5, 192);
  ctx.stroke();
  for (let s = -1; s <= 1; s += 2) {
    const x = 100 + s * 11.5;
    ell(ctx, x, 197, 13, 8.5);
    strokeFill(FUR.white, 2.6);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 4.3, 192);
    ctx.lineTo(x - 4.3, 197);
    ctx.moveTo(x + 4.3, 192);
    ctx.lineTo(x + 4.3, 197);
    ctx.stroke();
  }

  // head
  ctx.save();
  ctx.translate(100, 74 + Math.sin(t * 1.1) * 0.8);
  ctx.rotate(Math.sin(t * 0.7) * 0.03 + (opts.tilt || 0));
  ctx.scale(4.4, 4.4);
  ctx.lineWidth = 3 / 4.4;
  ctx.strokeStyle = ink;
  const earTwitch = (t % 6.3 > 6.0) ? Math.sin((t % 6.3 - 6) * 30) * 0.8 : 0;
  const e = { eyes: opts.eyes || 'open', blink, earTwitch, mouthOpen: opts.mouthOpen || 0, lookX: opts.lookX || 0 };
  faceFront(ctx, 0, e);
  faceFront(ctx, 1, e);
  ctx.restore();
  ctx.restore();
}

/** Icon / avatar: just the face on a colored disc. */
export function drawFaceIcon(ctx, size, bg = '#fbe7cc', opts = {}) {
  ctx.save();
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  const s = size / 34;
  ctx.translate(size / 2, size * 0.56);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = opts.lw || 1.1;
  ctx.strokeStyle = INK;
  faceFront(ctx, 0, { eyes: opts.eyes || 'open' });
  faceFront(ctx, 1, { eyes: opts.eyes || 'open' });
  ctx.restore();
}
