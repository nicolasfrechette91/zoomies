// Cozy apartment backgrounds: floors, walls, windows, door and furniture.
// Everything here is painted once into a background bitmap per level.
import { INK, INK_SOFT, INK_FAINT, ell, circle, roundRectPath, sketchRect, sketchEllipse, sketchLine, inkStroke, fillInk, shade } from './draw.js';
import { ROOM_W, ROOM_H, WALL } from '../room.js';
import { TAU, makeRng } from '../util.js';

const WOOD = { oak: '#d9b48c', walnut: '#b07a52', light: '#e6cba6', painted: '#e9e1d2', white: '#f2ede4', sage: '#b9c9b1' };

export const THEMES = {
  kitchen: { wall: '#cdb59a', wallLine: '#f3e5d2', floorA: '#f4ead9', floorB: '#cfdac9', tile: 40 },
  living: { wall: '#c8b39e', wallLine: '#f2e6d6', plank: '#ead7b8' },
  bedroom: { wall: '#c9b0b2', wallLine: '#f3e4e2', carpet: '#e7ddd3' },
  study: { wall: '#b7c0ab', wallLine: '#eef0e4', plank: '#e2c9a3' },
  dining: { wall: '#ccb59b', wallLine: '#f4e8d6', floorA: '#eef0ec', floorB: '#cfdbe0', tile: 34, diagonal: true },
  open: { wall: '#c6b29c', wallLine: '#f2e6d6', plank: '#e8d4b4', floorA: '#f4ead9', floorB: '#d6dccb', tile: 36 },
};

// ---------------------------------------------------------------- floors

function drawWood(ctx, rnd, base, x0, y0, w, h) {
  const pw = 20;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(x0, y0, w, h);
  for (let x = x0 - (x0 % pw); x < x0 + w; x += pw) {
    let y = y0 - rnd() * 120;
    while (y < y0 + h) {
      const len = 70 + rnd() * 110;
      const jitter = (rnd() - 0.5) * 0.09;
      ctx.fillStyle = shade(base, jitter);
      ctx.fillRect(x, y, pw, len);
      // grain
      ctx.strokeStyle = 'rgba(150, 105, 60, 0.13)';
      ctx.lineWidth = 0.7;
      for (let g = 0; g < 3; g++) {
        const gx = x + 3 + rnd() * (pw - 6);
        sketchLine(ctx, gx, y + 4, gx + (rnd() - 0.5) * 4, y + len - 4, rnd, 1.2);
        ctx.stroke();
      }
      if (rnd() < 0.12) {
        ell(ctx, x + pw / 2 + (rnd() - 0.5) * 8, y + len * rnd(), 1.6, 2.6);
        ctx.fillStyle = 'rgba(140, 95, 55, 0.25)';
        ctx.fill();
      }
      // end seam
      ctx.fillStyle = 'rgba(120, 82, 48, 0.22)';
      ctx.fillRect(x, y + len - 0.8, pw, 0.8);
      y += len;
    }
    ctx.fillStyle = 'rgba(120, 82, 48, 0.28)';
    ctx.fillRect(x + pw - 0.8, y0, 0.8, h);
  }
  ctx.restore();
}

