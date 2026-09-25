const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/cat-life.js'), 'utf8');

function harness({ reduced = false, heroTime = '4', backgroundSize = 'contain' } = {}) {
  class Element {
    constructor(name = '') {
      this.name = name; this.className = ''; this.dataset = {}; this.attributes = {}; this.children = [];
      this.listeners = new Map(); this.clientWidth = this.clientHeight = 400; this.offsetWidth = this.offsetHeight = 400;
      this.offsetLeft = 0; this.offsetTop = 0; this.complete = true; this.naturalWidth = this.naturalHeight = 1254;
      this.style = {
        setProperty(name, value) { this[name] = String(value); },
        getPropertyValue(name) { return this[name] || ''; },
        removeProperty(name) { delete this[name]; }
      };
      this.computed = { transform: 'none', transformOrigin: '50% 50%', objectFit: 'contain', objectPosition: '50% 50%', backgroundSize: 'contain', backgroundPosition: '50% 50%' };
      const change = (name, add) => { const names = new Set(this.className.split(' ').filter(Boolean)); if (add) names.add(name); else names.delete(name); this.className = [...names].join(' '); };
      this.classList = { add: name => change(name, true), remove: name => change(name, false), toggle: (name, value) => change(name, value), contains: name => this.className.split(' ').includes(name) };
    }
    append(...children) { this.children.push(...children); children.forEach(child => { child.parentElement = this; }); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
    get listenerCount() { return [...this.listeners.values()].reduce((sum, items) => sum + items.size, 0); }
  }
  const stage = new Element('stage'); stage.dataset = { motion: 'playing', heroTime };
  const subjects = ['hero', 'meet', 'belief', 'download'].map(name => new Element(name));
  subjects[0].className = 'cat-skin front'; subjects[0].computed.backgroundSize = backgroundSize;
  subjects.slice(1).forEach(image => new Element(`${image.name}-parent`).append(image));
  subjects[1].clientWidth = subjects[1].offsetWidth = 480;
  subjects[1].clientHeight = subjects[1].offsetHeight = 600;
  subjects[1].offsetLeft = 20;
  subjects[1].style.setProperty('--depth-y', '17px');
  subjects[2].computed.transform = 'matrix(0.9877, 0.1564, -0.1564, 0.9877, 0, 0)';
  const document = new Element('document'); document.hidden = false;
  document.getElementById = name => name === 'cinemaStage' ? stage : null;
  document.querySelectorAll = () => subjects;
  document.createElement = () => new Element('created');
  const media = new Element('media'); media.matches = reduced;
  const raf = new Map(); const images = []; const observers = []; let id = 0; let time = 100;
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  class Image { constructor() { images.push(this); } }
  const window = {};
  vm.runInNewContext(source, { window, document, Image, getComputedStyle: element => element.computed,
    matchMedia: () => media, IntersectionObserver: Observer, ResizeObserver: Observer, MutationObserver: Observer,
    requestAnimationFrame(fn) { const next = ++id; raf.set(next, fn); return next; }, cancelAnimationFrame(next) { raf.delete(next); }
  });
  const overlays = subjects.map((image, index) => index === 0 ? image.children[0] : image.parentElement.children[1]);
  return {
    stage, subjects, document, media, images, observers, window, raf, overlays,
    loadBlink() { images[0].onload(); },
    visible(indices = [0, 1, 2, 3], value = true) {
      observers[0].callback(indices.map(index => ({ target: index === 0 ? stage : subjects[index], isIntersecting: value })));
    },
    frame(ms = 20) { time += ms; const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach(fn => fn(time)); },
    advance(seconds) { for (let i = 0; i < seconds * 50; i++) this.frame(); },
    motion(value) { stage.dataset.motion = value; observers[2].callback(); }
  };
}

test('all four portraits retain their original DOM layout and get local eye-only overlays', () => {
  const h = harness();
  assert.equal(h.overlays.length, 4);
  assert.equal(h.images[0].src, 'assets/midou-blink.png');
  h.subjects.slice(1).forEach(image => {
    assert.equal(image.parentElement.children[0], image);
    assert.equal(image.classList.contains('cat-life-moving'), true);
  });
  assert.equal(h.overlays[1].style.left, '20px');
  assert.equal(h.overlays[1].style.width, '480px');
  assert.equal(h.overlays[1].style.height, '600px');
  const patch = h.overlays[1].children[0];
  assert.equal(patch.style.top, '60px');
  assert.equal(patch.style.width, '480px');
  assert.equal(patch.style.height, '480px');
  assert.equal(h.overlays[2].style.transform, h.subjects[2].computed.transform);
  assert.ok(h.overlays.every(overlay => overlay.attributes['aria-hidden'] === 'true' && overlay.dataset.blink === 'open'));
});

test('Hero patches match non-default 111% background scaling rather than assuming contain', () => {
  const h = harness({ backgroundSize: '111%' });
  const patch = h.overlays[0].children[0];
  assert.ok(Math.abs(parseFloat(patch.style.left) + 22) < .001);
  assert.ok(Math.abs(parseFloat(patch.style.top) + 22) < .001);
  assert.ok(Math.abs(parseFloat(patch.style.width) - 444) < .001);
  assert.ok(Math.abs(parseFloat(patch.style.height) - 444) < .001);
});

test('blinks are complete 290ms keyframes with irregular multi-second gaps, never a whole-face fade', () => {
  const h = harness(); h.loadBlink(); h.visible([0]); h.frame();
  const changes = []; let previous = 'open';
  for (let ms = 20; ms <= 24000; ms += 20) {
    h.frame(); const current = h.overlays[0].dataset.blink;
    if (current !== previous) { changes.push({ ms, state: current }); previous = current; }
  }
  const starts = changes.filter(change => change.state === 'closed');
  assert.ok(starts.length >= 3);
  for (let i = 0; i < changes.length - 1; i += 2) assert.ok(changes[i + 1].ms - changes[i].ms >= 280 && changes[i + 1].ms - changes[i].ms <= 320);
  const gaps = starts.slice(1).map((start, index) => start.ms - starts[index].ms);
  assert.ok(gaps.every(gap => gap >= 4700 && gap <= 8500));
  assert.ok(new Set(gaps).size > 1);
  assert.equal(h.subjects[0].style.opacity, undefined);
});

test('downstream movement is gentle, preserves transforms, and composes each image own parallax offset', () => {
  const h = harness(); h.visible([1, 2, 3]); h.frame(); h.advance(3);
  assert.equal(h.subjects[1].style.getPropertyValue('--depth-y'), '17px');
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-base-depth'), '17px');
  assert.equal(h.overlays[1].style.getPropertyValue('--cat-base-depth'), '17px');
  assert.equal(h.subjects[1].style.transform, undefined);
  assert.equal(h.overlays[2].style.transform, h.subjects[2].computed.transform);
  const x = parseFloat(h.subjects[1].style.getPropertyValue('--cat-drift-x'));
  const y = parseFloat(h.subjects[1].style.getPropertyValue('--cat-drift-y'));
  assert.ok(Math.abs(x) > .1 && Math.abs(x) <= 5);
  assert.ok(Math.abs(y) <= 6);
  assert.equal(h.subjects[3].style.getPropertyValue('--cat-base-depth'), '0px');
});

test('Hero blink clock starts automatically when its macro pullback settles', () => {
  const h = harness({ heroTime: '0' }); h.loadBlink(); h.visible([0]);
  assert.equal(h.raf.size, 0);
  h.stage.dataset.heroTime = '3'; h.stage.emit('hero-settled');
  assert.equal(h.raf.size, 1);
  h.frame(); h.advance(5.3);
  assert.equal(h.overlays[0].dataset.blink, 'closed');
});

test('Hero pause freezes all movement and opens eyes; resume needs no new pointer gesture', () => {
  const h = harness(); h.loadBlink(); h.visible(); h.frame(); h.advance(5.3);
  assert.equal(h.overlays[0].dataset.blink, 'closed');
  h.motion('paused');
  assert.equal(h.raf.size, 0);
  assert.ok(h.overlays.every(overlay => overlay.dataset.blink === 'open'));
  const before = h.subjects[1].style.getPropertyValue('--cat-drift-x');
  h.frame(20000);
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-drift-x'), before);
  h.motion('playing'); assert.equal(h.raf.size, 1);
  h.frame(10000);
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-drift-x'), before);
});

test('reduced motion is static and suppresses all blinks', () => {
  const h = harness({ reduced: true }); h.loadBlink(); h.visible(); h.advance(10);
  assert.equal(h.raf.size, 0);
  assert.ok(h.overlays.every(overlay => overlay.dataset.blink === 'open'));
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-drift-x'), '0.000px');
  h.media.matches = false; h.media.emit('change'); assert.equal(h.raf.size, 1);
  h.frame(); h.advance(2); h.media.matches = true; h.media.emit('change');
  assert.equal(h.raf.size, 0);
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-drift-y'), '0.000px');
});

test('offscreen and hidden tabs stop frames; missing blink images keep original eyes intact', () => {
  const h = harness(); h.images[0].onerror(); h.visible([1]); h.frame(); h.advance(9);
  assert.ok(h.overlays.every(overlay => overlay.dataset.blink === 'open'));
  h.visible([1], false); assert.equal(h.raf.size, 0);
  h.visible([1]); h.document.hidden = true; h.document.emit('visibilitychange'); assert.equal(h.raf.size, 0);
  h.document.hidden = false; h.document.emit('visibilitychange'); assert.equal(h.raf.size, 1);
});

test('disposal restores only owned properties and removes overlays, observers, and listeners', () => {
  const h = harness(); h.loadBlink(); h.visible(); h.frame(); h.advance(2);
  h.window.midouCatLife.dispose(); h.window.midouCatLife.dispose();
  assert.equal(h.raf.size, 0);
  assert.ok(h.observers.every(observer => observer.disconnected));
  assert.ok(h.overlays.every(overlay => overlay.parentElement === null));
  assert.equal(h.subjects[1].style.getPropertyValue('--depth-y'), '17px');
  assert.equal(h.subjects[1].style.getPropertyValue('--cat-drift-x'), '');
  assert.equal(h.subjects[1].classList.contains('cat-life-moving'), false);
  assert.equal(h.stage.listenerCount + h.document.listenerCount + h.media.listenerCount + h.subjects.reduce((sum, image) => sum + image.listenerCount, 0), 0);
});
