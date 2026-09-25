'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/interaction-sound.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({supported = true, failCreate = false, failResume = false, suspended = false} = {}) {
  class Events {
    constructor() { this.events = new Map(); }
    addEventListener(type, callback) {
      if (!this.events.has(type)) this.events.set(type, []);
      this.events.get(type).push(callback);
    }
    removeEventListener(type, callback) {
      this.events.set(type, (this.events.get(type) || []).filter(item => item !== callback));
    }
    emit(type, event = {}) { for (const callback of this.events.get(type) || []) callback(event); }
    count() { return [...this.events.values()].reduce((sum, items) => sum + items.length, 0); }
  }
  const window = new Events(), document = new Events();
  const toggle = {attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }};
  document.hidden = false;
  document.hasFocus = () => true;
  document.getElementById = id => id === 'soundToggle' ? toggle : null;
  let now = 1000;
  const contexts = [], nodes = [];
  function param() {
    return {
      values: [],
      setValueAtTime(value, time) { this.values.push({kind: 'set', value, time}); },
      linearRampToValueAtTime(value, time) { this.values.push({kind: 'linear', value, time}); },
      exponentialRampToValueAtTime(value, time) { this.values.push({kind: 'exponential', value, time}); },
      cancelScheduledValues() { this.cancelled = true; }
    };
  }
  class Node {
    constructor(kind) { this.kind = kind; this.frequency = param(); this.gain = param(); nodes.push(this); }
    connect(target) { this.connectedTo = target; }
    disconnect() { this.disconnected = true; }
    start(time) { this.startAt = time; }
    stop(time) { this.stopAt = time; this.stopCalls = (this.stopCalls || 0) + 1; }
  }
  class AudioContext {
    constructor(options) {
      if (failCreate) throw new Error('Device unavailable');
      this.options = options; this.state = suspended ? 'suspended' : 'running';
      this.currentTime = 5; this.destination = {}; contexts.push(this);
    }
    createOscillator() { return new Node('oscillator'); }
    createGain() { return new Node('gain'); }
    resume() { this.resumeCalls = (this.resumeCalls || 0) + 1; if (failResume) return Promise.reject(new Error('Resume denied')); this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; this.closed = true; return Promise.resolve(); }
  }
  if (supported) window.AudioContext = AudioContext;
  const sandbox = {window, document, performance: {now: () => now}, console};
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  const target = (...selectors) => ({closest: selector => selector.split(',').some(part => selectors.includes(part)) ? {} : null});
  const click = (selectors, extra = {}) => document.emit('click', {target: target(...selectors), isTrusted: true, ...extra});
  const oscillators = () => nodes.filter(node => node.kind === 'oscillator');
  const advance = (milliseconds = 100) => { now += milliseconds; };
  return {window, document, toggle, contexts, nodes, click, target, advance, oscillators};
}

test('default is silent and AudioContext is created only by explicit opt-in', () => {
  const h = harness();
  assert.equal(h.toggle.textContent, '音效：关');
  assert.equal(h.toggle.attributes['aria-pressed'], 'false');
  assert.equal(h.contexts.length, 0);
  h.click(['.ability-tab']); h.click(['#shardStage']);
  assert.equal(h.contexts.length, 0);
  h.click(['#soundToggle'], {isTrusted: false});
  assert.equal(h.contexts.length, 0);
  h.click(['#soundToggle']);
  assert.equal(h.contexts.length, 1);
  assert.equal(h.toggle.textContent, '音效：开');
  assert.equal(h.toggle.attributes['aria-pressed'], 'true');
  assert.equal(h.oscillators().length, 2);
});

test('all synthesized notes are short, sine-based, low-volume, and self-releasing', () => {
  const h = harness(); h.click(['#soundToggle']);
  for (const oscillator of h.oscillators()) {
    assert.equal(oscillator.type, 'sine');
    assert.ok(oscillator.stopAt - oscillator.startAt <= .18);
    const gain = oscillator.connectedTo;
    assert.ok(gain.gain.values.every(value => value.value <= .018));
    oscillator.onended();
    assert.equal(oscillator.disconnected, true);
    assert.equal(gain.disconnected, true);
  }
});