function drawTile(ctx, rnd, a, b, size, diagonal, x0, y0, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = a;
  ctx.fillRect(x0, y0, w, h);
  if (diagonal) {
    ctx.translate(x0 + w / 2, y0 + h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-(x0 + w / 2), -(y0 + h / 2));
  }
  const span = Math.max(w, h) * 1.5;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const start = -Math.ceil(span / size);
  for (let i = start; i < -start; i++) {
    for (let j = start; j < -start; j++) {
      const tx = cx + i * size;
      const ty = cy + j * size;
      const dark = (i + j) & 1;
      ctx.fillStyle = shade(dark ? b : a, (rnd() - 0.5) * 0.05);
      ctx.fillRect(tx, ty, size, size);
    }
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = start; i <= -start; i++) {
    ctx.moveTo(cx + i * size, cy - span);
    ctx.lineTo(cx + i * size, cy + span);
    ctx.moveTo(cx - span, cy + i * size);
    ctx.lineTo(cx + span, cy + i * size);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCarpet(ctx, rnd, base, x0, y0, w, h) {
  ctx.fillStyle = base;
  ctx.fillRect(x0, y0, w, h);
  for (let i = 0; i < (w * h) / 40; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(120, 90, 70, 0.07)';
    ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, 1.2, 1.2);
  }
}

function drawFloor(ctx, room, rnd) {
  const th = room.theme;
  const type = room.floor;
  if (type === 'tile') drawTile(ctx, rnd, th.floorA, th.floorB, th.tile || 40, th.diagonal, 0, 0, ROOM_W, ROOM_H);
  else if (type === 'carpet') drawCarpet(ctx, rnd, th.carpet, 0, 0, ROOM_W, ROOM_H);
  else drawWood(ctx, rnd, th.plank || '#ead7b8', 0, 0, ROOM_W, ROOM_H);
  for (const z of room.zones) {
    if (z.floor === 'tile') drawTile(ctx, rnd, th.floorA, th.floorB, th.tile || 36, z.diagonal, z.x, z.y, z.w, z.h);
    else if (z.floor === 'carpet') drawCarpet(ctx, rnd, th.carpet || '#e7ddd3', z.x, z.y, z.w, z.h);
    else drawWood(ctx, rnd, th.plank || '#ead7b8', z.x, z.y, z.w, z.h);
    ctx.strokeStyle = 'rgba(120, 82, 48, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(z.x, z.y, z.w, z.h);
  }
}

// ---------------------------------------------------------------- walls, windows, door

function drawWalls(ctx, room, rnd) {
  const th = room.theme;
  ctx.fillStyle = th.wall;
  ctx.fillRect(-WALL, -WALL, ROOM_W + WALL * 2, WALL);
  ctx.fillRect(-WALL, ROOM_H, ROOM_W + WALL * 2, WALL);
  ctx.fillRect(-WALL, 0, WALL, ROOM_H);
  ctx.fillRect(ROOM_W, 0, WALL, ROOM_H);
  // a little texture on the wall tops
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 160; i++) {
    const side = Math.floor(rnd() * 4);
    let x;
    let y;
    if (side === 0) { x = rnd() * ROOM_W; y = -WALL + rnd() * WALL; }
    else if (side === 1) { x = rnd() * ROOM_W; y = ROOM_H + rnd() * WALL; }
    else if (side === 2) { x = -WALL + rnd() * WALL; y = rnd() * ROOM_H; }
    else { x = ROOM_W + rnd() * WALL; y = rnd() * ROOM_H; }
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  // baseboard line + inner shadow
  ctx.strokeStyle = th.wallLine;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, ROOM_W - 3, ROOM_H - 3);
  const g = 10;
  const grads = [
    [0, 0, 0, g, 0, 0, ROOM_W, g],
    [0, ROOM_H, 0, ROOM_H - g, 0, ROOM_H - g, ROOM_W, g],
    [0, 0, g, 0, 0, 0, g, ROOM_H],
    [ROOM_W, 0, ROOM_W - g, 0, ROOM_W - g, 0, g, ROOM_H],
  ];
  for (const [x1, y1, x2, y2, rx, ry, rw, rh] of grads) {
    const lg = ctx.createLinearGradient(x1, y1, x2, y2);
    lg.addColorStop(0, 'rgba(70, 45, 25, 0.16)');
    lg.addColorStop(1, 'rgba(70, 45, 25, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.strokeRect(-WALL, -WALL, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(0, 0, ROOM_W, ROOM_H);
}

function wallSpan(wall, at, w) {
  switch (wall) {
    case 'top': return { x: at - w / 2, y: -WALL, w, h: WALL };
    case 'bottom': return { x: at - w / 2, y: ROOM_H, w, h: WALL };
    case 'left': return { x: -WALL, y: at - w / 2, w: WALL, h: w };
    default: return { x: ROOM_W, y: at - w / 2, w: WALL, h: w };
  }
}

function drawWindow(ctx, win) {
  const r = wallSpan(win.wall, win.at, win.w);
  const horiz = win.wall === 'top' || win.wall === 'bottom';
  ctx.fillStyle = '#f7f3ec';
  ctx.fillRect(r.x - 2, r.y, r.w + 4, r.h);
  ctx.fillStyle = '#cfe6ef';
  if (horiz) ctx.fillRect(r.x + 2, r.y + 4, r.w - 4, r.h - 8);
  else ctx.fillRect(r.x + 4, r.y + 2, r.w - 8, r.h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  if (horiz) ctx.fillRect(r.x + 6, r.y + 5, r.w * 0.3, 1.5);
  else ctx.fillRect(r.x + 5, r.y + 6, 1.5, r.h * 0.3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(r.x - 2, r.y, r.w + 4, r.h);
  ctx.beginPath();
  if (horiz) {
    ctx.moveTo(r.x + r.w / 2, r.y + 2);
    ctx.lineTo(r.x + r.w / 2, r.y + r.h - 2);
  } else {
    ctx.moveTo(r.x + 2, r.y + r.h / 2);
    ctx.lineTo(r.x + r.w - 2, r.y + r.h / 2);
  }
  ctx.stroke();
  // sill plant on wide windows
  if (win.plant) {
    const px = horiz ? r.x + r.w * 0.78 : r.x + r.w / 2;
    const py = horiz ? r.y + r.h / 2 : r.y + r.h * 0.78;
    circle(ctx, px, py, 4.5);
    fillInk(ctx, '#d27d56', 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ell(ctx, px + Math.cos(a) * 4, py + Math.sin(a) * 4, 3, 1.6, a);
      fillInk(ctx, '#7fa36b', 0.8);
    }
  }
}

function drawDoorFrame(ctx, room) {
  const d = room.doorRect();
  ctx.fillStyle = '#b98a5e';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = 'rgba(70,45,25,0.25)';
  if (d.axis === 'x') ctx.fillRect(d.x, d.y + d.h / 2 - 1, d.w, 2);
  else ctx.fillRect(d.x + d.w / 2 - 1, d.y, 2, d.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(d.x, d.y, d.w, d.h);
  // posts
  ctx.fillStyle = '#7c573a';
  if (d.axis === 'x') {
    ctx.fillRect(d.x - 3, d.y, 3, d.h);
    ctx.fillRect(d.x + d.w, d.y, 3, d.h);
  } else {
    ctx.fillRect(d.x, d.y - 3, d.w, 3);
    ctx.fillRect(d.x, d.y + d.h, d.w, 3);
  }
}

/** The front door leaf, drawn every frame so it can swing open when Fanny arrives. */
export function drawDoor(ctx, room, open) {
  const d = room.doorRect();
  const len = room.door.w || 54;
  let base;
  let dir;
  switch (room.door.wall) {
    case 'top': base = 0; dir = 1; break;
    case 'left': base = Math.PI / 2; dir = -1; break;
    case 'right': base = Math.PI / 2; dir = 1; break;
    default: base = 0; dir = -1;
  }
  const a = base + dir * open * 1.35;
  if (open > 0.02) {
    // warm light from the hallway
    ctx.save();
    ctx.globalAlpha = 0.28 * Math.min(1, open * 1.5);
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    const ix = d.axis === 'x' ? 0 : room.door.wall === 'left' ? 1 : -1;
    const iy = d.axis === 'y' ? 0 : room.door.wall === 'top' ? 1 : -1;
    const x0 = d.axis === 'x' ? d.x : d.hx;
    const y0 = d.axis === 'y' ? d.y : d.hy;
    const x1 = d.axis === 'x' ? d.x + d.w : d.hx;
    const y1 = d.axis === 'y' ? d.y + d.h : d.hy;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + ix * 90 + (d.axis === 'x' ? 30 : 0), y1 + iy * 90 + (d.axis === 'y' ? 30 : 0));
    ctx.lineTo(x0 + ix * 90 - (d.axis === 'x' ? 30 : 0), y0 + iy * 90 - (d.axis === 'y' ? 30 : 0));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // swing arc
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(d.hx, d.hy, len, Math.min(base, a), Math.max(base, a));
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(d.hx, d.hy);
  ctx.rotate(a);
  roundRectPath(ctx, 0, -2.6, len, 5.2, 1.5);
  ctx.fillStyle = '#a97852';
  ctx.fill();
  inkStroke(ctx, 1.4);
  circle(ctx, len - 7, 0, 1.8);
  ctx.fillStyle = '#e2b95b';
  ctx.fill();
  inkStroke(ctx, 0.8);
  ctx.restore();
}

// ---------------------------------------------------------------- furniture

function dropShadow(ctx, f) {
  const ox = 2 + f.z * 0.14;
  const oy = 3 + f.z * 0.22;
  ctx.fillStyle = 'rgba(70, 45, 25, 0.16)';
  for (let k = 0; k < 2; k++) {
    const s = 1 - k * 0.45;
    if (f.shape === 'circle') {
      circle(ctx, f.cx + ox * s, f.cy + oy * s, f.r + 1);
    } else {
      roundRectPath(ctx, f.x + ox * s, f.y + oy * s, f.w, f.h, f.round ?? 5);
    }
    ctx.fill();
  }
}

function topShape(ctx, f, rnd, inset = 0, amp = 0.7) {
  if (f.shape === 'circle') sketchEllipse(ctx, f.cx, f.cy, f.r - inset, f.r - inset, rnd, amp);
  else sketchRect(ctx, f.x + inset, f.y + inset, f.w - inset * 2, f.h - inset * 2, Math.max(2, (f.round ?? 5) - inset), rnd, amp);
}

function woodTop(ctx, f, rnd, color) {
  topShape(ctx, f, rnd);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  topShape(ctx, f, rnd, 0, 0);
  ctx.clip();
  // planks + grain
  const vertical = f.shape !== 'circle' && f.h > f.w;
  ctx.strokeStyle = 'rgba(110, 70, 40, 0.16)';
  ctx.lineWidth = 0.8;
  if (f.shape === 'circle') {
    for (let r = 6; r < f.r; r += 7 + rnd() * 5) {
      ctx.beginPath();
      ctx.ellipse(f.cx + (rnd() - 0.5) * 4, f.cy + (rnd() - 0.5) * 4, r, r * 0.92, rnd(), 0, TAU);
      ctx.stroke();
    }
  } else {
    const span = vertical ? f.w : f.h;
    const step = span > 50 ? 18 : span + 1;
    for (let o = step; o < span; o += step) {
      ctx.beginPath();
      if (vertical) { ctx.moveTo(f.x + o, f.y); ctx.lineTo(f.x + o, f.y + f.h); }
      else { ctx.moveTo(f.x, f.y + o); ctx.lineTo(f.x + f.w, f.y + o); }
      ctx.strokeStyle = 'rgba(110, 70, 40, 0.22)';
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(110, 70, 40, 0.12)';
    const n = Math.floor((f.w * f.h) / 700) + 2;
    for (let i = 0; i < n; i++) {
      if (vertical) {
        const gx = f.x + rnd() * f.w;
        sketchLine(ctx, gx, f.y + rnd() * 10, gx + (rnd() - 0.5) * 6, f.y + f.h - rnd() * 10, rnd, 1.5);
      } else {
        const gy = f.y + rnd() * f.h;
        sketchLine(ctx, f.x + rnd() * 10, gy, f.x + f.w - rnd() * 10, gy + (rnd() - 0.5) * 6, rnd, 1.5);
      }
      ctx.stroke();
    }
  }
  // soft top-left highlight
  const lg = ctx.createLinearGradient(f.x, f.y, f.x + f.w, f.y + f.h);
  lg.addColorStop(0, 'rgba(255,255,255,0.18)');
  lg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.restore();
  topShape(ctx, f, rnd);
  inkStroke(ctx, 1.7);
}

function marbleTop(ctx, f, rnd) {
  topShape(ctx, f, rnd);
  ctx.fillStyle = '#f4f0ea';
  ctx.fill();
  ctx.save();
  topShape(ctx, f, rnd, 0, 0);
  ctx.clip();
  ctx.strokeStyle = 'rgba(150, 150, 165, 0.28)';
  ctx.lineWidth = 0.8;
  const n = Math.floor((f.w * f.h) / 1600) + 2;
  for (let i = 0; i < n; i++) {
    const x = f.x + rnd() * f.w;
    const y = f.y + rnd() * f.h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 15, y + (rnd() - 0.5) * 20, x + 25, y + (rnd() - 0.5) * 20, x + 40, y + (rnd() - 0.5) * 16);
    ctx.stroke();
  }
  ctx.restore();
  // front lip
  topShape(ctx, f, rnd, 2.5, 0.3);
  ctx.strokeStyle = 'rgba(160, 150, 140, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  topShape(ctx, f, rnd);
  inkStroke(ctx, 1.7);
}

function fabric(ctx, f, rnd, color, inset = 0) {
  topShape(ctx, f, rnd, inset, 0.9);
  ctx.fillStyle = color;
  ctx.fill();
  inkStroke(ctx, 1.6);
}

function sinkDecor(ctx, s) {
  roundRectPath(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fillStyle = '#d7dde0';
  ctx.fill();
  inkStroke(ctx, 1.4);
  roundRectPath(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 6);
  ctx.fillStyle = '#c2cacf';
  ctx.fill();
  circle(ctx, s.x + s.w / 2, s.y + s.h / 2 + 2, 2.4);
  ctx.fillStyle = '#8b959b';
  ctx.fill();
  // faucet at the back
  ctx.beginPath();
  ctx.moveTo(s.x + s.w / 2, s.y - 1);
  ctx.lineTo(s.x + s.w / 2, s.y + 10);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#9aa4aa';
  ctx.stroke();
  circle(ctx, s.x + s.w / 2, s.y - 1, 3.2);
  ctx.fillStyle = '#b8c0c5';
  ctx.fill();
  inkStroke(ctx, 1);
}

function stoveDecor(ctx, s) {
  roundRectPath(ctx, s.x, s.y, s.w, s.h, 5);
  ctx.fillStyle = '#3d3836';
  ctx.fill();
  inkStroke(ctx, 1.4);
  const pts = [[0.28, 0.32, 8], [0.72, 0.32, 6.5], [0.28, 0.72, 6.5], [0.72, 0.72, 8]];
  for (const [u, v, r] of pts) {
    ctx.beginPath();
    ctx.arc(s.x + s.w * u, s.y + s.h * v, r, 0, TAU);
    ctx.strokeStyle = '#6d6461';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.x + s.w * u, s.y + s.h * v, r * 0.5, 0, TAU);
    ctx.stroke();
  }
}

function laptopDecor(ctx, l) {
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a || 0);
  roundRectPath(ctx, -17, -11, 34, 22, 2.5);
  ctx.fillStyle = '#c8ccd0';
  ctx.fill();
  inkStroke(ctx, 1.3);
  ctx.fillStyle = '#a9afb5';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) ctx.fillRect(-14 + c * 3.2, -8 + r * 3, 2.4, 2);
  roundRectPath(ctx, -6, 4.5, 12, 5, 1);
  ctx.fillStyle = '#b6bcc2';
  ctx.fill();
  ctx.fillStyle = '#3e3a39';
  ctx.fillRect(-17, -13, 34, 2.2);
  ctx.restore();
}

function bookSpines(ctx, f, rnd) {
  // which side faces the room?
  let side = 'bottom';
  if (f.x <= 2) side = 'right';
  else if (f.x + f.w >= ROOM_W - 2) side = 'left';
  else if (f.y <= 2) side = 'bottom';
  else if (f.y + f.h >= ROOM_H - 2) side = 'top';
  else side = f.w > f.h ? 'bottom' : 'right';
  const colors = ['#c4574e', '#5b7db1', '#e0b04f', '#6e9e78', '#a5739b', '#e3a79a', '#8fa3c9', '#d98c4a'];
  const depth = 7;
  const horiz = side === 'top' || side === 'bottom';
  const len = horiz ? f.w : f.h;
  let o = 4;
  while (o < len - 6) {
    const bw = 3 + rnd() * 3.5;
    const bh = depth * (0.55 + rnd() * 0.45);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    let x;
    let y;
    let w;
    let h;
    if (side === 'bottom') { x = f.x + o; y = f.y + f.h - bh - 1; w = bw; h = bh; }
    else if (side === 'top') { x = f.x + o; y = f.y + 1; w = bw; h = bh; }
    else if (side === 'right') { x = f.x + f.w - bh - 1; y = f.y + o; w = bh; h = bw; }
    else { x = f.x + 1; y = f.y + o; w = bh; h = bw; }
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(60, 40, 30, 0.45)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
    o += bw + 0.6 + (rnd() < 0.08 ? 5 : 0);
  }
}

function sofaLike(ctx, f, rnd, color, arm = 13, back = 15) {
  const side = f.back || 'top';
  const dark = shade(color, -0.12);
  const light = shade(color, 0.12);
  fabric(ctx, f, rnd, dark);
  // seat area
  let sx = f.x + arm;
  let sy = f.y;
  let sw = f.w - arm * 2;
  let sh = f.h;
  if (side === 'top') { sy = f.y + back; sh = f.h - back - 2; }
  else if (side === 'bottom') { sh = f.h - back - 2; sy = f.y + 2; }
  else if (side === 'left') { sx = f.x + back; sw = f.w - back - 2; sy = f.y + arm; sh = f.h - arm * 2; }
  else { sx = f.x + 2; sw = f.w - back - 2; sy = f.y + arm; sh = f.h - arm * 2; }
  const horiz = side === 'top' || side === 'bottom';
  const n = horiz ? Math.max(1, Math.round(sw / 70)) : Math.max(1, Math.round(sh / 70));
  for (let i = 0; i < n; i++) {
    let cx;
    let cy;
    let cw;
    let ch;
    if (horiz) { cw = sw / n; cx = sx + i * cw; cy = sy; ch = sh; }
    else { ch = sh / n; cy = sy + i * ch; cx = sx; cw = sw; }
    sketchRect(ctx, cx + 1, cy + 1, cw - 2, ch - 2, 6, rnd, 0.6);
    ctx.fillStyle = light;
    ctx.fill();
    inkStroke(ctx, 1.2);
    // tufting
    ctx.fillStyle = 'rgba(60,40,30,0.25)';
    circle(ctx, cx + cw / 2, cy + ch / 2, 1);
    ctx.fill();
  }
  // throw pillows against the back
  if (f.pillows !== false && (horiz ? sw : sh) > 100) {
    const pc = f.pillowColor || '#f3e0c2';
    const spots = horiz
      ? [[sx + 18, side === 'top' ? sy + 8 : sy + sh - 8], [sx + sw - 18, side === 'top' ? sy + 8 : sy + sh - 8]]
      : [[side === 'left' ? sx + 8 : sx + sw - 8, sy + 18], [side === 'left' ? sx + 8 : sx + sw - 8, sy + sh - 18]];
    spots.forEach(([px, py], i) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((i ? 1 : -1) * 0.35);
      sketchRect(ctx, -9, -6, 18, 12, 5, rnd, 0.5);
      ctx.fillStyle = i ? pc : f.pillowColor2 || '#e8b85a';
      ctx.fill();
      inkStroke(ctx, 1.1);
      ctx.restore();
    });
  }
}

const FURNITURE_ART = {
  counter(ctx, f, rnd) {
    if (f.top === 'wood') woodTop(ctx, f, rnd, WOOD.oak);
    else marbleTop(ctx, f, rnd);
    if (f.sink) sinkDecor(ctx, f.sink);
    if (f.stove) stoveDecor(ctx, f.stove);
  },
  island(ctx, f, rnd) {
    FURNITURE_ART.counter(ctx, f, rnd);
  },
  table(ctx, f, rnd) {
    if (f.cloth) {
      topShape(ctx, f, rnd, -3, 1);
      ctx.fillStyle = '#fbf7f0';
      ctx.fill();
      inkStroke(ctx, 1.6);
      // scalloped lace edge
      ctx.strokeStyle = 'rgba(180, 160, 140, 0.55)';
      ctx.lineWidth = 0.9;
      topShape(ctx, f, rnd, 2, 0.4);
      ctx.setLineDash([2, 2.5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // runner
      const vertical = f.h > f.w;
      ctx.fillStyle = f.runner || '#b9c9b1';
      if (vertical) ctx.fillRect(f.cx - 14, f.y + 6, 28, f.h - 12);
      else ctx.fillRect(f.x + 6, f.cy - 14, f.w - 12, 28);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.setLineDash([3, 3]);
      if (vertical) ctx.strokeRect(f.cx - 11, f.y + 9, 22, f.h - 18);
      else ctx.strokeRect(f.x + 9, f.cy - 11, f.w - 18, 22);
      ctx.setLineDash([]);
    } else {
      woodTop(ctx, f, rnd, WOOD[f.wood || 'oak']);
    }
  },
  chair(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'walnut']);
    const c = f.cushion || '#e3a79a';
    sketchEllipse(ctx, f.cx, f.cy, f.w * 0.32, f.h * 0.32, rnd, 0.4);
    ctx.fillStyle = c;
    ctx.fill();
    inkStroke(ctx, 1);
    // backrest
    const b = f.back || 'top';
    ctx.fillStyle = shade(WOOD[f.wood || 'walnut'], -0.25);
    if (b === 'top') roundRectPath(ctx, f.x - 1, f.y - 3, f.w + 2, 6, 3);
    else if (b === 'bottom') roundRectPath(ctx, f.x - 1, f.y + f.h - 3, f.w + 2, 6, 3);
    else if (b === 'left') roundRectPath(ctx, f.x - 3, f.y - 1, 6, f.h + 2, 3);
    else roundRectPath(ctx, f.x + f.w - 3, f.y - 1, 6, f.h + 2, 3);
    ctx.fill();
    inkStroke(ctx, 1.3);
  },
  sofa(ctx, f, rnd) {
    sofaLike(ctx, f, rnd, f.color || '#c98b78');
  },
  armchair(ctx, f, rnd) {
    sofaLike(ctx, f, rnd, f.color || '#e0b65c', 11, 13);
  },
  coffeeTable(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'walnut']);
  },
  tvStand(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'walnut']);
    // slim TV seen from above, against the wall
    const side = f.tvSide || 'top';
    ctx.fillStyle = '#2f2b2a';
    let tx;
    let ty;
    let tw;
    let th;
    if (side === 'top') { tw = f.w * 0.62; th = 5; tx = f.cx - tw / 2; ty = f.y + 3; }
    else if (side === 'right') { th = f.h * 0.62; tw = 5; ty = f.cy - th / 2; tx = f.x + f.w - 8; }
    else { th = f.h * 0.62; tw = 5; ty = f.cy - th / 2; tx = f.x + 3; }
    roundRectPath(ctx, tx, ty, tw, th, 1.5);
    ctx.fill();
    inkStroke(ctx, 1.2);
    ctx.fillStyle = '#6d6764';
    if (side === 'top') ctx.fillRect(f.cx - 10, ty + th, 20, 4);
    else if (side === 'right') ctx.fillRect(tx - 4, f.cy - 10, 4, 20);
    else ctx.fillRect(tx + tw, f.cy - 10, 4, 20);
  },
  sideTable(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'oak']);
  },
  bookshelf(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'walnut']);
    bookSpines(ctx, f, rnd);
    topShape(ctx, f, rnd);
    inkStroke(ctx, 1.7);
  },
  bed(ctx, f, rnd) {
    // frame + headboard
    woodTop(ctx, f, rnd, WOOD.walnut);
    const head = 14;
    const duvet = { x: f.x + 5, y: f.y + head, w: f.w - 10, h: f.h - head - 5 };
    sketchRect(ctx, duvet.x, duvet.y, duvet.w, duvet.h, 8, rnd, 0.8);
    ctx.fillStyle = '#fbf6ee';
    ctx.fill();
    inkStroke(ctx, 1.3);
    // duvet
    const dv = { x: duvet.x, y: duvet.y + 46, w: duvet.w, h: duvet.h - 46 };
    sketchRect(ctx, dv.x - 2, dv.y, dv.w + 4, dv.h + 2, 8, rnd, 1);
    ctx.fillStyle = f.duvet || '#9db3c9';
    ctx.fill();
    inkStroke(ctx, 1.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(dv.x, dv.y, dv.w, dv.h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([3, 3]);
    for (let o = -dv.h; o < dv.w + dv.h; o += 22) {
      ctx.beginPath();
      ctx.moveTo(dv.x + o, dv.y);
      ctx.lineTo(dv.x + o + dv.h, dv.y + dv.h);
      ctx.moveTo(dv.x + o + dv.h, dv.y);
      ctx.lineTo(dv.x + o, dv.y + dv.h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    // folded sheet edge
    ctx.fillStyle = '#fbf6ee';
    ctx.fillRect(dv.x - 1, dv.y, dv.w + 2, 9);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1;
    ctx.strokeRect(dv.x - 1, dv.y, dv.w + 2, 9);
    // blanket at the foot
    ctx.fillStyle = f.blanket || '#e8b85a';
    ctx.fillRect(dv.x - 2, dv.y + dv.h - 30, dv.w + 4, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 3; k++) ctx.fillRect(dv.x - 2, dv.y + dv.h - 27 + k * 7, dv.w + 4, 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dv.x - 2, dv.y + dv.h - 30, dv.w + 4, 22);
    // pillows
    const pw = (duvet.w - 18) / 2;
    for (let i = 0; i < 2; i++) {
      sketchRect(ctx, duvet.x + 6 + i * (pw + 6), duvet.y + 6, pw, 30, 9, rnd, 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      inkStroke(ctx, 1.3);
      ctx.strokeStyle = 'rgba(180,170,160,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(duvet.x + 14 + i * (pw + 6), duvet.y + 21);
      ctx.quadraticCurveTo(duvet.x + 6 + i * (pw + 6) + pw / 2, duvet.y + 17, duvet.x + i * (pw + 6) + pw - 2, duvet.y + 21);
      ctx.stroke();
    }
  },
  nightstand(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'oak']);
  },
  dresser(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'painted']);
    if (f.runner !== false) {
      const vertical = f.h > f.w;
      ctx.fillStyle = 'rgba(255, 250, 240, 0.8)';
      if (vertical) ctx.fillRect(f.cx - f.w * 0.3, f.y + 10, f.w * 0.6, f.h - 20);
      else ctx.fillRect(f.x + 10, f.cy - f.h * 0.3, f.w - 20, f.h * 0.6);
      ctx.strokeStyle = 'rgba(190, 170, 150, 0.6)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 0.8;
      if (vertical) ctx.strokeRect(f.cx - f.w * 0.3, f.y + 10, f.w * 0.6, f.h - 20);
      else ctx.strokeRect(f.x + 10, f.cy - f.h * 0.3, f.w - 20, f.h * 0.6);
      ctx.setLineDash([]);
    }
  },
  desk(ctx, f, rnd) {
    woodTop(ctx, f, rnd, WOOD[f.wood || 'oak']);
    if (f.laptop) laptopDecor(ctx, f.laptop);
  },
  catTree(ctx, f, rnd) {
    // sisal post peeking out below the platform
    circle(ctx, f.cx + 8, f.cy + 10, f.r * 0.45);
    ctx.fillStyle = '#d9c08f';
    ctx.fill();
    inkStroke(ctx, 1.2);
    sketchEllipse(ctx, f.cx, f.cy, f.r, f.r, rnd, 1);
    ctx.fillStyle = '#d8c7ad';
    ctx.fill();
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU;
      const d = rnd() * f.r * 0.9;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(120,90,60,0.15)';
      ctx.fillRect(f.cx + Math.cos(a) * d, f.cy + Math.sin(a) * d, 1.4, 1.4);
    }
    sketchEllipse(ctx, f.cx, f.cy, f.r, f.r, rnd, 1);
    inkStroke(ctx, 1.6);
    // dangling pom-pom
    ctx.beginPath();
    ctx.moveTo(f.cx + f.r * 0.7, f.cy);
    ctx.quadraticCurveTo(f.cx + f.r + 4, f.cy + 6, f.cx + f.r + 2, f.cy + 14);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    circle(ctx, f.cx + f.r + 2, f.cy + 16, 3.4);
    fillInk(ctx, '#e5574f', 1);
  },
  fridge(ctx, f, rnd) {
    topShape(ctx, f, rnd, 0, 0.4);
    ctx.fillStyle = '#f3f2ee';
    ctx.fill();
    inkStroke(ctx, 1.7);
    topShape(ctx, f, rnd, 4, 0.3);
    ctx.strokeStyle = 'rgba(160,160,165,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // a cereal box someone left on top
    ctx.save();
    ctx.translate(f.cx + 4, f.cy - 6);
    ctx.rotate(0.2);
    roundRectPath(ctx, -9, -5, 18, 10, 1.5);
    ctx.fillStyle = '#e8b85a';
    ctx.fill();
    inkStroke(ctx, 1);
    ctx.fillStyle = '#e5574f';
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.restore();
  },
  plantBig(ctx, f, rnd) {
    circle(ctx, f.cx, f.cy, f.r * 0.55);
    fillInk(ctx, '#d27d56', 1.5);
    circle(ctx, f.cx, f.cy, f.r * 0.45);
    ctx.fillStyle = '#6b4a35';
    ctx.fill();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd() * 0.5;
      const len = f.r * (0.9 + rnd() * 0.35);
      ctx.save();
      ctx.translate(f.cx, f.cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.bezierCurveTo(len * 0.3, -len * 0.45, len * 0.9, -len * 0.35, len, 0);
      ctx.bezierCurveTo(len * 0.9, len * 0.35, len * 0.3, len * 0.45, 2, 0);
      ctx.fillStyle = i % 2 ? '#6f9a5f' : '#5e8a55';
      ctx.fill();
      inkStroke(ctx, 1.2);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(len - 3, 0);
      ctx.strokeStyle = 'rgba(30,60,30,0.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // monstera splits
      ctx.strokeStyle = 'rgba(240, 235, 220, 0.6)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(len * (0.3 + k * 0.2), -len * 0.06);
        ctx.lineTo(len * (0.35 + k * 0.2), -len * 0.25);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  floorLamp(ctx, f, rnd) {
    const g = ctx.createRadialGradient(f.cx, f.cy, 2, f.cx, f.cy, f.r * 2.6);
    g.addColorStop(0, 'rgba(255, 236, 180, 0.45)');
    g.addColorStop(1, 'rgba(255, 236, 180, 0)');
    ctx.fillStyle = g;
    circle(ctx, f.cx, f.cy, f.r * 2.6);
    ctx.fill();
    sketchEllipse(ctx, f.cx, f.cy, f.r, f.r, rnd, 0.4);
    ctx.fillStyle = '#f6ecd8';
    ctx.fill();
    inkStroke(ctx, 1.5);
    circle(ctx, f.cx, f.cy, f.r * 0.35);
    ctx.fillStyle = '#fff6d6';
    ctx.fill();
    inkStroke(ctx, 0.8);
  },
  basket(ctx, f, rnd) {
    sketchEllipse(ctx, f.cx, f.cy, f.r, f.r, rnd, 0.6);
    ctx.fillStyle = '#d9b98a';
    ctx.fill();
    inkStroke(ctx, 1.5);
    circle(ctx, f.cx, f.cy, f.r - 4);
    ctx.fillStyle = '#c9a571';
    ctx.fill();
    // clothes
    for (let i = 0; i < 4; i++) {
      sketchEllipse(ctx, f.cx + (rnd() - 0.5) * f.r, f.cy + (rnd() - 0.5) * f.r, 6 + rnd() * 4, 4 + rnd() * 3, rnd, 0.6);
      ctx.fillStyle = ['#9db3c9', '#f3e0c2', '#e3a79a', '#ffffff'][i];
      ctx.fill();
      inkStroke(ctx, 0.9);
    }
  },
  rug(ctx, f, rnd) {
    const c = f.color || '#9db5a5';
    const shape = f.shape === 'circle' ? 'circle' : f.oval ? 'oval' : 'rect';
    const path = (inset, amp = 0.8) => {
      if (shape === 'circle') sketchEllipse(ctx, f.cx, f.cy, f.r - inset, f.r - inset, rnd, amp);
      else if (shape === 'oval') sketchEllipse(ctx, f.cx, f.cy, f.w / 2 - inset, f.h / 2 - inset, rnd, amp);
      else sketchRect(ctx, f.x + inset, f.y + inset, f.w - inset * 2, f.h - inset * 2, 6, rnd, amp);
    };
    if (shape === 'rect') {
      // fringe on the short ends
      ctx.strokeStyle = shade(c, 0.35);
      ctx.lineWidth = 1;
      const vertical = f.h > f.w;
      for (let o = 4; o < (vertical ? f.w : f.h) - 3; o += 3.5) {
        ctx.beginPath();
        if (vertical) {
          ctx.moveTo(f.x + o, f.y);
          ctx.lineTo(f.x + o, f.y - 5);
          ctx.moveTo(f.x + o, f.y + f.h);
          ctx.lineTo(f.x + o, f.y + f.h + 5);
        } else {
          ctx.moveTo(f.x, f.y + o);
          ctx.lineTo(f.x - 5, f.y + o);
          ctx.moveTo(f.x + f.w, f.y + o);
          ctx.lineTo(f.x + f.w + 5, f.y + o);
        }
        ctx.stroke();
      }
    }
    path(0);
    ctx.fillStyle = c;
    ctx.fill();
    inkStroke(ctx, 1.3, INK_SOFT);
    path(7, 0.5);
    ctx.strokeStyle = shade(c, 0.4);
    ctx.lineWidth = 3;
    ctx.stroke();
    path(12, 0.5);
    ctx.strokeStyle = shade(c, -0.12);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    // center motif
    ctx.save();
    path(14, 0);
    ctx.clip();
    ctx.fillStyle = shade(c, 0.25);
    const step = 22;
    for (let x = f.x; x < f.x + f.w + step; x += step) {
      for (let y = f.y; y < f.y + f.h + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 4, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },
  mat(ctx, f, rnd) {
    sketchRect(ctx, f.x, f.y, f.w, f.h, 3, rnd, 0.5);
    ctx.fillStyle = '#c9a46c';
    ctx.fill();
    inkStroke(ctx, 1.2, INK_SOFT);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(90,60,30,0.15)';
      ctx.fillRect(f.x + 2 + rnd() * (f.w - 4), f.y + 2 + rnd() * (f.h - 4), 1.2, 1.2);
    }
    // a little heart
    const cx = f.cx;
    const cy = f.cy;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 4.5);
    ctx.bezierCurveTo(cx - 8, cy - 1, cx - 3.5, cy - 7, cx, cy - 2.5);
    ctx.bezierCurveTo(cx + 3.5, cy - 7, cx + 8, cy - 1, cx, cy + 4.5);
    ctx.fillStyle = '#b5553f';
    ctx.fill();
  },
  catBed(ctx, f, rnd) {
    sketchEllipse(ctx, f.cx, f.cy, f.r, f.r * 0.9, rnd, 1.2);
    ctx.fillStyle = f.color || '#c98b78';
    ctx.fill();
    inkStroke(ctx, 1.5);
    sketchEllipse(ctx, f.cx, f.cy + 1, f.r * 0.62, f.r * 0.55, rnd, 0.8);
    ctx.fillStyle = '#f3e0cf';
    ctx.fill();
    inkStroke(ctx, 1.1);
    // toy mouse
    ell(ctx, f.cx + 4, f.cy + 2, 4.5, 3, 0.4);
    fillInk(ctx, '#a9a6b3', 0.9);
    ctx.beginPath();
    ctx.moveTo(f.cx, f.cy);
    ctx.quadraticCurveTo(f.cx - 5, f.cy - 4, f.cx - 8, f.cy);
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  },
  bowls(ctx, f, rnd) {
    sketchRect(ctx, f.x, f.y, f.w, f.h, 6, rnd, 0.5);
    ctx.fillStyle = '#e3a79a';
    ctx.fill();
    inkStroke(ctx, 1.1, INK_SOFT);
    const r = Math.min(f.h * 0.36, f.w * 0.2);
    const pts = [f.x + f.w * 0.28, f.x + f.w * 0.72];
    pts.forEach((bx, i) => {
      circle(ctx, bx, f.cy, r);
      fillInk(ctx, '#f6f1e8', 1.2);
      circle(ctx, bx, f.cy, r * 0.68);
      ctx.fillStyle = i ? '#a8d3e6' : '#b9774a';
      ctx.fill();
      if (!i) {
        ctx.fillStyle = '#8f5532';
        for (let k = 0; k < 6; k++) {
          circle(ctx, bx + (rnd() - 0.5) * r, f.cy + (rnd() - 0.5) * r, 0.9);
          ctx.fill();
        }
      }
    });
  },
  toy(ctx, f, rnd) {
    // the circular track toy with a ball, just like the one in Ranchy's living room
    circle(ctx, f.cx, f.cy, f.r);
    fillInk(ctx, '#6fa6a0', 1.5);
    circle(ctx, f.cx, f.cy, f.r - 6);
    ctx.fillStyle = '#4f8781';
    ctx.fill();
    circle(ctx, f.cx, f.cy, f.r - 9);
    fillInk(ctx, '#c9a46c', 1.1);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(f.cx - (f.r - 12), f.cy - 6 + i * 2.4);
      ctx.lineTo(f.cx + (f.r - 12), f.cy - 6 + i * 2.4);
      ctx.strokeStyle = 'rgba(110,80,45,0.35)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    const a = 0.8;
    circle(ctx, f.cx + Math.cos(a) * (f.r - 3), f.cy + Math.sin(a) * (f.r - 3), 3.4);
    fillInk(ctx, '#f4a6c6', 1);
    // little mouse toy with a blue body
    ell(ctx, f.cx - 2, f.cy - 1, 3.6, 2.4, -0.3);
    fillInk(ctx, '#8fb9d9', 0.9);
  },
};

// ---------------------------------------------------------------- background compose

export function drawRoom(ctx, room, seed = 1) {
  const rnd = makeRng(seed);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawFloor(ctx, room, rnd);
  // decor first (rugs, mats, bowls), then shadows, then furniture by height
  const decor = room.furniture.filter((f) => f.decor);
  const solid = room.furniture.filter((f) => !f.decor).sort((a, b) => a.z - b.z);
  for (const f of decor) if (f.kind === 'rug') FURNITURE_ART.rug(ctx, f, rnd);
  for (const f of decor) if (f.kind !== 'rug' && FURNITURE_ART[f.kind]) FURNITURE_ART[f.kind](ctx, f, rnd);
  for (const f of solid) dropShadow(ctx, f);
  for (const f of solid) {
    const art = FURNITURE_ART[f.kind];
    if (art) art(ctx, f, rnd);
  }
  drawWalls(ctx, room, rnd);
  for (const w of room.windows) drawWindow(ctx, w);
  drawDoorFrame(ctx, room);
  // paper grain over everything
  ctx.fillStyle = 'rgba(90, 60, 40, 0.035)';
  for (let i = 0; i < 1400; i++) ctx.fillRect(-WALL + rnd() * (ROOM_W + WALL * 2), -WALL + rnd() * (ROOM_H + WALL * 2), 1.3, 1.3);
  const vg = ctx.createRadialGradient(ROOM_W / 2, ROOM_H / 2, ROOM_H * 0.3, ROOM_W / 2, ROOM_H / 2, ROOM_H * 0.72);
  vg.addColorStop(0, 'rgba(60, 35, 20, 0)');
  vg.addColorStop(1, 'rgba(60, 35, 20, 0.12)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  ctx.restore();
}

/** Margin around the room: a warm cocoa backdrop with faint paw prints. */
export function drawBackdrop(ctx, w, h, seed = 3) {
  const rnd = makeRng(seed);
  ctx.fillStyle = '#3a2a24';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 230, 200, 0.045)';
  const step = 64;
  for (let y = 0; y < h + step; y += step) {
    for (let x = (y / step) % 2 ? step / 2 : 0; x < w + step; x += step) {
      const px = x + (rnd() - 0.5) * 10;
      const py = y + (rnd() - 0.5) * 10;
      const a = rnd() * 0.6 - 0.3;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ell(ctx, 0, 3, 6, 5);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        ell(ctx, -6 + k * 4, -4 - (k === 1 || k === 2 ? 2 : 0), 2.1, 2.6);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
