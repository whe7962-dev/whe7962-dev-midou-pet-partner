// A second, independent AeroShards instance. Foreground content never depends on it.
export function mountHeroBackground(root) {
  if (!root || !root.querySelector('canvas.aero-shards__canvas')) return null;
  const hero = root.parentElement || root;
  const catStage = document.getElementById('cinemaStage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 800px)');
  let renderer;
  let enterObserver;
  let stateObserver;
  let disposed = false;
  let suspended = false;
  let loaded = false;
  let inView = false;
  let fallback = false;
  let failed = false;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  const paused = () => suspended || reduced.matches || ['loading', 'paused', 'reduced', 'error', 'disposed'].includes(catStage?.dataset.motion);
  const options = () => ({
    backgroundColor: '#FFFFFF', shardColor: '#B8D4E2', accentColor: '#97C1D6',
    placement: 'full', flow: 'ribbon', material: 'pearl', effect: 'none',
    // The shared GPU implementation clamps density at .5: bold further lowers mobile count.
    detail: compact.matches ? 'bold' : 'balanced', density: compact.matches ? .35 : .55,
    scale: 1, spread: .76, depth: .55, speed: .3, spin: .3,
    shardSize: compact.matches ? .7 : .82, stretch: 1, turbulence: .35,
    glow: .35, edgeSoftness: 2, bloom: .12, grain: .008, chromaticAberration: 0,
    transitionDuration: 1.5, interaction: 'repel', interactionRadius: 1.2,
    interactionStrength: .22, rippleIntensity: 0, holdToGather: false,
    paused: paused(), onError: fallback ? failStatic : useFallback
  });

  function markReady() {
    root.dataset.backgroundState = 'ready';
    resolveReady(true);
  }

  function failStatic() {
    if (disposed || failed) return;
    failed = true;
    renderer?.dispose();
    renderer = undefined;
    root.dataset.ready = 'false';
    root.dataset.backgroundState = 'static';
    resolveReady(false);
  }

  async function useFallback() {
    if (fallback || disposed || failed) return;
    fallback = true;
    renderer?.dispose();
    renderer = undefined;
    root.dataset.ready = 'false';
    // GPU and 2D contexts cannot share a canvas, so replace only this instance's canvas.
    const canvas = root.querySelector('canvas.aero-shards__canvas');
    if (!canvas) return failStatic();
    canvas.replaceWith(canvas.cloneNode(false));
    try {
      const { mountFallback } = await import('./aero-fallback.js');
      if (disposed || failed) return;
      const next = mountFallback(root, options());
      if (disposed || failed) { next?.dispose(); return; }
      renderer = next;
      if (root.dataset.ready !== 'true') return failStatic();
      markReady();
    } catch {
      failStatic();
    }
  }

  async function load() {
    if (loaded || disposed || suspended) return;
    loaded = true;
    enterObserver?.disconnect();
    root.dataset.backgroundState = 'loading';
    if (!navigator.gpu || !window.isSecureContext) return useFallback();
    try {
      const { mountAeroShards } = await import('./aero-shards.js');
      if (disposed || fallback || failed) return;
      root.dataset.renderer = 'webgpu';
      const next = mountAeroShards(root, options());
      if (disposed || fallback || failed) { next?.dispose(); return; }
      renderer = next;
      const presented = await next.ready;
      if (disposed || fallback || failed) return;
      if (!presented) return useFallback();
      markReady();
    } catch {
      await useFallback();
    }
  }

  function applyOptions() {
    if (disposed || failed) return;
    try { renderer?.setOptions(options()); }
    catch { if (fallback) failStatic(); else void useFallback(); }
  }

  function pageHide(event) {
    if (!event.persisted) return dispose();
    // Keep the instance restorable in bfcache, but stop its animation before suspension.
    suspended = true;
    applyOptions();
  }

  function pageShow() {
    if (disposed) return;
    suspended = false;
    applyOptions();
    if (inView && !loaded) void load();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer?.dispose();
    renderer = undefined;
    enterObserver?.disconnect();
    stateObserver?.disconnect();
    reduced.removeEventListener('change', applyOptions);
    compact.removeEventListener('change', applyOptions);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    document.getElementById('heroMotionToggle')?.removeEventListener('click', applyOptions);
    root.dataset.ready = 'false';
    root.dataset.backgroundState = 'disposed';
    resolveReady(false);
  }

  root.dataset.ready = 'false';
  root.dataset.backgroundState = 'waiting';
  reduced.addEventListener('change', applyOptions);
  compact.addEventListener('change', applyOptions);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  if (catStage && typeof MutationObserver === 'function') {
    stateObserver = new MutationObserver(applyOptions);
    stateObserver.observe(catStage, { attributes: true, attributeFilter: ['data-motion'] });
  } else {
    document.getElementById('heroMotionToggle')?.addEventListener('click', applyOptions);
  }
  if (typeof IntersectionObserver === 'function') {
    enterObserver = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      if (inView) void load();
    }, { threshold: 0 });
    enterObserver.observe(hero);
  } else {
    inView = true;
    void load();
  }
  return Object.freeze({ ready, dispose });
}

export const heroBackground = mountHeroBackground(document.getElementById('heroShardField'));
