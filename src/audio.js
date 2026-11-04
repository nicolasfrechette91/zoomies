// Every sound is synthesized with the Web Audio API. No audio files.
// The AudioContext is only created after the first user gesture.

const rnd = (a, b) => a + Math.random() * (b - a);

class SFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
    this.last = Object.create(null);
    this.purrNodes = null;
    this.vac = null;
  }

  /** Call from any user gesture. Safe to call repeatedly. */
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      this.master.connect(comp);
      comp.connect(ctx.destination);
      const len = ctx.sampleRate * 1.5;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // iOS likes a tiny silent buffer played inside the gesture
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      s.connect(ctx.destination);
      s.start(0);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
    if (m) {
      this.purr(false);
      this.vacuumLevel(0);
    }
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  gate(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  }

  // ------------------------------------------------------------ primitives

  tone(type, f0, f1, dur, gain, at = 0, dest = this.master, attack = 0.005) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
    return o;
  }

  noise(dur, gain, type, freq, q = 1, at = 0, freqEnd = 0, attack = 0.004) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur + 0.02);
  }

  bell(freq, dur, gain, at = 0) {
    this.tone('sine', freq, freq, dur, gain, at, this.master, 0.002);
    this.tone('sine', freq * 2.76, freq * 2.76, dur * 0.5, gain * 0.35, at, this.master, 0.002);
  }

  // ------------------------------------------------------------ ui

  click() {
    if (!this.ready) return;
    this.tone('triangle', 880, 620, 0.06, 0.12);
  }

  pop() {
    if (!this.ready) return;
    this.tone('sine', 520, 1180, 0.12, 0.16);
  }

  star(i) {
    if (!this.ready) return;
    const f = [1046.5, 1318.5, 1568][i] || 1568;
    this.bell(f, 0.7, 0.14);
    this.bell(f * 1.5, 0.5, 0.05, 0.03);
  }

  fanfare(stars) {
    if (!this.ready) return;
    if (stars === 0) {
      [392, 370, 349, 311].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.32, 0.1, i * 0.22));
      return;
    }
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone('triangle', f, f, 0.32, 0.12, i * 0.09));
    this.tone('triangle', 1046.5, 1046.5, 0.7, 0.1, 0.38);
    this.tone('sine', 1318.5, 1318.5, 0.7, 0.06, 0.38);
  }

  // ------------------------------------------------------------ cat

  meow(kind = 'happy') {
    if (!this.ready) return;
    if (!this.gate('meow', kind === 'chirp' ? 250 : 500)) return;
    const P = {
      happy: { f0: 560, f1: 880, f2: 520, d: 0.42, g: 0.22 },
      big: { f0: 680, f1: 1080, f2: 600, d: 0.52, g: 0.24 },
      yelp: { f0: 900, f1: 1450, f2: 650, d: 0.3, g: 0.26 },
      chirp: { f0: 520, f1: 760, f2: 700, d: 0.17, g: 0.16, roll: true },
      sleepy: { f0: 420, f1: 560, f2: 300, d: 0.65, g: 0.14 },
      mew: { f0: 640, f1: 820, f2: 600, d: 0.3, g: 0.18 },
    }[kind] || { f0: 560, f1: 880, f2: 520, d: 0.42, g: 0.22 };
    const c = this.ctx;
    const t = c.currentTime + 0.005;
    const k = rnd(0.94, 1.06);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(P.f0 * k, t);
    o.frequency.linearRampToValueAtTime(P.f1 * k, t + P.d * 0.35);
    o.frequency.exponentialRampToValueAtTime(P.f2 * k, t + P.d);
    const vib = c.createOscillator();
    vib.frequency.value = 6.5;
    const vibG = c.createGain();
    vibG.gain.value = P.f0 * 0.025;
    vib.connect(vibG);
    vibG.connect(o.frequency);
    // two formants sweeping "eee" -> "ow"
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 4;
    f1.frequency.setValueAtTime(650, t);
    f1.frequency.linearRampToValueAtTime(1050, t + P.d * 0.4);
    f1.frequency.linearRampToValueAtTime(720, t + P.d);
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 6;
    f2.frequency.setValueAtTime(2300, t);
    f2.frequency.linearRampToValueAtTime(1500, t + P.d * 0.5);
    f2.frequency.linearRampToValueAtTime(1150, t + P.d);
    const g2 = c.createGain();
    g2.gain.value = 0.55;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(P.g, t + 0.04);
    g.gain.setValueAtTime(P.g * 0.9, t + P.d * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + P.d);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    o.connect(f1);
    o.connect(f2);
    f1.connect(g);
    f2.connect(g2);
    g2.connect(g);
    let out = g;
    if (P.roll) {
      // rolled "mrrp"
      const am = c.createGain();
      am.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.frequency.value = 27;
      const lfoG = c.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG);
      lfoG.connect(am.gain);
      g.connect(am);
      out = am;
      lfo.start(t);
      lfo.stop(t + P.d + 0.05);
    }
    out.connect(lp);
    lp.connect(this.master);
    o.start(t);
    vib.start(t);
    o.stop(t + P.d + 0.05);
    vib.stop(t + P.d + 0.05);
  }

  purr(on) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.purrNodes && this.ready) {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const am = c.createGain();
      am.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.frequency.value = 24;
      const lfoG = c.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG);
      lfoG.connect(am.gain);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.4);
      src.connect(lp);
      lp.connect(am);
      am.connect(g);
      g.connect(this.master);
      src.start();
      lfo.start();
      this.purrNodes = { src, lfo, g };
    } else if (!on && this.purrNodes) {
      const { src, lfo, g } = this.purrNodes;
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.08);
      src.stop(t + 0.4);
      lfo.stop(t + 0.4);
      this.purrNodes = null;
    }
  }

  hiss() {
    if (!this.ready || !this.gate('hiss', 400)) return;
    this.noise(0.55, 0.2, 'highpass', 2600, 0.7, 0, 0, 0.04);
    this.noise(0.4, 0.08, 'bandpass', 5200, 1.2, 0.02);
    this.meow('yelp');
  }

  boing() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.4);
    const vib = c.createOscillator();
    vib.frequency.value = 18;
    const vg = c.createGain();
    vg.gain.value = 40;
    vib.connect(vg);
    vg.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.5);
    vib.stop(t + 0.5);
    this.meow('yelp');
  }

  hop(up) {
    if (!this.ready || !this.gate('hop', 90)) return;
    this.tone('sine', up ? 200 : 260, up ? 300 : 150, 0.07, 0.08);
  }

  land(big) {
    if (!this.ready || !this.gate('land', 80)) return;
    this.tone('sine', 140, 55, big ? 0.18 : 0.1, big ? 0.3 : 0.16);
    this.noise(0.08, big ? 0.12 : 0.06, 'lowpass', 500);
  }

  skid(power) {
    if (!this.ready || !this.gate('skid', 260)) return;
    const f = rnd(1700, 2300);
    this.tone('sine', f, f * 1.25, 0.09, 0.035);
    this.noise(0.16, Math.min(0.08, power / 2500), 'bandpass', 3200, 0.8);
  }

  whoosh() {
    if (!this.ready) return;
    this.noise(0.28, 0.13, 'bandpass', 700, 1.2, 0, 2600, 0.05);
  }

  swat() {
    if (!this.ready || !this.gate('swat', 80)) return;
    this.noise(0.04, 0.12, 'bandpass', 1600, 1.5);
    this.tone('sine', 340, 220, 0.05, 0.08);
  }

  bonk() {
    if (!this.ready || !this.gate('bonk', 200)) return;
    this.tone('sine', 320, 140, 0.16, 0.22);
    this.noise(0.06, 0.1, 'lowpass', 700);
  }

  clink(mat) {
    if (!this.ready || !this.gate('clink', 60)) return;
    const f = mat === 'glass' ? rnd(3400, 4200) : mat === 'ceramic' ? rnd(2000, 2600) : rnd(900, 1300);
    if (mat === 'soft' || mat === 'pot') this.tone('sine', 220, 160, 0.05, 0.06);
    else this.bell(f, 0.09, 0.05);
  }

  crash(mat, liquid, intensity = 1) {
    if (!this.ready || !this.gate('crash', 35)) return;
    const I = Math.min(1.4, intensity);
    const tinkles = (n, lo, hi, gain, spread) => {
      for (let i = 0; i < n; i++) this.bell(rnd(lo, hi), rnd(0.05, 0.12), gain * rnd(0.6, 1), rnd(0.02, spread));
    };
    switch (mat) {
      case 'ceramic':
        this.noise(0.2, 0.22 * I, 'bandpass', 2600, 0.8);
        this.tone('sine', 150, 60, 0.14, 0.3 * I);
        [1800, 2650, 3900].forEach((f) => this.bell(f * rnd(0.92, 1.08), 0.22, 0.07 * I));
        tinkles(5, 3000, 6200, 0.045, 0.35);
        break;
      case 'glass':
        this.noise(0.28, 0.2 * I, 'highpass', 3200, 0.8);
        this.tone('sine', 130, 60, 0.1, 0.18 * I);
        [2900, 4200, 5600].forEach((f) => this.bell(f * rnd(0.92, 1.08), 0.3, 0.06 * I));
        tinkles(9, 4000, 8200, 0.04, 0.45);
        break;
      case 'pot':
        this.tone('sine', 115, 48, 0.2, 0.38 * I);
        this.noise(0.36, 0.2 * I, 'lowpass', 900, 0.8);
        this.bell(rnd(1200, 1500), 0.12, 0.07);
        tinkles(3, 1800, 3200, 0.03, 0.2);
        break;
      case 'plastic':
        [0, 0.07, 0.15, 0.21].forEach((at, i) => {
          this.noise(0.02, (0.2 - i * 0.04) * I, 'bandpass', rnd(1700, 2600), 2, at);
          this.tone('square', rnd(700, 1000), 500, 0.02, (0.05 - i * 0.01) * I, at);
        });
        break;
      case 'soft':
        this.tone('sine', 95, 45, 0.16, 0.36 * I);
        this.noise(0.13, 0.18 * I, 'lowpass', 650, 0.7);
        break;
      case 'metal': {
        this.bell(1400, 0.5, 0.1);
        this.bell(2800, 0.3, 0.05);
        // brrrring!
        const c = this.ctx;
        const t = c.currentTime + 0.05;
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = 2300;
        const am = c.createGain();
        am.gain.value = 0;
        const lfo = c.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 28;
        const lg = c.createGain();
        lg.gain.value = 0.035;
        lfo.connect(lg);
        lg.connect(am.gain);
        const g = c.createGain();
        g.gain.setValueAtTime(1, t);
        g.gain.setValueAtTime(1, t + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2300;
        bp.Q.value = 3;
        o.connect(bp);
        bp.connect(am);
        am.connect(g);
        g.connect(this.master);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.65);
        lfo.stop(t + 0.65);
        break;
      }
    }
    if (liquid) this.noise(0.32, 0.12, 'bandpass', 1300, 1.1, 0.02, 380);
  }

  // ------------------------------------------------------------ pickups and hazards

  nom() {
    if (!this.ready) return;
    [0, 0.12, 0.24].forEach((at) => {
      this.noise(0.04, 0.16, 'bandpass', rnd(1200, 1900), 1.2, at);
      this.tone('sine', 180, 120, 0.05, 0.08, at);
    });
    this.tone('sine', 660, 1320, 0.18, 0.1, 0.32);
  }

  boxThump() {
    if (!this.ready) return;
    this.noise(0.12, 0.2, 'lowpass', 700);
    this.tone('sine', 170, 90, 0.12, 0.2);
    setTimeout(() => this.meow('chirp'), 220);
  }

  freeze() {
    if (!this.ready) return;
    [1568, 2093, 2637, 3136, 4186].forEach((f, i) => this.bell(f, 0.5, 0.06, i * 0.05));
  }

  napStart() {
    if (!this.ready) return;
    this.tone('sine', 620, 300, 0.6, 0.09);
    this.tone('sine', 465, 230, 0.7, 0.06, 0.15);
  }

  lose() {
    if (!this.ready) return;
    this.tone('triangle', 440, 330, 0.18, 0.08);
  }

  tick(urgent) {
    if (!this.ready) return;
    this.tone('sine', urgent ? 1320 : 990, urgent ? 1250 : 940, 0.05, urgent ? 0.09 : 0.05);
  }

  jingle() {
    if (!this.ready) return;
    // keys in the lock
    for (let i = 0; i < 16; i++) {
      const at = (i < 9 ? 0 : 0.42) + Math.random() * 0.32;
      this.bell(rnd(3600, 7600), rnd(0.06, 0.14), rnd(0.025, 0.05), at);
      this.noise(0.012, 0.05, 'highpass', 6000, 1, at);
    }
    this.tone('sine', 2100, 2000, 0.2, 0.04, 0.2);
    this.tone('sine', 2600, 2500, 0.2, 0.035, 0.6);
  }

  door() {
    if (!this.ready) return;
    // lock clunk then a friendly creak
    this.noise(0.07, 0.22, 'lowpass', 500);
    this.tone('sine', 95, 60, 0.1, 0.25);
    const c = this.ctx;
    const t = c.currentTime + 0.12;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(170, t);
    o.frequency.linearRampToValueAtTime(260, t + 0.25);
    o.frequency.linearRampToValueAtTime(205, t + 0.6);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
  }

  comboDing(n) {
    if (!this.ready) return;
    const f = 880 * Math.pow(2, Math.min(n, 8) * (2 / 12));
    this.bell(f, 0.25, 0.07);
  }

  vacuumLevel(level) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (level > 0.01 && !this.vac && this.ready) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 72;
      const o2 = c.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 145;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.6;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const mix = c.createGain();
      mix.gain.value = 0.0001;
      o.connect(lp);
      o2.connect(lp);
      src.connect(bp);
      bp.connect(mix);
      lp.connect(mix);
      mix.connect(this.master);
      o.start();
      o2.start();
      src.start();
      this.vac = { o, o2, src, mix };
    }
    if (this.vac) {
      const v = this.muted ? 0.0001 : Math.max(0.0001, level * 0.09);
      this.vac.mix.gain.setTargetAtTime(v, c.currentTime, 0.1);
    }
  }

  stopVacuum() {
    if (!this.vac) return;
    const t = this.ctx.currentTime;
    this.vac.mix.gain.setTargetAtTime(0.0001, t, 0.05);
    this.vac.o.stop(t + 0.3);
    this.vac.o2.stop(t + 0.3);
    this.vac.src.stop(t + 0.3);
    this.vac = null;
  }

  stopLoops() {
    this.purr(false);
    this.stopVacuum();
  }
}

export const sfx = new SFX();
