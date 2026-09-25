'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/hero-title.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../dist/hero-title.css'), 'utf8');

function harness({reduced = false, fine = true, motion = 'playing'} = {}) {
  class Events {
    constructor() { this.events = new Map(); }
    addEventListener(type, callback, options) {
      if (!this.events.has(type)) this.events.set(type, []);
      this.events.get(type).push({callback, options});
    }
    removeEventListener(type, callback) {
      this.events.set(type, (this.events.get(type) || []).filter(item => item.callback !== callback));
    }
    emit(type, event = {}) { for (const {callback} of this.events.get(type) || []) callback(event); }
    count() { return [...this.events.values()].reduce((sum, items) => sum + items.length, 0); }
  }
  let geometryReads = 0;
  class Base extends Events {
    constructor() { super(); this.parentNode = null; }
    get parentElement() { return this.parentNode; }
    replaceWith(fragment) {
      const parent = this.parentNode, index = parent.children.indexOf(this);
      const replacement = fragment.fragment ? [...fragment.children] : [fragment];
      parent.children.splice(index, 1, ...replacement);
      replacement.forEach(child => child.parentNode = parent);
      this.parentNode = null;
    }
    remove() {
      if (!this.parentNode) return;
      const parent = this.parentNode;
      parent.children.splice(parent.children.indexOf(this), 1); this.parentNode = null;
    }
  }
  class Text extends Base {
    constructor(text) { super(); this.nodeType = 3; this.textContent = text; }
  }
  class Element extends Base {
    constructor(tag = 'div') {
      super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.children = [];
      this.dataset = {}; this.attributes = {}; this.className = '';
      this.style = {setProperty(name, value) { this[name] = value; }};
    }
    append(...nodes) {
      nodes.forEach(node => { this.children.push(node); node.parentNode = this; });
    }
    insertBefore(node, before) {
      this.children.splice(this.children.indexOf(before), 0, node); node.parentNode = this;
    }
    get textContent() { return this.children.map(node => node.textContent).join(''); }
    set textContent(value) { this.children = []; this.append(new Text(value)); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    closest(selector) {
      for (let element = this; element; element = element.parentElement) {
        if (element.className?.split(' ').includes(selector.slice(1))) return element;
      }
      return null;
    }
    getBoundingClientRect() {
      geometryReads++;
      const index = shells().indexOf(this);
      return {left: 100 + (index % 5) * 65, top: index < 5 ? 100 : 200, width: 65, height: 90};
    }
  }
  const surface = new Element('section'); surface.className = 'hero-product';
  const title = new Element('h1'), serif = new Element('span'), br = new Element('br');
  serif.className = 'serif'; serif.append(new Text('有宠拍档。'));
  title.append(new Text('科学养宠，'), br, serif); surface.append(title);
  const stage = new Element(); stage.dataset.motion = motion;
  const document = new Events(), window = new Events(), reducedMedia = new Events(), fineMedia = new Events();
  document.hidden = false; reducedMedia.matches = reduced; fineMedia.matches = fine;
  document.getElementById = id => ({heroTitle: title, cinemaStage: stage})[id] || null;
  document.createElement = tag => new Element(tag);
  document.createDocumentFragment = () => { const fragment = new Element(); fragment.fragment = true; return fragment; };
  function descendants(element) { return element.children.flatMap(child => [child, ...(child.children ? descendants(child) : [])]); }
  const shells = () => descendants(title).filter(node => node.className === 'letter-shell');
  const glyphs = () => descendants(title).filter(node => node.className === 'title-letter');
  document.createTreeWalker = root => {
    const textNodes = descendants(root).filter(node => node.nodeType === 3); let index = 0;
    return {nextNode() { return textNodes[index++] || null; }};
  };
  const intersection = [], resize = [], mutation = [];
  function Observer(list) {
    return class {
      constructor(callback) { this.callback = callback; list.push(this); }
      observe(target, options) { this.target = target; this.options = options; }
      disconnect() { this.disconnected = true; }
    };
  }
  const frames = new Map(); let now = 0, id = 0;
  const sandbox = {
    document, window, NodeFilter: {SHOW_TEXT: 4}, console,
    matchMedia: query => query.includes('reduced') ? reducedMedia : fineMedia,
    IntersectionObserver: Observer(intersection), ResizeObserver: Observer(resize), MutationObserver: Observer(mutation),
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(key) { frames.delete(key); }
  };
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  const advance = (milliseconds = 16) => {
    now += milliseconds;
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
  };
  const run = (milliseconds = 2000) => { for (let i = 0; i < Math.ceil(milliseconds / 16); i++) advance(); };
  const setMotion = value => { stage.dataset.motion = value; mutation[0].callback([{attributeName: 'data-motion'}]); };
  return {
    title, surface, serif, br, stage, document, window, reducedMedia, fineMedia, frames, glyphs, shells,
    intersection, resize, mutation, advance, run, setMotion, geometryReads: () => geometryReads,
    pointer(x = 132.5, y = 145, type = 'mouse') { surface.emit('pointermove', {clientX: x, clientY: y, pointerType: type}); },
    dispose() { window.emit('pagehide', {persisted: false}); }
  };
}

test('enhancement preserves the exact heading, serif wrapper, break, and accessible full phrase', () => {
  const h = harness();
  assert.equal(h.title.textContent, '科学养宠，有宠拍档。');
  assert.equal(h.title.getAttribute('aria-label'), '科学养宠，有宠拍档。');
  assert.equal(h.br.parentNode, h.title);
  assert.equal(h.serif.parentNode, h.title);
  assert.equal(h.glyphs().length, 10);
  assert.ok(h.shells().every(shell => shell.getAttribute('aria-hidden') === 'true'));
  assert.ok(h.glyphs().every(glyph => glyph.className === 'title-letter'));
  h.dispose();
});

test('Chinese entrance is staggered and punctuation separates the two short phrases', () => {
  const h = harness(); h.advance(); h.run(240);
  const ys = h.glyphs().map(glyph => Number.parseFloat(glyph.style['--title-y']));
  assert.ok(ys[0] < ys[1] && ys[1] < ys[4]);
  assert.equal(ys[5], 8, 'Second phrase waits while the first phrase enters.');
  assert.ok(ys.every(y => y >= 0 && y <= 8));
  h.dispose();
});

test('settled breathing is at most 2.25 px and the restrained light affects only the second phrase', () => {
  const h = harness(); h.run(1800);
  let lit = false;
  for (let i = 0; i < 220; i++) {
    h.advance();
    h.glyphs().forEach((glyph, index) => {
      const y = Number.parseFloat(glyph.style['--title-y']), glow = Number(glyph.style['--title-glow']);
      assert.ok(y <= 0 && y >= -2.25);
      assert.ok(glow >= 0 && glow <= .38);
      if (index < 5) assert.equal(glow, 0);
      else if (glow > .1) lit = true;
    });
  }
  assert.equal(lit, true);
  h.dispose();
});

test('fine pointer response is bounded, measures once, and springs back after leaving', () => {
  const h = harness(); h.run(); h.pointer(); h.run(1000);
  assert.equal(h.geometryReads(), 10);
  const first = h.glyphs()[0];
  assert.ok(Number.parseFloat(first.style['--title-pointer-lift']) < -3.9);
  h.glyphs().forEach(glyph => {
    const lift = Number.parseFloat(glyph.style['--title-pointer-lift']);
    assert.ok(lift >= -4 && lift <= 0);
    assert.ok(Number.parseFloat(glyph.style['--title-y']) >= -4, 'Combined breathing and hover lift stays within 4 px.');
    assert.ok(Math.abs(Number.parseFloat(glyph.style['--title-turn'])) <= .8);
  });
  h.pointer(139, 149); h.run(300);
  assert.equal(h.geometryReads(), 10, 'No layout reads on normal animation frames.');
  h.surface.emit('pointerleave'); h.run(1000);
  assert.ok(Math.abs(Number.parseFloat(first.style['--title-pointer-lift'])) < .001);
  h.resize[0].callback(); h.pointer(); h.advance();
  assert.equal(h.geometryReads(), 20, 'Resize invalidates cached geometry once.');
  h.dispose();
});

test('touch and coarse pointers do not force hover or block native scrolling', () => {
  for (const options of [{fine: false}, {fine: true}]) {
    const h = harness(options); h.run(); h.pointer(132.5, 145, 'touch'); h.run(300);
    assert.ok(h.glyphs().every(glyph => Number(glyph.style['--title-pointer-lift'].replace('px', '')) === 0));
    assert.equal(h.geometryReads(), 0);
    assert.equal(h.surface.events.get('pointermove')[0].options.passive, true);
    h.dispose();
  }
});

test('all non-playing cinema states are static and resumption has one frame loop', () => {
  const h = harness(); h.run();
  for (const state of ['paused', 'reduced', 'error', 'loading', 'disposed']) {
    h.setMotion(state);
    assert.equal(h.frames.size, 0);
    assert.equal(h.title.dataset.titleMotion, 'static');
    assert.ok(h.glyphs().every(glyph => glyph.style['--title-y'] === '0px'));
    h.setMotion('playing');
    assert.equal(h.frames.size, 1);
  }
  h.dispose();
});

test('reduced motion is fully static from first paint and preference changes safely restart', () => {
  const h = harness({reduced: true});
  assert.equal(h.frames.size, 0);
  assert.ok(h.glyphs().every(glyph => glyph.style['--title-y'] === '0px'));
  h.pointer(); h.run(); assert.equal(h.geometryReads(), 0);
  h.reducedMedia.matches = false; h.reducedMedia.emit('change');
  assert.equal(h.frames.size, 1);
  h.run(200);
  h.reducedMedia.matches = true; h.reducedMedia.emit('change');
  assert.equal(h.frames.size, 0);
  assert.ok(h.glyphs().every(glyph => glyph.style['--title-glow'] === '0'));
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /opacity:1/);
  h.dispose();
});

