// Progressive enhancement: the rest of the page never depends on GPU support.
const root = document.getElementById('shardField');
const stage = document.getElementById('shardStage');
const pauseButton = document.getElementById('shardPause');
const status = document.getElementById('shardStatus');
const instructions = document.getElementById('shardInstructions');
const flowButtons = [...document.querySelectorAll('[data-shard-flow]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 800px)');
const names = {stream: '流动', vortex: '环绕', ribbon: '丝带'};
let renderer, observer, loaded = false, ready = false, disposed = false, fallback = false, failed = false;
let userPaused = false, flow = 'stream';
const options = () => ({
  backgroundColor: '#FFFFFF', shardColor: '#93BBCE', accentColor: '#83B9D2',
  placement: 'full', flow, material: 'pearl', detail: 'balanced', effect: 'none',
  scale: 1, spread: .68, depth: .85, speed: .55, spin: .65,
  interaction: 'repel', density: compact.matches ? .6 : .85, shardSize: 1.15,
  stretch: 1, turbulence: .65, glow: .65, edgeSoftness: 2, bloom: .22,
  grain: .018, chromaticAberration: .0008, transitionDuration: 1.2,
  interactionRadius: 1.5, interactionStrength: .5, rippleIntensity: .8,
  holdToGather: true, paused: userPaused || reduced.matches,
  onError: fallback ? fallbackFailed : useFallback
});
function fallbackFailed() {
  failed = true;
  ready = false;
  root.dataset.ready = 'false';
  syncControls();
}
function syncControls() {
  flowButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.shardFlow === flow)));
  pauseButton.disabled = !ready || reduced.matches || failed;
  pauseButton.setAttribute('aria-pressed', String(userPaused || reduced.matches));
  pauseButton.textContent = failed ? '静态呈现' : reduced.matches ? '已减少动态' : !ready ? '载入互动' : userPaused ? '继续动态' : '暂停动态';
  status.textContent = failed ? '静态概念展示' : !ready ? (loaded ? '微光准备中' : '感知 · 理解 · 陪伴') : reduced.matches ? '已遵循减少动态偏好' : userPaused ? `${names[flow]} · 已暂停` : `${names[flow]} · ${fallback ? '轻量互动' : '珍珠微光'}`;
  instructions.hidden = !ready || reduced.matches || userPaused || failed;
}
function applyOptions() {
  renderer?.setOptions(options());
  syncControls();
}
async function useFallback() {
  if (fallback || disposed) return;
  fallback = true;
  ready = false;
  renderer?.dispose();
  renderer = undefined;
  root.dataset.ready = 'false';
  // A canvas that has acquired a GPU context cannot acquire a 2D context.
  const canvas = root.querySelector('canvas');
  canvas.replaceWith(canvas.cloneNode(false));
  try {
    const { mountFallback } = await import('./aero-fallback.js');
    if (disposed) return;
    renderer = mountFallback(root, options());
    ready = root.dataset.ready === 'true';
  } catch {
    failed = true;
    root.dataset.ready = 'false';
  }
  syncControls();
}
async function load() {
  if (loaded || disposed) return;
  loaded = true;
  observer?.disconnect();
  if (!navigator.gpu || !window.isSecureContext) return useFallback();
  try {
    const { mountAeroShards } = await import('./aero-shards.js');
    if (disposed) return;
    root.dataset.renderer = 'webgpu';
    const gpuRenderer = mountAeroShards(root, options());
    renderer = gpuRenderer;
    const presented = await gpuRenderer.ready;
    if (disposed || fallback) return;
    ready = presented;
    if (!presented) return useFallback();
    syncControls();
  } catch {
    await useFallback();
  }
}
flowButtons.forEach(button => button.addEventListener('click', () => {
  flow = button.dataset.shardFlow;
  applyOptions();
  if (!loaded) void load();
}));
pauseButton.addEventListener('click', () => {
  userPaused = !userPaused;
  applyOptions();
});
reduced.addEventListener('change', applyOptions);
compact.addEventListener('change', applyOptions);
// Defer shader download and compilation until the new scene approaches view.
observer = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) void load();
}, {rootMargin: '220px'});
observer.observe(stage);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true;
  renderer?.dispose();
  observer?.disconnect();
  reduced.removeEventListener('change', applyOptions);
  compact.removeEventListener('change', applyOptions);
});
syncControls();
