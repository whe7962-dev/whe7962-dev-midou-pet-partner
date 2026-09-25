/* A local closed-eye patch plus quiet independent breathing for the white cat.
   No whole-face crossfades, audio, scroll interception, or image-layout wrappers. */
(() => {
  'use strict';
  const stage = document.getElementById('cinemaStage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const subjects = [...document.querySelectorAll('.cat-skin.front, .meet-portrait>img, .belief-bottom>img, .download-cat>img')];
  if (!subjects.length) return;
  const intervals = [5.2, 7.1, 4.8, 8.4, 6.3];
  const blinkDuration = .29;
  const motionProperties = ['--cat-drift-x', '--cat-drift-y', '--cat-sway', '--cat-breathe', '--cat-base-depth'];
  let disposed = false;
  let blinkReady = false;
  let raf = 0;
  let previousStamp = null;

  const globallyPaused = () => reduced.matches || ['paused', 'reduced', 'disposed'].includes(stage?.dataset.motion);
  const allowed = entry => entry.visible && !document.hidden && !globallyPaused() &&
    (entry.hero ? stage?.dataset.motion === 'playing' && Number(stage.dataset.heroTime || 0) >= 3 : entry.image.complete && entry.image.naturalWidth > 0);

  function positionValue(value, remaining) {
    if (!value || value === 'center') return remaining / 2;
    if (value === 'left' || value === 'top') return 0;
    if (value === 'right' || value === 'bottom') return remaining;
    return value.endsWith('%') ? remaining * parseFloat(value) / 100 : parseFloat(value) || 0;
  }

  // All coordinates are local pre-transform dimensions, including contain letterboxing.
  function imageRectangle(entry, style, width, height) {
    const ratio = entry.hero ? 1 : (entry.image.naturalWidth || 1254) / (entry.image.naturalHeight || 1254);
    let drawWidth = width;
    let drawHeight = height;
    if (entry.hero && !['contain', 'cover'].includes(style.backgroundSize)) {
      const [x, y] = style.backgroundSize.split(' ');
      drawWidth = x.endsWith('%') ? width * parseFloat(x) / 100 : parseFloat(x) || width;
      drawHeight = !y || y === 'auto' ? drawWidth / ratio : y.endsWith('%') ? height * parseFloat(y) / 100 : parseFloat(y) || height;
    } else {
      const cover = (entry.hero ? style.backgroundSize : style.objectFit) === 'cover';
      const factor = cover ? Math.max(width / ratio, height) : Math.min(width / ratio, height);
      drawWidth = factor * ratio;
      drawHeight = factor;
    }
    const [x, y = '50%'] = (entry.hero ? style.backgroundPosition : style.objectPosition).split(' ');
    return { left: positionValue(x, width - drawWidth), top: positionValue(y, height - drawHeight), width: drawWidth, height: drawHeight };
  }

  const entries = subjects.map((image, index) => {
    const hero = image.classList.contains('cat-skin');
    const overlay = document.createElement('span');
    overlay.className = `cat-life-overlay ${hero ? 'is-hero' : 'is-portrait'}`;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.dataset.blink = 'open';
    const patch = document.createElement('span');
    patch.className = 'cat-life-patch';
    overlay.append(patch);
    if (hero) image.append(overlay);
    else { image.parentElement.append(overlay); image.classList.add('cat-life-moving'); }
    return { image, hero, overlay, patch, visible: false, time: 0, nextBlink: intervals[index % intervals.length] + index * .4,
      blinkIndex: index, blinkEnd: 0, index, savedProperties: motionProperties.map(name => [name, image.style.getPropertyValue(name)]) };
  });

  function measure(entry) {
    const style = getComputedStyle(entry.image);
    const width = Math.max(1, entry.image.clientWidth || entry.image.offsetWidth);
    const height = Math.max(1, entry.image.clientHeight || entry.image.offsetHeight);
    if (!entry.hero) {
      Object.assign(entry.overlay.style, { left: `${entry.image.offsetLeft}px`, top: `${entry.image.offsetTop}px`, width: `${width}px`, height: `${height}px`,
        transform: style.transform, transformOrigin: style.transformOrigin });
    }
    const rect = imageRectangle(entry, style, width, height);
    Object.assign(entry.patch.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }

  function move(entry, staticScene = false) {
    if (entry.hero) return;
    const angle = entry.time / (16 + entry.index * 3) * Math.PI * 2;
    const x = staticScene ? 0 : Math.sin(angle) * (entry.index === 3 ? 8 : 5);
    const y = staticScene ? 0 : Math.sin(angle * 2) * -6;
    const sway = staticScene ? 0 : Math.sin(angle) * .85;
    const breath = staticScene ? 1 : 1 + Math.sin(angle * 2) * .008;
    // Only the image's OWN parallax value is copied; a translated parent must not be counted twice.
    const depth = entry.image.style.getPropertyValue('--depth-y') || '0px';
    for (const target of [entry.image, entry.overlay]) {
      target.style.setProperty('--cat-drift-x', `${x.toFixed(3)}px`);
      target.style.setProperty('--cat-drift-y', `${y.toFixed(3)}px`);
      target.style.setProperty('--cat-sway', `${sway.toFixed(3)}deg`);
      target.style.setProperty('--cat-breathe', breath.toFixed(5));
      target.style.setProperty('--cat-base-depth', depth);
    }
  }

  function openEyes(entry) { entry.overlay.dataset.blink = 'open'; entry.blinkEnd = 0; }

  function tick(stamp) {
    raf = 0;
    if (disposed || document.hidden || globallyPaused()) { previousStamp = null; return; }
    const dt = previousStamp === null ? 0 : Math.min(.08, Math.max(0, (stamp - previousStamp) / 1000));
    previousStamp = stamp;
    for (const entry of entries) {
      if (!allowed(entry)) continue;
      entry.time += dt;
      move(entry);
      if (entry.blinkEnd && entry.time >= entry.blinkEnd) openEyes(entry);
      if (blinkReady && !entry.blinkEnd && entry.time >= entry.nextBlink) {
        entry.overlay.dataset.blink = 'closed';
        entry.blinkEnd = entry.time + blinkDuration;
        entry.blinkIndex++;
        entry.nextBlink = entry.time + intervals[entry.blinkIndex % intervals.length];
      }
    }
    if (entries.some(allowed)) raf = requestAnimationFrame(tick); else previousStamp = null;
  }

  function sync() {
    if (disposed) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    previousStamp = null;
    for (const entry of entries) {
      if (!allowed(entry)) openEyes(entry);
      if (reduced.matches) move(entry, true);
      entry.overlay.classList.toggle('is-static', !allowed(entry));
    }
    if (!document.hidden && !globallyPaused() && entries.some(allowed)) raf = requestAnimationFrame(tick);
  }

  const intersection = new IntersectionObserver(records => {
    for (const record of records) for (const entry of entries) if (record.target === (entry.hero ? stage : entry.image)) {
      entry.visible = record.isIntersecting;
    }
    sync();
  }, { threshold: [0, .05] });
  const resize = new ResizeObserver(() => { entries.forEach(measure); sync(); });
  const onLoad = () => { entries.forEach(measure); sync(); };
  entries.forEach(entry => { measure(entry); move(entry, true); intersection.observe(entry.hero ? stage : entry.image); resize.observe(entry.image); entry.image.addEventListener('load', onLoad); });
  const stateObserver = new MutationObserver(sync);
  if (stage) stateObserver.observe(stage, { attributes: true, attributeFilter: ['data-motion'] });
  // Hero readiness is reached during its initial pullback; a single delayed check starts its blink clock.
  const onHeroFrame = () => sync();
  stage?.addEventListener('hero-settled', onHeroFrame);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);

  const blink = new Image();
  blink.onload = () => { blinkReady = true; sync(); };
  blink.onerror = () => { blinkReady = false; entries.forEach(openEyes); };
  blink.src = 'assets/midou-blink.png';

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    blink.onload = blink.onerror = null;
    intersection.disconnect(); resize.disconnect(); stateObserver.disconnect();
    stage?.removeEventListener('hero-settled', onHeroFrame);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    for (const entry of entries) {
      entry.image.removeEventListener('load', onLoad);
      entry.image.classList.remove('cat-life-moving');
      entry.savedProperties.forEach(([name, value]) => value ? entry.image.style.setProperty(name, value) : entry.image.style.removeProperty(name));
      entry.overlay.remove();
    }
  }
  window.midouCatLife = Object.freeze({ dispose });
})();
