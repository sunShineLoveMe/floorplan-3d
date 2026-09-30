/** Each mounted component owns its listeners, observers and pending timers. */
export function createScope() {
  const cleanups = new Set();
  let disposed = false;
  return {
    get disposed() { return disposed; },
    on(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      cleanups.add(() => target.removeEventListener(type, fn, options));
    },
    observe(target, fn) {
      const observer = new ResizeObserver(fn); observer.observe(target);
      cleanups.add(() => observer.disconnect());
    },
    timeout(fn, ms) {
      const cleanup = () => clearTimeout(timer);
      const timer = setTimeout(() => { cleanups.delete(cleanup); if (!disposed) fn(); }, ms);
      cleanups.add(cleanup); return timer;
    },
    wait(ms) {
      return new Promise(resolve => {
        const cleanup = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(() => { cleanups.delete(cleanup); resolve(); }, ms);
        cleanups.add(cleanup);
      });
    },
    dispose() { if (disposed) return; disposed = true; cleanups.forEach(fn => fn()); cleanups.clear(); }
  };
}
