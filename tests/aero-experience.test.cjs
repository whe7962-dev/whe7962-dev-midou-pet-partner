'use strict';

// Controller tests only: renderer imports are injected in memory, not bundled or
// executed. Browser rendering, shader correctness and touch geometry need UI QA.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/aero-experience.js'), 'utf8');
const script = source.replace(/\bimport\(/g, '__import(');
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};

function harness({gpu = true, secure = true, reduced = false, compact = false,
  gpuImportError = false, gpuMountError = false, fallbackImportError = false,
  fallbackMountError = false, importGate = null} = {}) {
  class Element {
    constructor() {
      this.dataset = {};
      this.attributes = {};
      this.listeners = new Map();
      this.disabled = false;
      this.hidden = false;
      this.textContent = '';
    }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatch(type, properties = {}) {
      for (const listener of [...(this.listeners.get(type) || [])]) {
        listener({type, target: this, ...properties});
      }
    }
    click() { if (!this.disabled) this.dispatch('click'); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
  }
  const ids = Object.fromEntries(['shardField', 'shardStage', 'shardPause', 'shardStatus',
    'shardInstructions'].map(id => [id, new Element()]));
  const root = ids.shardField;
  root.dataset.ready = 'false';
  const canvasChanges = [];
  function makeCanvas() {
    const canvas = new Element();
    canvas.cloneNode = deep => { assert.equal(deep, false); return makeCanvas(); };
    canvas.replaceWith = replacement => {
      canvasChanges.push({from: canvas, to: replacement});
      root.canvas = replacement;
    };
    return canvas;
  }
  root.canvas = makeCanvas();
  root.querySelector = selector => { assert.equal(selector, 'canvas'); return root.canvas; };
  const flows = ['stream', 'vortex', 'ribbon'].map(flow => {
    const button = new Element(); button.dataset.shardFlow = flow; return button;
  });
  const media = {reduced: new Element(), compact: new Element()};
  media.reduced.matches = reduced;
  media.compact.matches = compact;
  function setMedia(name, matches) {
    media[name].matches = matches;
    media[name].dispatch('change', {matches});
  }
  const window = new Element();
  window.isSecureContext = secure;
  const observers = [];
  class IntersectionObserver {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    intersect(isIntersecting = true) { this.callback([{target: this.target, isIntersecting}]); }
  }
  const imports = [], gpuRenderers = [], fallbackRenderers = [];
  function renderer(options) {
    return {
      options: {...options}, changes: [], disposed: 0,
      setOptions(partial) { this.options = {...this.options, ...partial}; this.changes.push(partial); },
      dispose() { this.disposed++; }
    };
  }
  async function importStub(specifier) {
    imports.push(specifier);
    if (importGate) await importGate.promise;
    if (specifier === './aero-shards.js') {
      if (gpuImportError) throw new Error('GPU import failed');
      return {mountAeroShards(element, options) {
        assert.equal(element, root);
        if (gpuMountError) throw new Error('GPU mount failed');
        const instance = renderer(options);
        const gate = deferred();
        instance.ready = gate.promise;
        instance.present = success => {
          root.dataset.ready = String(success);
          gate.resolve(success);
        };
        instance.rejectReady = gate.reject;
        gpuRenderers.push(instance);
        return instance;
      }};
    }
    assert.equal(specifier, './aero-fallback.js');
    if (fallbackImportError) throw new Error('Canvas import failed');
    return {mountFallback(element, options) {
      assert.equal(element, root);
      if (fallbackMountError) throw new Error('Canvas mount failed');
      const instance = renderer(options);
      root.dataset.ready = 'true';
      root.dataset.renderer = 'canvas2d';
      fallbackRenderers.push(instance);
      return instance;
    }};
  }
  vm.runInNewContext(script, {
    document: {
      getElementById: id => { assert.ok(ids[id], id); return ids[id]; },
      querySelectorAll: selector => { assert.equal(selector, '[data-shard-flow]'); return flows; }
    },
    window, navigator: {gpu: gpu ? {} : undefined}, IntersectionObserver,
    matchMedia: query => {
      if (query === '(prefers-reduced-motion: reduce)') return media.reduced;
      assert.equal(query, '(max-width: 800px)'); return media.compact;
    },
    __import: importStub
  }, {filename: 'aero-experience.js'});
  return {ids, root, flows, media, setMedia, window, observers, imports, gpuRenderers,
    fallbackRenderers, canvasChanges, async enter() { observers[0].intersect(); await flush(); }};
}

test('lazy loading runs once and GPU controls wait for the first presented frame', async () => {
  const h = harness();
  assert.deepEqual(h.imports, []);
  assert.equal(h.observers[0].target, h.ids.shardStage);
  assert.equal(h.observers[0].options.rootMargin, '220px');
  assert.equal(h.ids.shardPause.disabled, true);
  assert.equal(h.ids.shardInstructions.hidden, true);
  assert.equal(h.ids.shardStatus.textContent, '感知 · 理解 · 陪伴');
  h.observers[0].intersect(false);
  await flush();
  assert.deepEqual(h.imports, []);
  await h.enter();
  await h.enter();
  assert.deepEqual(h.imports, ['./aero-shards.js']);
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.ids.shardPause.disabled, true);
  assert.equal(h.ids.shardInstructions.hidden, true);
  h.ids.shardPause.click();
  assert.equal(h.gpuRenderers[0].options.paused, false);
  h.gpuRenderers[0].present(true);
  await flush();
  assert.equal(h.ids.shardPause.disabled, false);
  assert.equal(h.ids.shardPause.textContent, '暂停动态');
  assert.equal(h.ids.shardInstructions.hidden, false);
  assert.equal(h.ids.shardStatus.textContent, '流动 · 珍珠微光');
});

