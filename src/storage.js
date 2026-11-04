// Progress saved in localStorage: unlocked levels, best stars and scores, mute.

const KEY = 'zoomies-save-v1';

const defaults = () => ({
  unlocked: 1,
  stars: [],
  best: [],
  muted: false,
  knockedTotal: 0,
  plays: 0,
  seenCredits: false,
});

let data = defaults();
let levelCount = Infinity;

const count = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Keep only the fields that have the right type. Anything else (null, strings, a hand-edited
 * or older save) falls back to the default, so a bad field can never lock the game up.
 */
function sanitize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  if (Array.isArray(raw.stars)) d.stars = raw.stars.slice(0, levelCount).map((v) => Math.min(3, count(v)));
  if (Array.isArray(raw.best)) d.best = raw.best.slice(0, levelCount).map(count);
  if (Number.isFinite(raw.unlocked)) d.unlocked = Math.max(1, Math.min(levelCount, Math.floor(raw.unlocked)));
  if (Number.isFinite(raw.knockedTotal)) d.knockedTotal = count(raw.knockedTotal);
  if (Number.isFinite(raw.plays)) d.plays = count(raw.plays);
  if (typeof raw.muted === 'boolean') d.muted = raw.muted;
  if (typeof raw.seenCredits === 'boolean') d.seenCredits = raw.seenCredits;
  return d;
}

export const Save = {
  get data() {
    return data;
  },

  /** Load the save. `levels` is how many rooms exist, so `unlocked` can be clamped to 1..levels. */
  load(levels = Infinity) {
    levelCount = levels;
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? sanitize(JSON.parse(raw)) : defaults();
    } catch (_) {
      data = defaults();
    }
    return data;
  },

  write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {
      /* private mode or storage full: progress just won't persist */
    }
  },

  stars(i) {
    return data.stars[i] || 0;
  },

  best(i) {
    return data.best[i] || 0;
  },

  totalStars() {
    return data.stars.reduce((a, b) => a + (b || 0), 0);
  },

  /** Record a finished level. Returns what changed so the results screen can celebrate. */
  record(i, stars, score, knocked, levelCount) {
    const prevStars = this.stars(i);
    const prevBest = this.best(i);
    const prevUnlocked = data.unlocked;
    data.stars[i] = Math.max(prevStars, stars);
    data.best[i] = Math.max(prevBest, score);
    data.knockedTotal += knocked;
    data.plays += 1;
    if (stars > 0) data.unlocked = Math.min(levelCount, Math.max(data.unlocked, i + 2));
    this.write();
    return {
      newBest: score > prevBest && prevBest > 0,
      firstClear: prevStars === 0 && stars > 0,
      unlockedNext: data.unlocked > prevUnlocked,
    };
  },

  setMuted(m) {
    data.muted = m;
    this.write();
  },

  reset() {
    data = defaults();
    this.write();
  },
};
