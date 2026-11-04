// requestAnimationFrame loop with clamped delta time.

export function startLoop(tick) {
  let last = performance.now();
  let running = true;
  const frame = (now) => {
    if (!running) return;
    let dt = (now - last) / 1000;
    last = now;
    // a hitch (tab switch, GC pause) should never teleport the cat through a wall
    if (dt > 1 / 20) dt = 1 / 20;
    if (dt < 0) dt = 0;
    tick(dt, now / 1000);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    stop() { running = false; },
    reset() { last = performance.now(); },
  };
}