for (const config of [{gpu: false}, {secure: false}]) {
  test(`missing secure WebGPU uses a fresh 2D canvas: ${JSON.stringify(config)}`, async () => {
    const h = harness(config);
    const previous = h.root.canvas;
    await h.enter();
    assert.deepEqual(h.imports, ['./aero-fallback.js']);
    assert.equal(h.canvasChanges.length, 1);
    assert.notEqual(h.root.canvas, previous);
    assert.equal(h.ids.shardPause.disabled, false);
    assert.equal(h.ids.shardStatus.textContent, '流动 · 轻量互动');
  });
}

test('unsuccessful GPU first frame disposes GPU and falls back', async () => {
  const h = harness();
  await h.enter();
  h.gpuRenderers[0].present(false);
  await flush();
  assert.deepEqual(h.imports, ['./aero-shards.js', './aero-fallback.js']);
  assert.equal(h.gpuRenderers[0].disposed, 1);
  assert.equal(h.fallbackRenderers.length, 1);
  assert.equal(h.ids.shardStatus.textContent, '流动 · 轻量互动');
});

for (const failure of ['import', 'mount', 'ready']) {
  test(`GPU ${failure} failure falls back without leaving controls loading`, async () => {
    const h = harness({gpuImportError: failure === 'import', gpuMountError: failure === 'mount'});
    await h.enter();
    if (failure === 'ready') {
      h.gpuRenderers[0].rejectReady(new Error('Device unavailable'));
      await flush();
    }
    assert.equal(h.fallbackRenderers.length, 1);
    assert.equal(h.ids.shardPause.disabled, false);
    assert.equal(h.ids.shardStatus.textContent, '流动 · 轻量互动');
  });
}

test('GPU runtime error wins over a late ready result and only mounts fallback once', async () => {
  const h = harness();
  await h.enter();
  const gpu = h.gpuRenderers[0];
  await gpu.options.onError(new Error('Device lost'));
  gpu.present(true);
  await flush();
  await gpu.options.onError(new Error('Repeated device failure'));
  assert.equal(gpu.disposed, 1);
  assert.equal(h.fallbackRenderers.length, 1);
  assert.equal(h.ids.shardStatus.textContent, '流动 · 轻量互动');
});

test('flow selection can initiate loading and preserves selection until ready', async () => {
  const h = harness();
  h.flows[2].click();
  await flush();
  assert.deepEqual(h.imports, ['./aero-shards.js']);
  assert.equal(h.gpuRenderers[0].options.flow, 'ribbon');
  assert.deepEqual(h.flows.map(button => button.getAttribute('aria-pressed')), ['false', 'false', 'true']);
  h.flows[1].click();
  assert.equal(h.gpuRenderers[0].options.flow, 'vortex');
  h.gpuRenderers[0].present(true);
  await flush();
  assert.equal(h.ids.shardStatus.textContent, '环绕 · 珍珠微光');
});

