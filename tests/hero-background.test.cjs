const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/hero-background.js'), 'utf8')
  .replace(/export /g, '')
  .replace("import('./aero-shards.js')", '__importGPU()')
  .replace("import('./aero-fallback.js')", '__importFallback()');
const settle = () => new Promise(resolve => setImmediate(resolve));

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, event = {}) { for (const fn of [...this.listeners.get(name) || []]) fn(event); }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, items) => sum + items.size, 0); }
}

function harness(settings = {}) {
  const window = new Events(); window.isSecureContext = settings.secure !== false;
  const stage = { dataset: { motion: settings.motion || 'playing' } };
  const button = new Events();
  const reduced = new Events(); reduced.matches = !!settings.reduced;
  const compact = new Events(); compact.matches = !!settings.compact;
  const roots = []; const instances = []; const observers = []; const stateObservers = [];
  let gpuImports = 0, fallbackImports = 0, replacements = 0;
  const makeRoot = () => {
    const root = { dataset: {}, parentElement: { id: 'home' }, canvas: null };
    const canvas = () => ({ owner: root, cloneNode: canvas, replaceWith(next) { root.canvas = next; replacements++; } });
    root.canvas = canvas();
    root.querySelector = selector => selector === 'canvas.aero-shards__canvas' ? root.canvas : null;
    roots.push(root); return root;
  };
  const root = settings.missing ? null : makeRoot();
  const document = { getElementById: id => ({ heroShardField: root, cinemaStage: stage, heroMotionToggle: button })[id] || null };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  class StateObserver {
    constructor(callback) { this.callback = callback; stateObservers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const mount = (kind, target, options) => {
    const value = { kind, root: target, options, updates: [], disposed: 0,
      dispose() { this.disposed++; target.dataset.ready = 'false'; },
      setOptions(next) { if (this.throwOnUpdate) throw new Error('update failed'); this.options = next; this.updates.push(next); }
    };
    instances.push(value);
    if ((kind === 'gpu' && settings.gpuCallbackFailure) || (kind === 'fallback' && settings.fallbackCallbackFailure)) {
      options.onError(new Error('mount failed'));
      value.ready = Promise.resolve(false);
      return value;
    }
    target.dataset.ready = 'true';
    target.dataset.renderer = kind === 'gpu' ? 'webgpu' : 'canvas2d';
    value.ready = settings.readyOverride ? settings.readyOverride(value) : Promise.resolve(settings.gpuPresented !== false);
    return value;
  };
  const context = vm.createContext({
    window, document, navigator: { gpu: settings.gpu === false ? undefined : {} },
    matchMedia: query => query.includes('reduced-motion') ? reduced : compact,
    IntersectionObserver: settings.noIntersection ? undefined : Observer,
    MutationObserver: StateObserver,
    __importGPU: async () => {
      gpuImports++;
      if (settings.importGate) await settings.importGate;
      if (settings.gpuImportFailure) throw new Error('GPU bundle unavailable');
      return { mountAeroShards: (target, options) => mount('gpu', target, options) };
    },
    __importFallback: async () => {
      fallbackImports++;
      if (settings.fallbackImportFailure) throw new Error('Fallback bundle unavailable');
      return { mountFallback: (target, options) => mount('fallback', target, options) };
    }
  });
  vm.runInContext(source, context);
  return { root, roots, stage, button, reduced, compact, window, observers, stateObservers, instances,
    api: vm.runInContext('heroBackground', context),
    enter(value = true) { observers[0].callback([{ isIntersecting: value }]); },
    setMotion(value) { stage.dataset.motion = value; stateObservers[0].callback(); },
    mountAnother() { return context.mountHeroBackground(makeRoot()); },
    get gpuImports() { return gpuImports; }, get fallbackImports() { return fallbackImports; },
    get replacements() { return replacements; }
  };
}

test('missing optional Hero markup is a harmless no-op', () => {
  const h = harness({ missing: true });
  assert.equal(h.api, null);
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.gpuImports, 0);
});

test('loads one isolated GPU instance only when the first screen enters view', async () => {
  const h = harness();
  assert.equal(h.gpuImports, 0);
  assert.equal(h.root.dataset.backgroundState, 'waiting');
  assert.equal(h.observers[0].target, h.root.parentElement);
  h.enter(false); await settle(); assert.equal(h.gpuImports, 0);
  h.enter(); h.enter(); await settle();
  assert.equal(await h.api.ready, true);
  assert.equal(h.gpuImports, 1);
  assert.equal(h.instances.length, 1);
  assert.equal(h.root.dataset.backgroundState, 'ready');
  const options = h.instances[0].options;
  assert.equal(options.flow, 'ribbon');
  assert.equal(options.speed, .3);
  assert.equal(options.density, .55);
  assert.equal(options.holdToGather, false);
  assert.equal(options.rippleIntensity, 0);
  assert.equal(options.backgroundColor, '#FFFFFF');
  assert.equal(options.interaction, 'repel');
  assert.ok(options.interactionStrength < .3);
});

test('mobile uses a lighter count preset and responds to viewport preference changes', async () => {
  const h = harness({ compact: true }); h.enter(); await h.api.ready;
  assert.equal(h.instances[0].options.density, .35);
  assert.equal(h.instances[0].options.detail, 'bold');
  h.compact.matches = false; h.compact.emit('change');
  assert.equal(h.instances[0].options.density, .55);
  assert.equal(h.instances[0].options.detail, 'balanced');
});

test('Hero pause, loading, image failure, and reduced-motion states produce a static scene', async () => {
  const h = harness({ motion: 'loading' }); h.enter(); await h.api.ready;
  assert.equal(h.instances[0].options.paused, true);
  for (const state of ['paused', 'reduced', 'error', 'disposed']) {
    h.setMotion(state); assert.equal(h.instances[0].options.paused, true);
  }
  h.setMotion('playing'); assert.equal(h.instances[0].options.paused, false);
  h.reduced.matches = true; h.reduced.emit('change'); assert.equal(h.instances[0].options.paused, true);
  h.reduced.matches = false; h.reduced.emit('change'); assert.equal(h.instances[0].options.paused, false);
  assert.deepEqual(Array.from(h.stateObservers[0].options.attributeFilter), ['data-motion']);
});

test('no WebGPU or insecure context selects a new local 2D canvas without blocking content', async () => {
  for (const options of [{ gpu: false }, { secure: false }]) {
    const h = harness(options); const originalCanvas = h.root.canvas;
    h.enter(); assert.equal(await h.api.ready, true);
    assert.equal(h.gpuImports, 0);
    assert.equal(h.fallbackImports, 1);
    assert.equal(h.instances[0].kind, 'fallback');
    assert.equal(h.root.dataset.renderer, 'canvas2d');
    assert.notEqual(h.root.canvas, originalCanvas);
    assert.equal(h.instances[0].options.holdToGather, false);
  }
});

test('GPU import, initial presentation, and runtime errors each downgrade once', async () => {
  for (const options of [{ gpuImportFailure: true }, { gpuPresented: false }, { gpuCallbackFailure: true }]) {
    const h = harness(options); h.enter(); assert.equal(await h.api.ready, true);
    assert.equal(h.fallbackImports, 1);
    assert.equal(h.instances.at(-1).kind, 'fallback');
    for (const gpu of h.instances.filter(instance => instance.kind === 'gpu')) assert.equal(gpu.disposed, 1);
  }
  const h = harness(); h.enter(); await h.api.ready;
  const first = h.instances[0]; first.options.onError(new Error('device lost')); first.options.onError(new Error('repeat'));
  await settle();
  assert.equal(h.fallbackImports, 1);
  assert.equal(first.disposed, 1);
  assert.equal(h.instances.at(-1).kind, 'fallback');
});

test('a failed 2D fallback leaves a static decorative region and resolves without throwing', async () => {
  for (const options of [{ gpu: false, fallbackImportFailure: true }, { gpu: false, fallbackCallbackFailure: true }]) {
    const h = harness(options); h.enter(); assert.equal(await h.api.ready, false);
    assert.equal(h.root.dataset.ready, 'false');
    assert.equal(h.root.dataset.backgroundState, 'static');
    assert.equal(h.stage.dataset.motion, 'playing');
    h.setMotion('paused');
    assert.equal(h.fallbackImports, 1);
  }
});

test('bfcache pagehide pauses rather than destroys; pageshow resumes the existing instance', async () => {
  const h = harness(); h.enter(); await h.api.ready;
  const renderer = h.instances[0];
  h.window.emit('pagehide', { persisted: true });
  assert.equal(renderer.options.paused, true);
  assert.equal(renderer.disposed, 0);
  h.window.emit('pageshow', { persisted: true });
  assert.equal(renderer.options.paused, false);
  assert.equal(h.instances.length, 1);
  h.window.emit('pagehide', { persisted: false });
  assert.equal(renderer.disposed, 1);
  assert.equal(h.root.dataset.backgroundState, 'disposed');
  assert.equal(h.window.listenerCount + h.reduced.listenerCount + h.compact.listenerCount, 0);
});

test('disposal during an asynchronous import prevents late mounting and cleans listeners', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness({ importGate: gate }); h.enter(); h.api.dispose();
  assert.equal(await h.api.ready, false);
  release(); await settle();
  assert.equal(h.instances.length, 0);
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.stateObservers[0].disconnected, true);
  assert.equal(h.window.listenerCount, 0);
  h.api.dispose();
});

test('local instance failure does not replace or dispose another scene canvas', async () => {
  const h = harness(); h.enter(); await h.api.ready;
  const secondAPI = h.mountAnother(); h.observers[1].callback([{ isIntersecting: true }]); await secondAPI.ready;
  const second = h.instances[1], canvas = second.root.canvas;
  h.instances[0].options.onError(new Error('first scene failure')); await settle();
  assert.equal(second.disposed, 0);
  assert.equal(second.root.canvas, canvas);
  assert.equal(second.root.dataset.renderer, 'webgpu');
  assert.equal(h.replacements, 1);
});

test('a setOptions error downgrades safely and no IntersectionObserver still initializes', async () => {
  const h = harness({ noIntersection: true }); await h.api.ready;
  h.instances[0].throwOnUpdate = true; h.setMotion('paused'); await settle();
  assert.equal(h.instances.at(-1).kind, 'fallback');
  assert.equal(h.instances.at(-1).options.paused, true);
});