test('hidden and offscreen title stops all frame callbacks until visible again', () => {
  const h = harness();
  h.intersection[0].callback([{isIntersecting: false}]);
  assert.equal(h.frames.size, 0);
  h.intersection[0].callback([{isIntersecting: true}]);
  assert.equal(h.frames.size, 1);
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.emit('visibilitychange');
  assert.equal(h.frames.size, 1);
  h.dispose();
});

test('bfcache pauses and restores; final disposal restores original DOM and clears resources', () => {
  const h = harness();
  h.window.emit('pagehide', {persisted: true}); assert.equal(h.frames.size, 0);
  h.window.emit('pageshow'); assert.equal(h.frames.size, 1);
  h.dispose();
  assert.equal(h.frames.size, 0);
  assert.equal(h.title.textContent, '科学养宠，有宠拍档。');
  assert.equal(h.title.getAttribute('aria-label'), null);
  assert.equal(h.title.dataset.titleEnhanced, undefined);
  assert.equal(h.glyphs().length, 0);
  assert.equal(h.br.parentNode, h.title);
  assert.equal(h.serif.parentNode, h.title);
  assert.ok([...h.intersection, ...h.resize, ...h.mutation].every(observer => observer.disconnected));
  for (const target of [h.surface, h.window, h.document, h.reducedMedia, h.fineMedia]) assert.equal(target.count(), 0);
});