test('pause, flow and reduced-motion changes preserve user pause intent', async () => {
  const h = harness({gpu: false});
  await h.enter();
  const renderer = h.fallbackRenderers[0];
  h.ids.shardPause.click();
  assert.equal(renderer.options.paused, true);
  assert.equal(h.ids.shardPause.getAttribute('aria-pressed'), 'true');
  assert.equal(h.ids.shardInstructions.hidden, true);
  h.flows[1].click();
  assert.equal(renderer.options.flow, 'vortex');
  assert.equal(renderer.options.paused, true);
  assert.equal(h.ids.shardStatus.textContent, '环绕 · 已暂停');
  h.setMedia('reduced', true);
  assert.equal(h.ids.shardPause.disabled, true);
  assert.equal(h.ids.shardPause.textContent, '已减少动态');
  h.setMedia('reduced', false);
  assert.equal(renderer.options.paused, true);
  assert.equal(h.ids.shardPause.textContent, '继续动态');
  h.ids.shardPause.click();
  assert.equal(renderer.options.paused, false);
  assert.equal(h.ids.shardInstructions.hidden, false);
  assert.equal(h.ids.shardStatus.textContent, '环绕 · 轻量互动');
});

test('initial reduced-motion preference mounts paused and keeps interaction hints hidden', async () => {
  const h = harness({reduced: true});
  await h.enter();
  assert.equal(h.gpuRenderers[0].options.paused, true);
  h.gpuRenderers[0].present(true);
  await flush();
  assert.equal(h.ids.shardPause.disabled, true);
  assert.equal(h.ids.shardPause.getAttribute('aria-pressed'), 'true');
  assert.equal(h.ids.shardInstructions.hidden, true);
  assert.equal(h.ids.shardStatus.textContent, '已遵循减少动态偏好');
  h.setMedia('reduced', false);
  assert.equal(h.gpuRenderers[0].options.paused, false);
  assert.equal(h.ids.shardPause.disabled, false);
});

for (const compact of [false, true]) {
  test(`${compact ? 'mobile' : 'desktop'} density follows viewport changes`, async () => {
    const h = harness({gpu: false, compact});
    await h.enter();
    const renderer = h.fallbackRenderers[0];
    assert.equal(renderer.options.density, compact ? .6 : .85);
    h.setMedia('compact', !compact);
    assert.equal(renderer.options.density, compact ? .85 : .6);
  });
}

test('2D failure after option changes still enters honest static error state', async () => {
  const h = harness({gpu: false});
  await h.enter();
  const renderer = h.fallbackRenderers[0];
  const initialErrorHandler = renderer.options.onError;
  h.flows[2].click();
  h.ids.shardPause.click();
  h.setMedia('compact', true);
  assert.equal(renderer.options.onError, initialErrorHandler);
  renderer.options.onError(new Error('2D rendering failed'));
  assert.equal(h.root.dataset.ready, 'false');
  assert.equal(h.ids.shardPause.disabled, true);
  assert.equal(h.ids.shardPause.textContent, '静态呈现');
  assert.equal(h.ids.shardStatus.textContent, '静态概念展示');
  assert.equal(h.ids.shardInstructions.hidden, true);
  assert.equal(h.fallbackRenderers.length, 1);
});

for (const failure of ['import', 'mount']) {
  test(`2D ${failure} failure retains static state`, async () => {
    const h = harness({gpu: false, fallbackImportError: failure === 'import', fallbackMountError: failure === 'mount'});
    await h.enter();
    assert.equal(h.root.dataset.ready, 'false');
    assert.equal(h.ids.shardPause.disabled, true);
    assert.equal(h.ids.shardStatus.textContent, '静态概念展示');
    assert.equal(h.ids.shardInstructions.hidden, true);
  });
}

test('pagehide keeps bfcache state but disposes resources on final navigation', async () => {
  const h = harness({gpu: false});
  await h.enter();
  const renderer = h.fallbackRenderers[0];
  h.window.dispatch('pagehide', {persisted: true});
  assert.equal(renderer.disposed, 0);
  assert.equal(h.media.reduced.listeners.get('change').size, 1);
  h.window.dispatch('pagehide', {persisted: false});
  assert.equal(renderer.disposed, 1);
  assert.equal(h.media.reduced.listeners.get('change').size, 0);
  assert.equal(h.media.compact.listeners.get('change').size, 0);
});

test('a deferred import cannot mount a renderer after navigation disposes the controller', async () => {
  const gate = deferred();
  const h = harness({importGate: gate});
  await h.enter();
  h.window.dispatch('pagehide', {persisted: false});
  gate.resolve();
  await flush();
  assert.equal(h.gpuRenderers.length, 0);
  assert.equal(h.fallbackRenderers.length, 0);
});
