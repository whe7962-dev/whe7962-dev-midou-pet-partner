/* Event-driven gallery depth. No timers, autoplay, or touch-scroll interception. */
(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.moment-card')];
  if (!cards.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const properties = ['--card-rx', '--card-ry', '--photo-x', '--photo-y'];
  const clamp = value => Math.max(-1, Math.min(1, value));
  let raf = 0, disposed = false;
  const entries = cards.map(card => ({card, rect: null, visible: true, pending: null,
    saved: properties.map(name => [name, card.style.getPropertyValue(name)])}));
  const allowed = () => !disposed && !document.hidden && !reduced.matches && fine.matches;
  function reset(entry) {
    entry.pending = null;
    entry.rect = null;
    entry.saved.forEach(([name, value]) => value ? entry.card.style.setProperty(name, value) : entry.card.style.removeProperty(name));
  }
  function resetAll() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    entries.forEach(reset);
  }
  function render() {
    raf = 0;
    if (!allowed()) return resetAll();
    entries.forEach(entry => {
      if (!entry.pending || !entry.visible) return;
      const [x, y] = entry.pending;
      entry.pending = null;
      const values = [(-y * 1.8).toFixed(2) + 'deg', (x * 2.2).toFixed(2) + 'deg',
        (x * -4).toFixed(2) + 'px', (y * -4).toFixed(2) + 'px'];
      properties.forEach((name, i) => entry.card.style.setProperty(name, values[i]));
    });
  }
  entries.forEach(entry => {
    entry.move = event => {
      if (!allowed() || !entry.visible || event.pointerType !== 'mouse') return;
      if (!entry.rect) entry.rect = entry.card.getBoundingClientRect();
      const r = entry.rect;
      if (!r.width || !r.height) return;
      entry.pending = [clamp((event.clientX - r.left) / r.width * 2 - 1), clamp((event.clientY - r.top) / r.height * 2 - 1)];
      if (!raf) raf = requestAnimationFrame(render);
    };
    entry.leave = () => reset(entry);
    entry.card.addEventListener('pointermove', entry.move, {passive:true});
    entry.card.addEventListener('pointerleave', entry.leave);
    entry.card.addEventListener('pointercancel', entry.leave);
    entry.card.addEventListener('blur', entry.leave);
  });
  const observer = new IntersectionObserver(records => records.forEach(record => {
    const entry = entries.find(item => item.card === record.target);
    if (!entry) return;
    entry.visible = record.isIntersecting;
    if (!entry.visible) reset(entry);
  }));
  entries.forEach(entry => observer.observe(entry.card));
  const invalidate = () => entries.forEach(entry => {entry.rect = null;});
  const visibility = () => { if (document.hidden) resetAll(); };
  function pagehide(event) { if (event.persisted) resetAll(); else dispose(); }
  window.addEventListener('resize', resetAll, {passive:true});
  window.addEventListener('scroll', invalidate, {passive:true});
  window.addEventListener('pagehide', pagehide);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', resetAll);
  fine.addEventListener('change', resetAll);
  function dispose() {
    if (disposed) return;
    disposed = true;
    resetAll(); observer.disconnect();
    entries.forEach(entry => {
      entry.card.removeEventListener('pointermove', entry.move);
      for (const name of ['pointerleave', 'pointercancel', 'blur']) entry.card.removeEventListener(name, entry.leave);
    });
    window.removeEventListener('resize', resetAll);
    window.removeEventListener('scroll', invalidate);
    window.removeEventListener('pagehide', pagehide);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', resetAll);
    fine.removeEventListener('change', resetAll);
  }
  window.petGalleryMotion = Object.freeze({dispose});
})();
