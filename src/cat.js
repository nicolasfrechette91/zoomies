// Ranchy's brain and body: chases the laser with lag, momentum and drifty turns,
// crouches and pounces, gets bored and grooms, and reacts to hazards.
import { clamp, lerp, damp, dampAngle, angleDiff, approach, rand, pick, chance } from './util.js';

export const CAT_R = 11;
export const CAT_MASS = 4;
export const MAX_SPEED = 255;
const ACCEL = 820;
const BRAKE = 1150;
const TAIL_N = 9;

// where the tail attaches, per pose (local coords, +x forward)
const RUMP = {
  run: [-15.5, 0], stand: [-15.5, 0], scared: [-16, 0], sit: [-13.5, 0], swish: [-13.5, 0],
  groom: [-13.5, 0], crouch: [-16.5, 0], pounce: [-18.5, 0], bat: [-15.5, 0], stretch: [-17.5, 0],
  startled: [-15, 0], belly: [-14.5, 0], nap: [-11, -6], box: [0, 0],
};

const CONTROLLABLE = new Set(['move', 'idle', 'notice', 'crouch', 'bat']);

export class Cat {
  constructor(x, y, heading = -Math.PI / 2) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.heading = heading;
    this.speed = 0;
    this.latV = 0;
    this.z = 0;
    this.baseZ = 0;
    this.baseTarget = 0;
    this.groundZ = 0;
    this.hopT = 1;
    this.hopDur = 0;
    this.hopFrom = 0;
    this.hopH = 0;
    this.hopArc = 0;
    this.jumpZ = 0;

    this.state = 'move';
    this.stateT = 0;
    this.pose = 'stand';
    this.poseT = 0;
    this.pop = 0;
    this.phase = 0;
    this.look = 0;
    this.blink = 0;
    this.blinkT = 2;
    this.eyes = 'open';
    this.earsBack = 0;
    this.tongue = false;
    this.puff = 0;
    this.swat = 0;
    this.swatSide = 1;
    this.swatAnimT = 0;
    this.happyT = 0;
    this.tailSide = 1;
    this.tailA = new Array(TAIL_N).fill(heading + Math.PI);
    this.rumpX = -15.5;
    this.rumpY = 0;

    this.tracking = false;
    this.px = x;
    this.py = y;
    this.reactT = 0;
    this.leadT = 0;
    this.idleKind = null;
    this.lastIdle = null;
    this.idleDur = 0;
    this.idleCount = 0;
    this.noticeDur = 0;
    this.crouchDur = 0;
    this.fleeAngle = 0;

