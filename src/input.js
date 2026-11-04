// One-finger (or mouse) laser pointer. On touch the dot floats a little above the
// fingertip so your finger never hides it.
import { clamp } from './util.js';
import { ROOM_W, ROOM_H } from './room.js';

const TOUCH_OFFSET = 46; // css px above the finger

export class Laser {
  constructor() {
    this.on = false;
    this.x = ROOM_W / 2;
    this.y = ROOM_H / 2;
    this.speed = 0;
    this.stillT = 0;
    this.fade = 0;
    this.trail = [];
    this._lx = this.x;
    this._ly = this.y;
  }

  set(on, x, y) {
    if (on && !this.on) {
      this._lx = x;
      this._ly = y;
      this.trail.length = 0;
      this.stillT = 0;
    }
    this.on = on;
    if (on) {
      this.x = clamp(x, 2, ROOM_W - 2);
      this.y = clamp(y, 2, ROOM_H - 2);
      this.fade = 1;
    }
  }

  update(dt) {
    if (this.on) {
      const d = Math.hypot(this.x - this._lx, this.y - this._ly);
      const inst = dt > 0 ? d / dt : 0;
      this.speed += (inst - this.speed) * Math.min(1, dt * 14);
      this.stillT = this.speed < 30 ? this.stillT + dt : 0;
      this.trail.unshift(this.x, this.y);
      if (this.trail.length > 12) this.trail.length = 12;
    } else {
      this.speed = 0;
      this.stillT = 0;
      this.fade = Math.max(0, this.fade - dt * 8);
      if (this.trail.length) this.trail.length = Math.max(0, this.trail.length - 2);
    }
    this._lx = this.x;
    this._ly = this.y;
  }
}

/** Wires pointer events on the canvas to a Laser, converting screen to world coords. */
export class PointerInput {
  constructor(canvas, view, laser) {
    this.canvas = canvas;
    this.view = view;
    this.laser = laser;
    this.enabled = false;
    this.pointerId = null;
    this.onFirstTouch = null;
    this.sx = 0;
    this.sy = 0;
    this.type = 'mouse';

    const down = (e) => {
      if (this.onFirstTouch) this.onFirstTouch(e);
      if (!this.enabled) return;
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
      this.pointerId = e.pointerId;
      this.type = e.pointerType || 'mouse';
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* older Safari */ }
      this.move(e);
      e.preventDefault();
    };
    const move = (e) => {
      if (!this.enabled || e.pointerId !== this.pointerId) return;
      this.move(e);
      e.preventDefault();
    };
    const up = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.laser.set(false);
    };
    canvas.addEventListener('pointerdown', down, { passive: false });
    canvas.addEventListener('pointermove', move, { passive: false });
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS: stop pinch / double-tap gestures from zooming the page
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || e.target === canvas) e.preventDefault(); }, { passive: false });
  }

  move(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.sx = e.clientX - rect.left;
    this.sy = e.clientY - rect.top;
    const off = this.type === 'touch' ? TOUCH_OFFSET : 0;
    const w = this.view.screenToWorld(this.sx, this.sy - off);
    this.laser.set(true, w.x, w.y);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.pointerId = null;
      this.laser.set(false);
    }
  }
}
