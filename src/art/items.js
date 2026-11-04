// Top-down art for every knockable object, plus the mess they leave behind.
// Each draw function paints the item centered at 0,0 in world units.
import { INK, INK_SOFT, ell, circle, roundRectPath, sketchEllipse, sketchRect, shade } from './draw.js';
import { TAU, makeRng } from '../util.js';

const LW = 1.3;

function outline(ctx, lw = LW) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function fo(ctx, fill, lw = LW) {
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, lw);
}

const MUG_COLORS = ['#7fa9a5', '#e8b85a', '#e3a79a', '#f4efe6', '#8fa3c9'];
const BOOK_COLORS = ['#c4574e', '#5b7db1', '#e0b04f', '#6e9e78', '#a5739b'];
const FLOWER_COLORS = ['#f28b82', '#f6c85f', '#ffffff', '#f4a6c6', '#b39ddb'];

export const ITEM_ART = {
  mug(ctx, v, rnd) {
    const col = MUG_COLORS[v % MUG_COLORS.length];
    // handle
    ctx.beginPath();
    ctx.ellipse(7.6, 0, 3.4, 2.7, 0, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.lineWidth = 2.2 + LW * 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = col;
    ctx.stroke();
    sketchEllipse(ctx, 0, 0, 6.8, 6.8, rnd, 0.25);
    fo(ctx, col);
    circle(ctx, 0, 0, 5.3);
    ctx.fillStyle = shade(col, 0.35);
    ctx.fill();
    circle(ctx, 0, 0, 4.4);
    ctx.fillStyle = '#7a4b2e';
    ctx.fill();
    outline(ctx, 0.6);
    // latte heart
    ctx.beginPath();
    ctx.moveTo(0, 1.6);
    ctx.bezierCurveTo(-3, -0.4, -1.4, -2.6, 0, -1);
    ctx.bezierCurveTo(1.4, -2.6, 3, -0.4, 0, 1.6);
    ctx.fillStyle = '#e9c9a4';
    ctx.fill();
  },

  glass(ctx, v, rnd) {
    sketchEllipse(ctx, 0, 0, 6.3, 6.3, rnd, 0.2);
    ctx.fillStyle = 'rgba(214, 236, 244, 0.85)';
    ctx.fill();
    outline(ctx, 1.1);
    circle(ctx, 0, 0, 4.8);
    ctx.fillStyle = 'rgba(126, 190, 222, 0.75)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, Math.PI * 1.1, Math.PI * 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 5.6, Math.PI * 0.1, Math.PI * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  },

  wine(ctx, v, rnd) {
    sketchEllipse(ctx, 0, 0, 6.2, 6.2, rnd, 0.2);
    ctx.fillStyle = 'rgba(232, 238, 240, 0.85)';
    ctx.fill();
    outline(ctx, 1.1);
    circle(ctx, 0, 0, 4.2);
    ctx.fillStyle = '#9e3b4e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-0.6, -0.6, 2.4, Math.PI * 1.0, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  },

  plant(ctx, v, rnd) {
    circle(ctx, 0, 0, 8);
    fo(ctx, '#d27d56');
    circle(ctx, 0, 0, 6.4);
    ctx.fillStyle = '#6b4a35';
    ctx.fill();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd() * 0.4 + v;
      const len = 9 + rnd() * 3.5;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(len * 0.5, -4.2, len, 0);
      ctx.quadraticCurveTo(len * 0.5, 4.2, 1, 0);
      fo(ctx, i % 2 ? '#7fa36b' : '#5e8a55', 1.1);
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(len - 1.5, 0);
      ctx.strokeStyle = 'rgba(40, 70, 35, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
  },

  succulent(ctx, v, rnd) {
    const pot = v % 2 ? '#f1ece4' : '#7fa9a5';
    circle(ctx, 0, 0, 6.3);
    fo(ctx, pot);
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 5 : 7;
      const len = ring ? 3.4 : 5.6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.4;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.6, -2.2, len, 0);
        ctx.quadraticCurveTo(len * 0.6, 2.2, 0, 0);
        fo(ctx, ring ? '#b7d6b4' : '#8fbf98', 0.8);
        ctx.restore();
      }
    }
  },

  pen(ctx, v) {
    const col = ['#4f6fa8', '#c4574e', '#3e3a39'][v % 3];
    roundRectPath(ctx, -8.5, -1.7, 15, 3.4, 1.6);
    fo(ctx, col, 1.1);
    ctx.beginPath();
    ctx.moveTo(6.5, -1.6);
    ctx.lineTo(9.5, 0);
    ctx.lineTo(6.5, 1.6);
    ctx.closePath();
    fo(ctx, '#f1e3c8', 1.1);
    roundRectPath(ctx, -8.5, -2, 5, 4, 1.4);
    fo(ctx, shade(col, -0.25), 1.1);
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-1.5, 2.6);
    ctx.strokeStyle = '#d6d0c6';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  },

  remote(ctx, v) {
    roundRectPath(ctx, -10, -4.2, 20, 8.4, 3.4);
    fo(ctx, v % 2 ? '#4a4543' : '#5d6470');
    circle(ctx, 6.6, 0, 1.4);
    ctx.fillStyle = '#e5574f';
    ctx.fill();
    circle(ctx, 1.6, 0, 2.2);
    ctx.fillStyle = '#8a8582';
    ctx.fill();
    ctx.fillStyle = '#b9b2ac';
    for (let i = 0; i < 3; i++) {
      for (let j = -1; j <= 1; j += 2) {
        circle(ctx, -3 - i * 2.4, j * 1.4, 0.65);
        ctx.fill();
      }
    }
  },

  vase(ctx, v, rnd) {
    const col = ['#8db4d4', '#e3a79a', '#f1ece4'][v % 3];
    sketchEllipse(ctx, 0, 0, 10, 10, rnd, 0.3);
    fo(ctx, col, 1.5);
    circle(ctx, 0, 0, 7.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.setLineDash([1.2, 2.2]);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, 0, 0, 4.6);
    ctx.fillStyle = shade(col, -0.35);
    ctx.fill();
    // stems and leaves
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.6;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(6, -3, 11, 0);
      ctx.quadraticCurveTo(6, 3, 1, 0);
      fo(ctx, '#6f9a5f', 1);
      ctx.restore();
    }
    // flowers
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.3 + rnd() * 0.4;
      const r = 4.2 + rnd() * 2;
      const fx = Math.cos(a) * r;
      const fy = Math.sin(a) * r;
      const fc = FLOWER_COLORS[(i + v) % FLOWER_COLORS.length];
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * TAU + a;
        circle(ctx, fx + Math.cos(pa) * 2, fy + Math.sin(pa) * 2, 1.8);
        ctx.fillStyle = fc;
        ctx.fill();
        outline(ctx, 0.6);
      }
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * TAU + a;
        circle(ctx, fx + Math.cos(pa) * 2, fy + Math.sin(pa) * 2, 1.4);
        ctx.fillStyle = fc;
        ctx.fill();
      }
      circle(ctx, fx, fy, 1.2);
      ctx.fillStyle = '#e8a33a';
      ctx.fill();
    }
  },

  specs(ctx) {
    ctx.lineJoin = 'round';
    for (let s = -1; s <= 1; s += 2) {
      circle(ctx, s * 4.8, 0, 3.9);
      ctx.fillStyle = 'rgba(214, 232, 242, 0.7)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3e3a39';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 4.8, 0, 2.4, Math.PI * 1.1, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-1.2, -0.8);
    ctx.quadraticCurveTo(0, -2, 1.2, -0.8);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#3e3a39';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8.6, -1);
    ctx.lineTo(-3, -4.8);
    ctx.moveTo(8.6, -1);
    ctx.lineTo(3, -4.8);
    ctx.stroke();
  },

  book(ctx, v, rnd) {
    const col = BOOK_COLORS[v % BOOK_COLORS.length];
    sketchRect(ctx, -7.5, -9, 15, 18, 1.5, rnd, 0.25);
    fo(ctx, '#f6efe1');
    sketchRect(ctx, -7.5, -9, 13.5, 18, 1.5, rnd, 0.25);
    fo(ctx, col);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-4.5, -5, 7.5, 1.4);
    ctx.fillRect(-4.5, -2.4, 5.5, 1);
    ctx.beginPath();
    ctx.moveTo(-5.6, -9);
    ctx.lineTo(-5.6, 9);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  },

  clock(ctx) {
    for (let s = -1; s <= 1; s += 2) {
      circle(ctx, s * 5.2, -5.6, 3);
      fo(ctx, '#e2b95b', 1.1);
    }
    circle(ctx, 0, 0.6, 7.6);
    fo(ctx, '#e5574f');
    circle(ctx, 0, 0.6, 5.5);
    fo(ctx, '#fffaf1', 0.9);
    ctx.beginPath();
    ctx.moveTo(0, 0.6);
    ctx.lineTo(0, -3);
    ctx.moveTo(0, 0.6);
    ctx.lineTo(2.6, 1.8);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = INK;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      circle(ctx, Math.cos(a) * 4.3, 0.6 + Math.sin(a) * 4.3, 0.45);
      ctx.fill();
    }
  },

  frame(ctx, v, rnd) {
    sketchRect(ctx, -7, -8.5, 14, 17, 1, rnd, 0.2);
    fo(ctx, v % 2 ? '#b98a5e' : '#e8d9be', 1.4);
    ctx.fillStyle = '#bfdbe6';
    ctx.fillRect(-4.6, -6, 9.2, 12);
    ctx.fillStyle = '#9bc28a';
    ctx.fillRect(-4.6, 2, 9.2, 4);
    // tiny portrait of an orange cat, naturally
    circle(ctx, 0, 0.4, 2.6);
    ctx.fillStyle = '#eba25c';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2.4, -0.8);
    ctx.lineTo(-1.8, -3.4);
    ctx.lineTo(-0.6, -1.8);
    ctx.moveTo(2.4, -0.8);
    ctx.lineTo(1.8, -3.4);
    ctx.lineTo(0.6, -1.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -1.4);
    ctx.lineTo(0.8, 1.6);
    ctx.lineTo(-0.8, 1.6);
    ctx.fillStyle = '#fff9f0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-4.6, -6, 9.2, 12);
  },

  perfume(ctx, v) {
    const col = v % 2 ? 'rgba(178, 157, 219, 0.85)' : 'rgba(245, 170, 190, 0.85)';
    roundRectPath(ctx, -5, -5, 10, 10, 2.6);
    fo(ctx, col);
    roundRectPath(ctx, -3.4, -3.4, 6.8, 6.8, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    circle(ctx, 0, 0, 2.6);
    fo(ctx, '#e2b95b', 1);
    circle(ctx, -0.7, -0.7, 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  },

  plate(ctx, v, rnd) {
    sketchEllipse(ctx, 0, 0, 9.8, 9.8, rnd, 0.25);
    fo(ctx, '#fbf8f3');
    circle(ctx, 0, 0, 7);
    ctx.strokeStyle = 'rgba(120, 100, 80, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (v % 3 === 0) {
      // slice of cake
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(4.5, 3);
      ctx.lineTo(1, -4.5);
      ctx.closePath();
      fo(ctx, '#f6d9a8', 1);
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(1, -4.5);
      ctx.lineTo(-0.4, 3);
      ctx.closePath();
      ctx.fillStyle = '#f4a6c6';
      ctx.fill();
      circle(ctx, 1, -2.6, 1.2);
      ctx.fillStyle = '#e5574f';
      ctx.fill();
    } else if (v % 3 === 1) {
      // pasta
      ctx.strokeStyle = '#e8c15a';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc((rnd() - 0.5) * 4, (rnd() - 0.5) * 4, 2 + rnd() * 1.5, rnd() * 6, rnd() * 6 + 3.5);
        ctx.stroke();
      }
      circle(ctx, 1.5, -1, 1.2);
      ctx.fillStyle = '#6f9a5f';
      ctx.fill();
    } else {
      // salad
      for (let i = 0; i < 6; i++) {
        circle(ctx, (rnd() - 0.5) * 7, (rnd() - 0.5) * 7, 1.6 + rnd());
        ctx.fillStyle = i % 3 === 0 ? '#e5574f' : i % 2 ? '#8fbf6a' : '#6f9a5f';
        ctx.fill();
      }
    }
  },
};