    this.scareCD = 0;
    this.pounceCD = 0;
    this.batCD = 0;
    this.swatCD = 0;
    this.skidT = 0;
    this.mark = null; // '!' bubble
    this.markT = 0;
    this.lookAt = null;
    this.events = [];
    this.box = null;
  }

  get controllable() {
    return CONTROLLABLE.has(this.state);
  }

  get onFloor() {
    return this.baseZ < 4 && this.z < 10;
  }

  emit(type, extra) {
    this.events.push(Object.assign({ type, x: this.x, y: this.y, z: this.z }, extra));
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  showMark(m, dur = 0.8) {
    this.mark = m;
    this.markT = dur;
    this.markDur = dur;
  }

  // ------------------------------------------------------------ main update

  update(dt, laser, room, t) {
    this.stateT += dt;
    this.poseT += dt;
    this.pop = Math.max(0, this.pop - dt * 6);
    this.scareCD -= dt;
    this.pounceCD -= dt;
    this.batCD -= dt;
    this.swatCD -= dt;
    this.markT -= dt;
    this.happyT -= dt;
    this.swatAnimT -= dt;
    this.reactT -= dt;

    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 1;
      if (this.blinkT < -0.12) {
        this.blink = 0;
        this.blinkT = rand(1.8, 4.5);
      }
    }

    const on = !!(laser && laser.on);
    if (on) {
      if (!this.tracking) {
        this.tracking = true;
        this.px = laser.x;
        this.py = laser.y;
        this.reactT = Math.max(this.reactT, 0.12);
      } else {
        // the cat's idea of where the dot is trails slightly behind reality
        this.px = damp(this.px, laser.x, 9, dt);
        this.py = damp(this.py, laser.y, 9, dt);
      }
    } else {
      this.tracking = false;
    }
    const ldx = on ? laser.x - this.x : 0;
    const ldy = on ? laser.y - this.y : 0;
    const ldist = on ? Math.hypot(ldx, ldy) : Infinity;
    const leading = on && (laser.speed > 35 || ldist > 48);
    this.leadT = leading ? 0 : this.leadT + dt;

    let wantSpeed = 0;
    let wantAngle = this.heading;
    let turnRate = lerp(10, 4.6, clamp(this.speed / MAX_SPEED, 0, 1));
    let aim = false;
    let brakeMul = 1;

    switch (this.state) {
      case 'move': {
        if (on && this.reactT <= 0) {
          const tx = this.px - this.x;
          const ty = this.py - this.y;
          const d = Math.hypot(tx, ty);
          wantAngle = Math.atan2(ty, tx);
          wantSpeed = d < 11 ? 0 : MAX_SPEED * Math.pow(clamp((d - 6) / 80, 0, 1), 0.8);
          if (laser.stillT > 0.35 && ldist > 32 && ldist < 140 && this.speed < 110 && this.pounceCD <= 0) {
            this.setState('crouch');
            this.crouchDur = rand(0.45, 0.8);
            this.emit('crouch');
          } else if (ldist < 20 && this.speed < 70 && this.batCD <= 0 && laser.stillT > 0.2) {
            this.setState('bat');
            this.batCD = 2.4;
          }
        }
        if (this.leadT > 3 && this.speed < 25) this.startIdle();
        break;
      }
      case 'crouch': {
        aim = on;
        if (on) wantAngle = Math.atan2(ldy, ldx);
        turnRate = 7;
        if (!on || laser.speed > 150 || ldist > 180) {
          this.setState('move');
          break;
        }
        if (this.stateT > this.crouchDur) this.pounce(laser);
        break;
      }
      case 'pounce': {
        brakeMul = 0.25;
        const k = this.stateT / 0.36;
        this.jumpZ = Math.sin(Math.PI * clamp(k, 0, 1)) * 12;
        if (k >= 1) {
          this.jumpZ = 0;
          this.pounceCD = 1.3;
          this.setState(on && ldist < 24 ? 'bat' : 'move');
          this.emit('land');
        }
        break;
      }
      case 'bat': {
        this.swat = Math.abs(Math.sin(this.stateT * 13));
        this.swatSide = Math.sin(this.stateT * 6.5) > 0 ? 1 : -1;
        if (on) {
          aim = true;
          wantAngle = Math.atan2(ldy, ldx);
        }
        if (this.stateT > 0.9 || (on && ldist > 40)) {
          this.swat = 0;
          this.setState('move');
        }
        break;
      }
      case 'idle': {
        if (on && leading) {
          this.notice();
          break;
        }
        if (this.stateT > this.idleDur) this.startIdle(true);
        break;
      }
      case 'notice': {
        if (on) {
          aim = true;
          wantAngle = Math.atan2(ldy, ldx);
        }
        if (this.stateT > this.noticeDur) {
          this.setState('move');
          this.reactT = 0;
        }
        break;
      }
      case 'scared': {
        wantAngle = this.fleeAngle;
        wantSpeed = 330;
        turnRate = 12;
        if (this.stateT > 0.85) {
          this.setState('move');
          this.reactT = 0.15;
        }
        break;
      }
      case 'startled': {
        brakeMul = 0.15;
        const k = this.stateT / 0.85;
        this.jumpZ = Math.sin(Math.PI * clamp(k, 0, 1)) * 34;
        if (k >= 1) {
          this.jumpZ = 0;
          this.setState('move');
          this.reactT = 0.3;
          this.emit('land', { big: true });
        }
        break;
      }
      case 'nap': {
        brakeMul = 3;
        if (this.stateT > (this.napDur || 1.4)) {
          this.setState('stretch');
          this.emit('wake');
        }
        break;
      }
      case 'stretch': {
        brakeMul = 3;
        if (this.stateT > 0.6) this.setState('move');
        break;
      }
      case 'box': {
        brakeMul = 4;
        if (this.box) {
          this.x = damp(this.x, this.box.x, 14, dt);
          this.y = damp(this.y, this.box.y, 14, dt);
        }
        if (this.stateT > (this.boxDur || 1.3)) {
          this.setState('move');
          this.reactT = 0.1;
          this.vx = Math.cos(this.heading) * 120;
          this.vy = Math.sin(this.heading) * 120;
          this.emit('boxOut');
        }
        break;
      }
      case 'ending': {
        brakeMul = 2;
        if (this.lookAt) {
          aim = true;
          wantAngle = Math.atan2(this.lookAt.y - this.y, this.lookAt.x - this.x);
          turnRate = 3;
        }
        break;
      }
    }

    if (this.state !== 'box') this.locomote(dt, wantAngle, wantSpeed, turnRate, room.gripAt(this.x, this.y, this.baseZ), aim, brakeMul);
    this.integrate(dt, room);
    this.updateZ(dt, room);
    this.updateLook(dt, laser, on, t);
    this.updatePose(on);
    this.updateTail(dt, t);
    if (this.speed > 12) this.phase += dt * (5 + this.speed * 0.062);
  }

  locomote(dt, wantAngle, wantSpeed, turnRate, grip, aim, brakeMul) {
    if (wantSpeed > 0 || aim) {
      const da = angleDiff(this.heading, wantAngle);
      this.heading += clamp(da, -turnRate * dt, turnRate * dt);
    }
    const fx = Math.cos(this.heading);
    const fy = Math.sin(this.heading);
    let vf = this.vx * fx + this.vy * fy;
    let vl = -this.vx * fy + this.vy * fx;
    const align = wantSpeed > 0 ? Math.max(0, Math.cos(angleDiff(this.heading, wantAngle))) : 0;
    const want = wantSpeed * (0.3 + 0.7 * align);
    vf = approach(vf, want, (want > vf ? ACCEL : BRAKE * brakeMul) * dt);
    vl *= Math.exp(-grip * dt);
    this.vx = fx * vf - fy * vl;
    this.vy = fy * vf + fx * vl;
    this.latV = vl;

    // skidding on slippery floors
    this.skidT -= dt;
    if (Math.abs(vl) > 85 && this.onFloor && this.skidT <= 0) {
      this.skidT = 0.07;
      this.emit('skid', { power: Math.abs(vl) });
    }
  }

  integrate(dt, room) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const res = room.resolveCircle(this.x, this.y, CAT_R - 2, room.solids);
    if (res.hit) {
      const vn = this.vx * res.nx + this.vy * res.ny;
      if (vn < 0) {
        this.vx -= vn * res.nx * 1.25;
        this.vy -= vn * res.ny * 1.25;
        if (-vn > 190) this.emit('bonk', { power: -vn });
      }
      this.x = res.x;
      this.y = res.y;
    }
    this.speed = Math.hypot(this.vx, this.vy);
  }

  updateZ(dt, room) {
    const g = this.state === 'box' && this.box ? this.box.z : room.groundAt(this.x, this.y);
    if (g !== this.baseTarget) {
      const up = g > this.baseTarget;
      this.hopFrom = this.baseZ;
      this.baseTarget = g;
      this.hopT = 0;
      const dz = Math.abs(g - this.hopFrom);
      this.hopDur = 0.14 + dz * 0.003;
      this.hopH = 4 + dz * 0.32;
      if (dz > 3) this.emit('hop', { up });
    }
    if (this.hopT < this.hopDur) {
      this.hopT += dt;
      const k = Math.min(1, this.hopT / this.hopDur);
      this.baseZ = lerp(this.hopFrom, this.baseTarget, 1 - (1 - k) * (1 - k));
      this.hopArc = Math.sin(Math.PI * k) * this.hopH;
      if (k >= 1 && this.hopDur > 0.17) this.emit('land');
    } else {
      this.baseZ = this.baseTarget;
      this.hopArc = 0;
    }
    this.z = this.baseZ + this.hopArc + this.jumpZ;
    this.groundZ = g;
  }

  updateLook(dt, laser, on, t) {
    let target = 0;
    if (on && (this.controllable || this.state === 'notice')) {
      target = clamp(angleDiff(this.heading, Math.atan2(laser.y - this.y, laser.x - this.x)), -1.1, 1.1);
    } else if (this.state === 'ending' && this.lookAt) {
      target = clamp(angleDiff(this.heading, Math.atan2(this.lookAt.y - this.y, this.lookAt.x - this.x)), -1.1, 1.1);
    } else if (this.state === 'idle' || (this.state === 'move' && this.speed < 20)) {
      target = Math.sin(t * 0.55) * 0.5 + Math.sin(t * 1.7) * 0.15;
    }
    this.look = damp(this.look, target, 9, dt);
  }

  updatePose(on) {
    let p;
    switch (this.state) {
      case 'move':
        if (this.swatAnimT > 0) {
          p = 'bat';
          this.swat = Math.sin(clamp(1 - this.swatAnimT / 0.28, 0, 1) * Math.PI);
        }
        else if (this.speed > 28) p = 'run';
        else if (this.leadT > 1.1 && !on) p = 'sit';
        else p = 'stand';
        break;
      case 'idle': p = this.idleKind; break;
      case 'notice': p = this.idleKind === 'belly' && this.stateT < this.noticeDur * 0.6 ? 'belly' : 'sit'; break;
      case 'ending': p = 'sit'; break;
      default: p = this.state;
    }
    if (p !== this.pose) {
      const quiet = (p === 'run' || p === 'stand' || p === 'bat') && (this.pose === 'run' || this.pose === 'stand' || this.pose === 'bat');
      if (!quiet) this.pop = 1;
      if (p === 'sit' || p === 'swish' || p === 'groom' || p === 'belly' || p === 'nap') {
        if (this.pose !== 'sit' && this.pose !== 'swish' && this.pose !== 'groom') this.tailSide = chance(0.5) ? 1 : -1;
      }
      this.pose = p;
      this.poseT = 0;
    }
    const r = RUMP[p] || RUMP.run;
    this.rumpX = r[0];
    this.rumpY = r[1] * (p === 'nap' ? this.tailSide : 1);

    // expression
    const s = this.state;
    if (s === 'scared' || s === 'startled') this.eyes = 'wide';
    else if (s === 'nap' || p === 'groom') this.eyes = 'closed';
    else if (this.happyT > 0 || p === 'belly') this.eyes = 'happy';
    else if (s === 'crouch' || s === 'pounce' || s === 'notice' || (s === 'move' && this.speed > 140)) this.eyes = 'dilated';
    else this.eyes = 'open';
    if (p === 'belly' && this.poseT % 5 < 2.2) this.eyes = 'open';
    this.earsBack = s === 'scared' || s === 'startled' ? 1 : s === 'crouch' ? 0.15 : s === 'nap' ? 0.35 : 0;
    this.tongue = p === 'groom' && Math.sin(this.poseT * 9) > 0.3;
    this.puff = s === 'scared' || s === 'startled' ? Math.min(1, this.puff + 0.25) : Math.max(0, this.puff - 0.02);
  }

  updateTail(dt, t) {
    const n = TAIL_N;
    const h = this.heading;
    const PI = Math.PI;
    const p = this.pose;
    const side = this.tailSide;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      let target;
      let rate;
      switch (p) {
        case 'run':
        case 'bat':
          target = h + PI + Math.sin(t * 9 - i * 0.7) * 0.2 * u - clamp(this.latV * 0.003, -0.6, 0.6) * u;
          rate = 18;
          break;
        case 'stand':
          target = h + PI + 0.15 * Math.sin(i * 0.8) + Math.sin(t * 2.2 - i * 0.5) * 0.45 * u;
          rate = 9;
          break;
        case 'sit':
        case 'groom':
          target = h + PI + side * (0.55 + i * 0.29) + Math.sin(t * 2.4 - i * 0.6) * 0.12 * u * u;
          rate = 7;
          break;
        case 'swish':
          target = h + PI + side * (0.45 + i * 0.2) + Math.sin(t * 3.4 - i * 0.55) * 0.75 * u * u;
          rate = 9;
          break;
        case 'crouch':
          target = h + PI + Math.sin(t * 17) * 0.7 * u * u * u;
          rate = 14;
          break;
        case 'pounce':
        case 'stretch':
          target = h + PI + Math.sin(i * 0.9) * 0.08;
          rate = 16;
          break;
        case 'scared':
        case 'startled':
          target = h + PI + Math.sin(t * 30 + i) * 0.05;
          rate = 18;
          break;
        case 'belly':
          target = h + PI + side * (0.3 + i * 0.14) + Math.sin(t * 1.6 - i * 0.5) * 0.3 * u;
          rate = 6;
          break;
        case 'nap':
          target = h + side * (PI * 0.5 + 0.35 + i * 0.3);
          rate = 6;
          break;
        default:
          target = h + PI;
          rate = 10;
      }
      this.tailA[i] = dampAngle(this.tailA[i], target, rate * (1 - u * 0.55), dt);
    }
  }

  // ------------------------------------------------------------ behaviours

  startIdle(next = false) {
    let options = ['swish', 'groom', 'belly'].filter((k) => k !== this.lastIdle);
    let kind = !next && this.idleCount === 0 && chance(0.5) ? 'swish' : pick(options);
    this.idleKind = kind;
    this.lastIdle = kind;
    this.idleCount++;
    this.idleDur = kind === 'belly' ? rand(4.5, 6) : kind === 'groom' ? rand(3.5, 5) : rand(3, 4.2);
    this.setState('idle');
    if (kind === 'belly') this.emit('belly');
  }

  notice() {
    const fromBelly = this.idleKind === 'belly';
    this.noticeDur = fromBelly ? 0.45 : 0.18;
    this.setState('notice');
    this.showMark('!', 0.6);
    this.emit('notice', { fromBelly });
    this.idleCount = 0;
  }

  pounce(laser) {
    const a = Math.atan2(laser.y - this.y, laser.x - this.x);
    const d = Math.hypot(laser.x - this.x, laser.y - this.y);
    this.heading = a;
    const sp = clamp(d * 3.3, 280, 470);
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.setState('pounce');
    this.emit('pounce');
  }

  scare(fx, fy) {
    if (this.scareCD > 0) return false;
    if (!(this.controllable || this.state === 'nap' || this.state === 'stretch')) return false;
    const a = Math.atan2(this.y - fy, this.x - fx) + rand(-0.4, 0.4);
    this.fleeAngle = a;
    this.heading = a;
    this.vx = Math.cos(a) * 300;
    this.vy = Math.sin(a) * 300;
    this.setState('scared');
    this.scareCD = 2.4;
    this.showMark('!', 0.9);
    this.emit('scared');
    return true;
  }

  startle(fx, fy) {
    if (this.state === 'startled' || this.state === 'box' || this.state === 'ending') return false;
    const a = Math.atan2(this.y - fy, this.x - fx) + rand(-0.5, 0.5);
    this.vx = Math.cos(a) * 85;
    this.vy = Math.sin(a) * 85;
    this.setState('startled');
    this.showMark('!!', 1.1);
    this.emit('startled');
    return true;
  }

  nap(dur = 1.4) {
    if (!this.controllable) return false;
    this.napDur = dur;
    this.setState('nap');
    this.emit('nap');
    return true;
  }

  enterBox(box) {
    if (!this.controllable) return false;
    this.box = box;
    this.boxDur = 1.3;
    this.heading = Math.atan2(this.vy, this.vx) || this.heading;
    this.setState('box');
    this.vx = this.vy = 0;
    this.emit('box');
    return true;
  }

  swatAt(side) {
    this.swatAnimT = 0.28;
    this.swatSide = side;
    this.swat = 1;
    this.swatCD = 0.45;
  }

  celebrate() {
    this.happyT = 1.2;
  }

  endPose(lookAt) {
    this.lookAt = lookAt;
    this.setState('ending');
  }
}
