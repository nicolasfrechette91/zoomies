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

export const Save = {
  get data() {
    return data;
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = Object.assign(defaults(), JSON.parse(raw));
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
