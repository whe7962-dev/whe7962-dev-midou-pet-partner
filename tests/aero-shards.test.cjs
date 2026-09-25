const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/aero-shards.js'), 'utf8')
  .replace(/^import .* from '\.\/vendor\/vgpu\.js';$/m, '')
  .replace('export function mountAeroShards', 'function mountAeroShards');

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn(event); }
  get count() { return [...this.listeners.values()].reduce((sum, list) => sum + list.size, 0); }
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ reduced = false, webgpu = true, initOverride } = {}) {
  const window = new Events();
  const document = new Events();
  const media = new Events();
  media.matches = reduced;
  window.matchMedia = () => media;
  window.devicePixelRatio = 1;
  document.hidden = false;
  const raf = new Map();
  const timers = new Map();
  const resources = [];
  const observers = [];
  let sequence = 0;
  let now = 100;
  let renderCount = 0;
  let disposeCount = 0;
  let errorHandler;
  let frameFailure = false;
  const gpu = {
    onError(fn) { errorHandler = fn; return () => { errorHandler = null; }; },
    dispose() { disposeCount++; }
  };
  const resource = (settings = {}) => {
    const value = {
      ...settings,
      set(next) { Object.assign(this, next); },
      compile() { return Promise.resolve(); },
      resize(size) { this.size = size; },
      onResize() { return () => {}; }
    };
    resources.push(value);
    return value;
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const canvas = { clientWidth: 900, clientHeight: 600 };
  const root = {
    dataset: {},
    querySelector: () => canvas,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 })
  };
  const context = vm.createContext({
    console, window, document, Element: class {},
    navigator: { hardwareConcurrency: 6, gpu: webgpu ? { getPreferredCanvasFormat: () => 'bgra8unorm' } : undefined },
    performance: { now: () => now },
    requestAnimationFrame(fn) { const id = ++sequence; raf.set(id, fn); return id; },
    cancelAnimationFrame(id) { raf.delete(id); },
    IntersectionObserver: Observer, ResizeObserver: Observer,
    init: initOverride || (() => Promise.resolve(gpu)),
    draw: (_, config) => resource(config),
    effect: () => resource(), sampler: () => resource(),
    target: (_, config) => resource(config),
    uniforms: (_, config) => resource(config),
    surface: () => resource({ size: [900, 600] }),
    frame(_, callback) {
      if (frameFailure) throw new Error('simulated device failure');
      renderCount++;
      callback({ pass(_, draw) { draw({ draw() {} }); } });
    }
  });
  window.setTimeout = fn => { const id = ++sequence; timers.set(id, fn); return id; };
  window.clearTimeout = id => timers.delete(id);
  vm.runInContext(source, context);
  return {
    mount: options => context.mountAeroShards(root, options), context, root, window, document, media,
    observers, resources, gpu, raf,
    advance(ms = 20) {
      now += ms;
      const callbacks = [...raf.values()];
      raf.clear();
      callbacks.forEach(fn => fn(now));
    },
    pointer(type, overrides = {}) {
      window.emit(type, { isPrimary: true, button: 0, pointerType: 'mouse', pointerId: 1,
        clientX: 450, clientY: 300, target: null, ...overrides });
    },
    get renders() { return renderCount; },
    get disposed() { return disposeCount; },
    get view() { return resources.find(value => 'gather' in value); },
    fail() { frameFailure = true; },
    gpuError(error) { errorHandler?.(error); }
  };
}

test('API validates the root, canvas, options, and finite numeric values', () => {
  const h = harness();
  assert.throws(() => h.context.mountAeroShards(null), /root element/);
  assert.throws(() => h.context.mountAeroShards({ dataset: {}, querySelector: () => null }), /canvas/);
  assert.throws(() => h.mount(null), /options must be an object/);
  assert.throws(() => h.mount({ speed: NaN }), /finite/);
  assert.throws(() => h.mount({ scale: 'invalid' }), /finite number/);
  assert.throws(() => h.mount({ onError: true }), /function/);
});

test('WebGPU absence calls fallback once and removes registered listeners', async () => {
  const h = harness({ webgpu: false });
  const errors = [];
  const api = h.mount({ onError: error => errors.push(error) });
  assert.equal(await api.ready, false);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /WebGPU is unavailable/);
  assert.equal(h.root.dataset.ready, 'false');
  assert.equal(h.window.count + h.document.count + h.media.count, 0);
  assert.equal(api.setOptions({ paused: false }), false);
  api.dispose();
  assert.equal(errors.length, 1);
});