// ---------------------------------------------------------------- debris decals

const LIQUID = {
  coffee: 'rgba(122, 75, 46, 0.62)',
  water: 'rgba(126, 190, 222, 0.42)',
  wine: 'rgba(158, 59, 78, 0.55)',
  perfume: 'rgba(245, 170, 190, 0.45)',
};

function puddle(ctx, rnd, r, color) {
  ctx.beginPath();
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (0.65 + rnd() * 0.55);
    pts.push([Math.cos(a) * rr * 1.2, Math.sin(a) * rr * 0.9]);
  }
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    circle(ctx, (rnd() - 0.5) * r * 3, (rnd() - 0.5) * r * 2.4, 0.8 + rnd() * 1.4);
    ctx.fill();
  }
}

function shardsDecal(ctx, rnd, colors, n, spread) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU;
    const d = spread * (0.3 + rnd() * 0.8);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const s = 1.6 + rnd() * 2.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * TAU);
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.5);
    ctx.lineTo(s * 0.9, -s * 0.7);
    ctx.lineTo(s * 0.2, s * 0.9);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = INK_SOFT;
    ctx.stroke();
    ctx.restore();
  }
}

/** Paint the aftermath of a fall onto the floor (stamped once into the background). */
export function drawDebris(ctx, def, variant, seed, angle) {
  const rnd = makeRng(seed);
  const kind = def.debris;
  ctx.save();
  if (def.liquid) puddle(ctx, rnd, def.r * 1.3, LIQUID[def.liquid]);
  if (kind === 'shatter') {
    const base = def.shardColor || '#ffffff';
    shardsDecal(ctx, rnd, [base, shade(base, -0.15), '#ffffff'], 7 + Math.floor(rnd() * 4), def.r * 1.6);
    if (def.flowers) {
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate((rnd() - 0.5) * 30, (rnd() - 0.5) * 24);
        ctx.rotate(rnd() * TAU);
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(5, 0);
        ctx.strokeStyle = '#5e8a55';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * TAU;
          circle(ctx, 6 + Math.cos(pa) * 1.8, Math.sin(pa) * 1.8, 1.6);
          ctx.fillStyle = FLOWER_COLORS[(i + variant) % FLOWER_COLORS.length];
          ctx.fill();
        }
        circle(ctx, 6, 0, 1);
        ctx.fillStyle = '#e8a33a';
        ctx.fill();
        ctx.restore();
      }
    }
    if (def.food) {
      for (let i = 0; i < 4; i++) {
        circle(ctx, (rnd() - 0.5) * 14, (rnd() - 0.5) * 12, 1.2 + rnd() * 1.6);
        ctx.fillStyle = ['#f6d9a8', '#e8c15a', '#8fbf6a', '#f4a6c6'][i];
        ctx.fill();
      }
    }
  } else if (kind === 'dirt') {
    sketchEllipse(ctx, 0, 0, def.r * 1.4, def.r * 1.1, rnd, 1.6, 12);
    ctx.fillStyle = 'rgba(107, 74, 53, 0.85)';
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      circle(ctx, (rnd() - 0.5) * def.r * 4, (rnd() - 0.5) * def.r * 3.4, 0.6 + rnd() * 1.2);
      ctx.fill();
    }
    shardsDecal(ctx, rnd, [def.shardColor || '#d27d56'], 5, def.r * 1.5);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate((rnd() - 0.5) * def.r * 3, (rnd() - 0.5) * def.r * 3);
      ctx.rotate(rnd() * TAU);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(4, -3, 8, 0);
      ctx.quadraticCurveTo(4, 3, 0, 0);
      ctx.fillStyle = i % 2 ? '#7fa36b' : '#5e8a55';
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = INK_SOFT;
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // whole object lying on the floor
    ctx.rotate(angle);
    const art = ITEM_ART[def.art || def.type];
    if (def.type === 'book') {
      // landed open, pages up
      ctx.save();
      for (let s = -1; s <= 1; s += 2) {
        ctx.save();
        ctx.scale(s, 1);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.quadraticCurveTo(6, -9.5, 11, -8);
        ctx.lineTo(11, 8);
        ctx.quadraticCurveTo(6, 6.5, 0, 8);
        ctx.closePath();
        fo(ctx, '#f6efe1', 1.1);
        ctx.strokeStyle = 'rgba(75,51,38,0.3)';
        ctx.lineWidth = 0.6;
        for (let l = 0; l < 4; l++) {
          ctx.beginPath();
          ctx.moveTo(2.5, -4 + l * 3);
          ctx.lineTo(9, -4 + l * 3);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    } else if (art) {
      ctx.globalAlpha = 0.95;
      art(ctx, variant, rnd);
      ctx.globalAlpha = 1;
    }
    if (def.type === 'remote') {
      // the batteries always pop out
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.translate(14 + i * 5, (rnd() - 0.5) * 12);
        ctx.rotate(rnd() * TAU);
        roundRectPath(ctx, -3.5, -1.4, 7, 2.8, 1.2);
        fo(ctx, '#d9c46a', 0.8);
        ctx.fillStyle = '#3e3a39';
        ctx.fillRect(1.8, -1.4, 1.7, 2.8);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}
