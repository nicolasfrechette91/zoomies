// Hand-drawn drawing helpers: warm ink outlines and slightly wobbly shapes.
import { TAU } from '../util.js';

export const INK = '#4b3326';
export const INK_SOFT = 'rgba(75, 51, 38, 0.45)';
export const INK_FAINT = 'rgba(75, 51, 38, 0.16)';

/** Two-pass "sticker" painting: mode 0 strokes the outline, mode 1 fills. */
export function paint(ctx, mode, fill) {
  if (mode === 0) ctx.stroke();
  else {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

export function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectPts(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 3; i++) {
      const a = a0 + (i / 3) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

/**
 * Builds a smooth, slightly wobbly closed path through polygon points.
 * Edges are subdivided and jittered so lines look drawn by hand.
 */
export function sketchShape(ctx, pts, rnd, amp = 0.8, step = 14) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const segs = Math.max(1, Math.round(len / step));
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const j = (rnd() - 0.5) * 2 * amp;
      out.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]);
    }
  }
  const m = out.length;
  ctx.beginPath();
  const sx = (out[m - 1][0] + out[0][0]) / 2;
  const sy = (out[m - 1][1] + out[0][1]) / 2;
  ctx.moveTo(sx, sy);
  for (let i = 0; i < m; i++) {
    const p = out[i];
    const q = out[(i + 1) % m];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

export function sketchRect(ctx, x, y, w, h, r, rnd, amp = 0.8) {
  sketchShape(ctx, roundRectPts(x, y, w, h, Math.max(r, 2)), rnd, amp, 16);
}

export function sketchEllipse(ctx, cx, cy, rx, ry, rnd, amp = 0.6, n = 0) {
  n = n || Math.max(10, Math.round((rx + ry) * 0.5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const j = 1 + (rnd() - 0.5) * 2 * (amp / Math.max(rx, ry));
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  // Points are already dense, so draw them smoothed without extra subdivision.
  const m = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[m - 1][0] + pts[0][0]) / 2, (pts[m - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < m; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % m];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

/** A slightly wobbly open line, for grain, seams and doodles. */
export function sketchLine(ctx, x0, y0, x1, y1, rnd, amp = 0.6) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const segs = Math.max(2, Math.round(len / 12));
  const nx = -(y1 - y0) / (len || 1);
  const ny = (x1 - x0) / (len || 1);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  let px = x0;
  let py = y0;
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    const j = s === segs ? 0 : (rnd() - 0.5) * 2 * amp;
    const x = x0 + (x1 - x0) * t + nx * j;
    const y = y0 + (y1 - y0) * t + ny * j;
    ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    px = x;
    py = y;
  }
  ctx.lineTo(x1, y1);
}

export function inkStroke(ctx, lw = 1.6, color = INK) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function fillInk(ctx, fill, lw = 1.6, color = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  inkStroke(ctx, lw, color);
}

/** Lighten/darken a #rrggbb color by amount (-1..1). */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
