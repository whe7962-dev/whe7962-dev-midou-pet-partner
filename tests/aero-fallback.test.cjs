'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/aero-fallback.js'), 'utf8')
  .replace('export function mountFallback', 'function mountFallback');

function harness({width = 1200, reduced = false, paused = false, contextAvailable = true} = {}) {
  class Events {
    constructor() { this.events = new Map(); }
    addEventListener(type, callback, options) {
      if (!this.events.has(type)) this.events.set(type, []);
      this.events.get(type).push({callback, options});
    }
    removeEventListener(type, callback) {
      this.events.set(type, (this.events.get(type) || []).filter(entry => entry.callback !== callback));
    }
    emit(type, values = {}) {
      for (const {callback} of this.events.get(type) || []) callback({target: this, pointerId: 1, clientX: 600, clientY: 250, ...values});
    }
    listenerCount() { return [...this.events.values()].reduce((count, list) => count + list.length, 0); }
  }
  let now = 0, nextFrame = 0, renders = 0, fills = 0;
  const frames = new Map(), observers = [], coordinates = [];
  const context = {
    setTransform(...args) { context.lastTransform = args; renders++; coordinates.length = 0; },
    fillRect() {}, beginPath() {}, closePath() {}, stroke() {},
    moveTo(x, y) { coordinates.push([x, y]); }, lineTo(x, y) { coordinates.push([x, y]); },
    fill() { fills++; },
    createRadialGradient() { return {addColorStop() {}}; }
  };
  const canvas = {getContext() { return contextAvailable ? context : null; }};
  const stage = new Events(), root = new Events(), window = new Events(), document = new Events(), media = new Events();
  root.dataset = {};
  root.parentElement = stage;
  root.querySelector = selector => { assert.equal(selector, 'canvas.aero-shards__canvas'); return canvas; };
  root.getBoundingClientRect = () => ({width, height: 600, left: 0, top: 0});
  window.devicePixelRatio = 3;
  document.hidden = false;
  media.matches = reduced;
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  const sandbox = {
    console, window, document, matchMedia: () => media,
    performance: {now: () => now}, ResizeObserver: Observer, IntersectionObserver: Observer,
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nglobalThis.mount = mountFallback;`, sandbox);
  const errors = [];
  const instance = sandbox.mount(root, {paused, onError: error => errors.push(error)});
  const advance = (milliseconds = 34) => {
    now += milliseconds;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(now));
  };
  return {
    instance, root, stage, window, document, media, context, canvas, observers, frames, advance, errors,
    renders: () => renders, fills: () => fills, snapshot: () => JSON.stringify(coordinates),
    intersection(visible) { observers[1].callback([{isIntersecting: visible}]); },
    resize() { observers[0].callback(); },
    setNow(value) { now = value; }
  };
}

test('fallback draws pearl shards, caps resolution, and flags a successful frame', () => {
  const h = harness();
  assert.equal(h.root.dataset.ready, 'true');
  assert.equal(h.root.dataset.renderer, 'canvas2d');
  assert.equal(h.canvas.width, 1800);
  assert.equal(h.canvas.height, 900);
  assert.equal(h.context.lastTransform[0], 1.5);
  assert.ok(h.fills() >= 400 * 4, 'Desktop uses 400 four-facet shards.');
  const initial = h.snapshot();
  h.advance();
  assert.notEqual(h.snapshot(), initial);
  h.instance.dispose();
});

test('compact screens use a bounded 150-shard illustration', () => {
  const h = harness({width: 390});
  assert.ok(h.fills() >= 150 * 4 && h.fills() < 150 * 5);
  h.instance.dispose();
});

test('reduced motion renders once, ignores pointer reactions, and permits static flow changes', () => {
  const h = harness({reduced: true});
  assert.equal(h.frames.size, 0);
  const initial = h.snapshot();
  h.stage.emit('pointerdown'); h.stage.emit('pointermove'); h.window.emit('pointerup'); h.advance(300);
  assert.equal(h.renders(), 1);
  assert.equal(h.snapshot(), initial);
  h.instance.setOptions({flow: 'vortex'});
  assert.notEqual(h.snapshot(), initial);
  assert.equal(h.frames.size, 0);
  h.instance.dispose();
});

test('pause stops frames, and resume starts exactly one animation loop', () => {
  const h = harness();
  h.instance.setOptions({paused: true});
  assert.equal(h.frames.size, 0);
  const count = h.renders();
  h.advance(1000);
  assert.equal(h.renders(), count);
  h.instance.setOptions({paused: false});
  h.instance.setOptions({flow: 'ribbon'});
  assert.equal(h.frames.size, 1);
  h.advance();
  assert.equal(h.frames.size, 1);
  h.instance.dispose();
});

test('offscreen and background states cancel callbacks until visible', () => {
  const h = harness();
  h.intersection(false);
  assert.equal(h.frames.size, 0);
  h.intersection(true);
  assert.equal(h.frames.size, 1);
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.emit('visibilitychange');
  assert.equal(h.frames.size, 1);
  h.instance.dispose();
});

test('runtime reduced-motion changes stop and restart the animation safely', () => {
  const h = harness();
  h.media.matches = true; h.media.emit('change');
  assert.equal(h.frames.size, 0);
  h.media.matches = false; h.media.emit('change');
  assert.equal(h.frames.size, 1);
  h.instance.dispose();
});

test('animation drawing is capped near 30 fps', () => {
  const h = harness();
  h.advance(17);
  const count = h.renders();
  h.advance(17);
  assert.equal(h.renders(), count);
  h.advance(17);
  assert.equal(h.renders(), count + 1);
  h.instance.dispose();
});

test('pointer repulsion and click ripple are interactive, while HTML controls are excluded', () => {
  const a = harness(), b = harness();
  a.stage.emit('pointermove');
  a.advance(); b.advance();
  assert.notEqual(a.snapshot(), b.snapshot());
  a.instance.dispose(); b.instance.dispose();
  const c = harness(), d = harness();
  const control = {closest: () => ({tagName: 'BUTTON'})};
  c.stage.emit('pointerdown', {target: control});
  c.stage.emit('pointermove', {target: control});
  c.window.emit('pointerup', {target: control});
  c.advance(100); d.advance(100);
  assert.equal(c.snapshot(), d.snapshot());
  c.instance.dispose(); d.instance.dispose();
  const e = harness(), f = harness();
  e.stage.emit('pointerdown', {pointerType: 'touch'}); e.window.emit('pointerup', {pointerType: 'touch'});
  e.advance(100); f.advance(100);
  assert.notEqual(e.snapshot(), f.snapshot());
  e.instance.dispose(); f.instance.dispose();
});

test('hold gathers only after the deliberate delay', () => {
  const a = harness(), b = harness();
  a.stage.emit('pointerdown'); b.stage.emit('pointermove');
  a.advance(100); b.advance(100);
  assert.equal(a.snapshot(), b.snapshot(), 'A short press behaves like pointer repulsion.');
  a.advance(150); b.advance(150);
  assert.notEqual(a.snapshot(), b.snapshot(), 'The hold starts gathering after 230 ms.');
  a.instance.dispose(); b.instance.dispose();
});

test('touch movement and page scrolling cancel gathering without preventing scrolling', () => {
  for (const cancellation of ['move', 'scroll']) {
    const a = harness(), b = harness();
    a.stage.emit('pointerdown', {pointerType: 'touch'});
    if (cancellation === 'move') a.stage.emit('pointermove', {pointerType: 'touch', clientY: 270});
    else a.window.emit('scroll');
    a.advance(350); b.advance(350);
    assert.equal(a.snapshot(), b.snapshot());
    assert.ok(a.stage.events.get('pointerdown').every(event => event.options.passive));
    assert.ok(a.stage.events.get('pointermove').every(event => event.options.passive));
    a.instance.dispose(); b.instance.dispose();
  }
});

test('resizing redraws a paused frame and disposal releases all resources', () => {
  const h = harness({paused: true});
  const count = h.renders(); h.resize();
  assert.equal(h.renders(), count + 1);
  assert.equal(h.frames.size, 0);
  h.instance.dispose(); h.instance.dispose();
  assert.equal(h.root.dataset.ready, 'false');
  assert.ok(h.observers.every(observer => observer.disconnected));
  for (const target of [h.stage, h.window, h.document, h.media]) assert.equal(target.listenerCount(), 0);
  h.instance.setOptions({paused: false}); h.resize();
  assert.equal(h.frames.size, 0);
  assert.equal(h.renders(), count + 1);
});

test('missing canvas support fails gracefully with no animation or listeners', () => {
  const h = harness({contextAvailable: false});
  assert.equal(h.errors.length, 1);
  assert.equal(h.frames.size, 0);
  assert.equal(h.stage.listenerCount(), 0);
  h.instance.dispose();
});