test('only key controls and non-control shard clicks sound; keyboard clicks also work', () => {
  const h = harness(); h.click(['#soundToggle']);
  let count = h.oscillators().length;
  for (const selector of ['.ability-tab', '[data-shard-flow]', '.hotspot', '.download-trigger', '#shardStage']) {
    h.advance(); h.click([selector], {detail: 0});
    assert.ok(h.oscillators().length > count);
    count = h.oscillators().length;
  }
  h.advance(); h.click(['#shardStage', 'button']);
  h.click(['a']); h.click(['.unrelated']);
  assert.equal(h.oscillators().length, count);
});

test('hover, pointer, scroll, scripted autoplay, and cancelled clicks stay silent', () => {
  const h = harness(); h.click(['#soundToggle']);
  const count = h.oscillators().length;
  h.advance();
  for (const event of ['pointermove', 'pointerdown', 'pointerup', 'mouseover', 'scroll']) h.document.emit(event, {target: h.target('.ability-tab')});
  h.click(['.ability-tab'], {isTrusted: false});
  h.click(['.ability-tab'], {defaultPrevented: true});
  assert.equal(h.oscillators().length, count);
});

test('90 ms throttle prevents dense click sounds', () => {
  const h = harness(); h.click(['#soundToggle']);
  const count = h.oscillators().length;
  h.advance(89); h.click(['.ability-tab']);
  assert.equal(h.oscillators().length, count);
  h.advance(1); h.click(['.ability-tab']);
  assert.equal(h.oscillators().length, count + 1);
});

test('muting stops and disconnects active notes and makes no closing sound', () => {
  const h = harness(); h.click(['#soundToggle']);
  const count = h.oscillators().length;
  h.click(['#soundToggle']);
  assert.equal(h.toggle.textContent, '音效：关');
  assert.equal(h.oscillators().length, count);
  assert.ok(h.nodes.every(node => node.disconnected));
  h.advance(); h.click(['.download-trigger']);
  assert.equal(h.oscillators().length, count);
});

test('blur and background immediately silence audio; focus does not play automatically', async () => {
  const h = harness(); h.click(['#soundToggle']);
  h.window.emit('blur');
  assert.ok(h.nodes.every(node => node.disconnected));
  const count = h.oscillators().length;
  h.advance(); h.click(['.ability-tab']);
  assert.equal(h.oscillators().length, count);
  h.window.emit('focus');
  assert.equal(h.oscillators().length, count);
  h.document.hidden = true; h.document.emit('visibilitychange');
  h.advance(); h.click(['.ability-tab']);
  assert.equal(h.oscillators().length, count);
  h.document.hidden = false; h.document.emit('visibilitychange');
  h.advance(); h.click(['.ability-tab']);
  await settle();
  assert.equal(h.oscillators().length, count + 1);
});

test('pending resume cannot sound after mute or background transition', async () => {
  for (const transition of ['mute', 'hidden']) {
    const h = harness({suspended: true});
    h.click(['#soundToggle']);
    if (transition === 'mute') h.click(['#soundToggle']);
    else { h.document.hidden = true; h.document.emit('visibilitychange'); }
    await settle();
    assert.equal(h.oscillators().length, 0);
  }
});

test('WebAudio absence or context failure degrades to a disabled, explained toggle', async () => {
  for (const options of [{supported: false}, {failCreate: true}, {suspended: true, failResume: true}]) {
    const h = harness(options); h.click(['#soundToggle']); await settle();
    assert.equal(h.toggle.disabled, true);
    assert.equal(h.toggle.textContent, '音效：不支持');
    assert.equal(h.toggle.attributes['aria-pressed'], 'false');
    assert.equal(h.oscillators().length, 0);
  }
});

test('page exit removes listeners, releases nodes, and closes the context', () => {
  const h = harness(); h.click(['#soundToggle']);
  h.window.emit('pagehide', {persisted: false});
  assert.equal(h.contexts[0].closed, true);
  assert.ok(h.nodes.every(node => node.disconnected));
  assert.equal(h.window.count(), 0);
  assert.equal(h.document.count(), 0);
});

test('bfcache pagehide quiets but preserves later gesture-only playback', async () => {
  const h = harness(); h.click(['#soundToggle']);
  h.window.emit('pagehide', {persisted: true});
  assert.notEqual(h.contexts[0].closed, true);
  const count = h.oscillators().length;
  h.advance(); h.click(['.ability-tab']); await settle();
  assert.equal(h.oscillators().length, count + 1);
});
