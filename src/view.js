// Canvas sizing, device pixel ratio, safe areas and the world -> screen camera.
import { ROOM_W, ROOM_H, WALL } from './room.js';

export const HUD_RESERVE = 62; // css px kept free above the room for the HUD

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.probe = document.getElementById('safe-probe');
    this.version = 0;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const r = this.probe ? this.probe.getBoundingClientRect() : { left: 0, top: 0, width: w, height: h };
    this.safe = { x: r.left, y: r.top, w: r.width || w, h: r.height || h };
    const pad = 8;
    const ax = this.safe.x + pad;
    const ay = this.safe.y + HUD_RESERVE;
    const aw = this.safe.w - pad * 2;
    const ah = this.safe.h - HUD_RESERVE - pad;
    const tw = ROOM_W + WALL * 2;
    const th = ROOM_H + WALL * 2;
    this.scale = Math.max(0.2, Math.min(aw / tw, ah / th));
    this.ox = ax + (aw - tw * this.scale) / 2 + WALL * this.scale;
    this.oy = ay + (ah - th * this.scale) / 2 + WALL * this.scale;
    this.version++;
  }

  /** Pixel density of one world unit, for sprite caches. */
  get pxScale() {
    return this.scale * this.dpr;
  }

  worldTransform(ctx, sx = 0, sy = 0) {
    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, this.dpr * (this.ox + sx), this.dpr * (this.oy + sy));
  }

  screenToWorld(px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  }

  worldToScreen(x, y) {
    return { x: this.ox + x * this.scale, y: this.oy + y * this.scale };
  }
}
