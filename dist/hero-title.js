// Preserve the real heading and its line breaks; enhance only individual glyphs.
(() => {
  'use strict';
  const title = document.getElementById('heroTitle');
  if (!title || title.dataset.titleEnhanced === 'true') return;
  const stage = document.getElementById('cinemaStage');
  const surface = title.closest('.hero-product') || title.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const originalLabel = title.getAttribute('aria-label');
  const originals = [], letters = [], listeners = [];
  const pointer = {active: false, x: 0, y: 0};
  let disposed = false, visible = true, dirty = true, frame = 0, previous = null;
  let elapsed = 0, entranceDone = reduced.matches, delay = 0, accentIndex = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const textNodes = [];
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);
  title.setAttribute('aria-label', originalLabel || title.textContent);
  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();
    const accent = Boolean(textNode.parentElement.closest('.serif'));
    const shells = [];
    if (accent) delay += .15;
    for (const character of Array.from(textNode.textContent)) {
      const shell = document.createElement('span');
      const glyph = document.createElement('span');
      shell.className = 'letter-shell';
      shell.setAttribute('aria-hidden', 'true');
      glyph.className = 'title-letter';
      glyph.textContent = character;
      shell.append(glyph); fragment.append(shell); shells.push(shell);
      letters.push({shell, glyph, delay, accent, accentIndex: accent ? accentIndex++ : -1, x: 0, y: 0, radius: 90, lift: 0, turn: 0});
      delay += /[，。！？、；：]/u.test(character) ? .17 : .074;
    }
    originals.push({textNode, shells});
    textNode.replaceWith(fragment);
  }
  const entranceDuration = Math.max(0, ...letters.map(letter => letter.delay)) + .62;
  title.dataset.titleEnhanced = 'true';

  function listen(target, name, callback, options = {passive: true}) {
    target.addEventListener(name, callback, options);
    listeners.push(() => target.removeEventListener(name, callback, options));
  }
  function stageState() { return stage?.dataset.motion || 'playing'; }
  function running() {
    return !disposed && visible && !document.hidden && !reduced.matches && stageState() === 'playing';
  }
  function clearPointer() { pointer.active = false; }
  function geometryChanged() { dirty = true; clearPointer(); }
  function measure() {
    // The untransformed shells are measured only when layout changes, never per frame.
    for (const letter of letters) {
      const bounds = letter.shell.getBoundingClientRect();
      letter.x = bounds.left + bounds.width / 2;
      letter.y = bounds.top + bounds.height / 2;
      letter.radius = clamp(bounds.height * 1.7, 65, 155);
    }
    dirty = false;
  }
  function reset() {
    clearPointer();
    for (const letter of letters) {
      letter.lift = letter.turn = 0;
      letter.glyph.style.setProperty('--title-y', '0px');
      letter.glyph.style.setProperty('--title-turn', '0deg');
      letter.glyph.style.setProperty('--title-glow', '0');
      letter.glyph.style.setProperty('--title-pointer-lift', '0px');
    }
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = null;
  }
  function render(delta) {
    if (pointer.active && dirty) measure();
    const settled = entranceDone || elapsed >= entranceDuration;
    if (settled) entranceDone = true;
    const breathing = settled ? -2.25 * Math.pow(Math.sin((elapsed - entranceDuration) * Math.PI / 5.4), 2) : 0;
    const lightCycle = Math.max(0, elapsed - entranceDuration) % 8.2;
    const lightPosition = (lightCycle - .65) / 2.5;
    const response = 1 - Math.exp(-delta * 12);
    for (const letter of letters) {
      const progress = entranceDone ? 1 : clamp((elapsed - letter.delay) / .62, 0, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const entrance = 8 * (1 - ease);
      let targetLift = 0, targetTurn = 0;
      if (pointer.active && fine.matches && settled) {
        const dx = pointer.x - letter.x, dy = pointer.y - letter.y;
        const strength = Math.pow(clamp(1 - Math.hypot(dx, dy) / letter.radius, 0, 1), 2);
        targetLift = -4 * strength;
        targetTurn = clamp(dx / letter.radius, -1, 1) * strength * .8;
      }
      letter.lift += (targetLift - letter.lift) * response;
      letter.turn += (targetTurn - letter.turn) * response;
      // Idle breathing is at most 2.25 px; combined hover lift never exceeds 4 px.
      letter.lift = clamp(letter.lift, -4, 0);
      letter.turn = clamp(letter.turn, -.8, .8);
      const position = letter.accentIndex / Math.max(1, accentIndex - 1);
      const glow = settled && letter.accent && lightPosition >= -.2 && lightPosition <= 1.2
        ? Math.exp(-Math.pow((position - lightPosition) / .2, 2)) * .38 : 0;
      const vertical = entranceDone ? Math.max(-4, breathing + letter.lift) : entrance;
      letter.glyph.style.setProperty('--title-y', `${vertical.toFixed(3)}px`);
      letter.glyph.style.setProperty('--title-pointer-lift', `${letter.lift.toFixed(3)}px`);
      letter.glyph.style.setProperty('--title-turn', `${letter.turn.toFixed(3)}deg`);
      letter.glyph.style.setProperty('--title-glow', glow.toFixed(3));
    }
  }
  function tick(now) {
    frame = 0;
    if (!running()) return;
    const delta = previous === null ? 0 : clamp((now - previous) / 1000, 0, .05);
    previous = now; elapsed += delta;
    render(delta);
    if (running()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    if (reduced.matches || ['paused', 'reduced', 'error', 'disposed'].includes(stageState())) entranceDone = true;
    const active = running();
    title.dataset.titleMotion = active ? 'playing' : 'static';
    if (active) frame = requestAnimationFrame(tick);
    else reset();
  }
  function move(event) {
    if (!running() || !fine.matches || event.pointerType === 'touch') return;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
  }
  function preferenceChanged() { clearPointer(); sync(); }
  function dispose() {
    if (disposed) return;
    disposed = true; stop(); reset();
    visibilityObserver?.disconnect(); resizeObserver?.disconnect(); stateObserver?.disconnect();
    listeners.forEach(remove => remove());
    for (const {textNode, shells} of originals) {
      if (shells.length && shells[0].parentNode) {
        shells[0].parentNode.insertBefore(textNode, shells[0]);
        shells.forEach(shell => shell.remove());
      }
    }
    if (originalLabel === null) title.removeAttribute('aria-label');
    else title.setAttribute('aria-label', originalLabel);
    delete title.dataset.titleEnhanced; delete title.dataset.titleMotion;
  }
  function pagehide(event) { if (event.persisted) { stop(); reset(); } else dispose(); }
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); sync();
  }, {threshold: .05}) : null;
  visibilityObserver?.observe(title);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(geometryChanged) : null;
  resizeObserver?.observe(title);
  const stateObserver = typeof MutationObserver === 'function' ? new MutationObserver(sync) : null;
  if (stage) stateObserver?.observe(stage, {attributes: true, attributeFilter: ['data-motion']});
  listen(surface, 'pointermove', move);
  listen(surface, 'pointerleave', clearPointer);
  listen(surface, 'transitionend', geometryChanged);
  listen(window, 'scroll', geometryChanged, {passive: true, capture: true});
  listen(window, 'resize', geometryChanged);
  listen(window, 'blur', clearPointer);
  listen(window, 'pagehide', pagehide);
  listen(window, 'pageshow', sync);
  listen(document, 'visibilitychange', sync);
  listen(reduced, 'change', preferenceChanged);
  listen(fine, 'change', preferenceChanged);
  reset(); sync();
})();