test('rejected GPU initialization resolves ready false and reports once', async () => {
  const h = harness({ initOverride: () => Promise.reject(new Error('adapter unavailable')) });
  let errors = 0;
  const api = h.mount({ onError() { errors++; } });
  assert.equal(await api.ready, false);
  assert.equal(errors, 1);
  assert.equal(h.window.count, 0);
});

test('paused scene presents once and ignores pointer movement, presses, and release', async () => {
  const h = harness();
  const api = h.mount({ paused: true, flow: 'stream' });
  await settle();
  h.advance(); h.advance();
  assert.equal(await api.ready, true);
  const before = h.renders;
  for (const type of ['pointermove', 'pointerdown', 'pointerup', 'pointercancel']) h.pointer(type);
  h.advance();
  assert.equal(h.renders, before);
  assert.equal(h.raf.size, 0);
  assert.equal(api.setOptions({ flow: 'vortex' }), true);
  h.advance();
  assert.equal(h.view.formation[1], 1);
  assert.throws(() => api.setOptions({ speed: Infinity }), /finite/);
  api.dispose();
});

test('system reduced motion disables interaction and continuous frames', async () => {
  const h = harness({ reduced: true });
  const api = h.mount({ holdToGather: true });
  await settle();
  h.advance(); h.advance();
  assert.equal(await api.ready, true);
  const before = h.renders;
  h.pointer('pointerdown'); h.pointer('pointermove'); h.pointer('pointerup');
  h.advance(500);
  assert.equal(h.renders, before);
  assert.equal(h.view.gather[2], 0);
  assert.equal(h.raf.size, 0);
  h.media.matches = false;
  h.media.emit('change');
  h.advance();
  assert.ok(h.renders > before);
  api.dispose();
});

test('offscreen and background visibility stop rendering and resume safely', async () => {
  const h = harness();
  const api = h.mount();
  await settle();
  h.advance(); h.advance();
  const before = h.renders;
  h.observers[0].callback([{ isIntersecting: false, intersectionRatio: 0 }]);
  h.advance(5000);
  assert.equal(h.renders, before);
  h.observers[0].callback([{ isIntersecting: true, intersectionRatio: 1 }]);
  h.advance();
  assert.ok(h.renders > before);
  h.document.hidden = true;
  h.document.emit('visibilitychange');
  const hidden = h.renders;
  h.pointer('pointerdown'); h.advance(5000);
  assert.equal(h.renders, hidden);
  h.document.hidden = false;
  h.document.emit('visibilitychange'); h.advance();
  assert.ok(h.renders > hidden);
  api.dispose();
});

test('touch scrolling cancels hold gathering without capturing native scrolling', async () => {
  const h = harness();
  const api = h.mount({ holdToGather: true });
  await settle();
  h.advance(); h.advance();
  h.pointer('pointerdown', { pointerType: 'touch' });
  for (let i = 0; i < 20; i++) h.advance();
  assert.ok(h.view.gather[2] > 0);
  h.pointer('pointermove', { pointerType: 'touch', clientY: 320 });
  h.window.emit('scroll');
  h.advance();
  assert.equal(h.view.gather[2], 0);
  assert.ok(h.view.pointer[3] === 0);
  h.pointer('pointerup', { pointerType: 'touch' });
  h.advance();
  assert.equal(h.view.shock[3], 0);
  api.dispose();
});

test('dispose is idempotent and clears GPU, observers, listeners, and pending frames', async () => {
  const h = harness();
  const api = h.mount();
  await settle();
  h.advance();
  api.dispose(); api.dispose();
  assert.equal(await api.ready, false);
  assert.equal(h.disposed, 1);
  assert.equal(h.window.count + h.document.count + h.media.count, 0);
  assert.ok(h.observers.every(observer => observer.disconnected));
  assert.equal(h.raf.size, 0);
  assert.equal(h.root.dataset.ready, 'false');
  assert.equal(api.setOptions({ flow: 'ribbon' }), false);
});

test('disposing during asynchronous init safely destroys the late GPU', async () => {
  let resolveInit;
  const h = harness({ initOverride: () => new Promise(resolve => { resolveInit = resolve; }) });
  const api = h.mount();
  await settle();
  api.dispose();
  resolveInit(h.gpu);
  await settle();
  assert.equal(await api.ready, false);
  assert.equal(h.disposed, 1);
  assert.equal(h.renders, 0);
});

test('runtime frame failures clean up and invoke onError exactly once', async () => {
  const h = harness();
  let errors = 0;
  const api = h.mount({ onError() { errors++; } });
  await settle();
  h.fail(); h.advance();
  assert.equal(await api.ready, false);
  h.gpuError(new Error('second failure'));
  assert.equal(errors, 1);
  assert.equal(h.disposed, 1);
  assert.equal(h.window.count, 0);
  assert.equal(h.raf.size, 0);
});
