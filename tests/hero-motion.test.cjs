const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../dist/hero-motion.js'), 'utf8');

function harness({ width = 900, height = 700, actorSize = 470, reduced = false, fine = true } = {}) {
  const all = [];
  class Element {
    constructor() {
      this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = new Map();
      this.style = {}; this.hidden = false; this.disabled = false; this.textContent = '';
      this.offsetWidth = actorSize; this.className = '';
      this.classList = { toggle: (name, value) => {
        const names = new Set(this.className.split(' ').filter(Boolean));
        if (value) names.add(name); else names.delete(name);
        this.className = [...names].join(' ');
      } };
      all.push(this);
    }
    append(...children) { this.children.push(...children); children.forEach(child => { child.parent = this; }); }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
      this.parent = null;
    }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    getBoundingClientRect() { return { left: 100, top: 80, width, height }; }
    addEventListener(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
    }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name, props = {}) { for (const fn of this.listeners.get(name) || []) fn(props); }
    dispatchEvent(event) { this.emit(event.type, event); }
    get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
  }
  const ids = Object.fromEntries(['cinemaStage', 'stageCamera', 'actors', 'filmLoading', 'heroMotionToggle']
    .map(id => [id, new Element()]));
  const document = new Element();
  document.hidden = false;
  document.getElementById = id => ids[id] || null;
  document.createElement = () => new Element();
  const reduceMedia = new Element(); reduceMedia.matches = reduced;
  const fineMedia = new Element(); fineMedia.matches = fine;
  const images = [];
  class Image { constructor() { images.push(this); } }
  const raf = new Map(); const timers = new Map(); const observers = [];
  let sequence = 0; let time = 100;
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const window = {
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(script, {
    document, window, Image, Event: class { constructor(type) { this.type = type; } }, IntersectionObserver: Observer, ResizeObserver: Observer,
    matchMedia: query => query.includes('reduced-motion') ? reduceMedia : fineMedia,
    requestAnimationFrame(fn) { const id = ++sequence; raf.set(id, fn); return id; },
    cancelAnimationFrame(id) { raf.delete(id); }
  });
  return {
    ids, document, reduceMedia, fineMedia, images, raf, timers, observers, window, all,
    get actor() { return ids.actors.children[0]; },
    get body() { return ids.actors.children[0].children[1]; },
    load() { images[0].onload(); },
    fail() { images[0].onerror(); },
    frame(ms = 20) {
      time += ms;
      const callbacks = [...raf.values()]; raf.clear();
      callbacks.forEach(callback => callback(time));
    },
    advance(seconds) { for (let i = 0; i < seconds * 50; i++) this.frame(); },
    pointer(x, y, pointerType = 'mouse') {
      ids.cinemaStage.emit('pointermove', { clientX: 100 + width * x, clientY: 80 + height * y, pointerType });
    },
    visibility(value) { observers[0].callback([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]); }
  };
}

test('hero waits for its only required portrait, then autoplays without manual timeline controls', () => {
  const h = harness();
  assert.equal(h.images.length, 1);
  assert.equal(h.images[0].src, 'assets/midou-front.png');
  assert.equal(h.raf.size, 0);
  assert.equal(h.ids.heroMotionToggle.disabled, true);
  assert.equal(h.actor.style.opacity, '0');
  assert.equal(h.ids.cinemaStage.children.find(child => child.className === 'hero-asset-fallback').hidden, true);
  h.load();
  assert.equal(h.ids.filmLoading.hidden, true);
  assert.equal(h.ids.cinemaStage.dataset.motion, 'playing');
  assert.equal(h.ids.heroMotionToggle.textContent, '暂停动效');
  assert.equal(h.raf.size, 1);
  assert.deepEqual(Object.keys(h.window.midouHeroMotion), ['pause', 'resume', 'dispose']);
  assert.equal(h.timers.size, 0);
  assert.equal(h.ids.cinemaStage.children.find(child => child.className === 'hero-asset-fallback').hidden, true);
});

for (const viewport of [
  { name: 'desktop', width: 900, height: 700, actorSize: 470 },
  { name: 'mobile', width: 390, height: 470, actorSize: 285, fine: false }
]) {
  test(`${viewport.name}: the 3-second crown reveal settles into an infinite gentle 30-second cycle`, () => {
    const h = harness(viewport); h.load(); h.frame();
    assert.equal(Number(h.ids.cinemaStage.dataset.heroScale), 5.2);
    h.advance(3);
    assert.ok(Math.abs(Number(h.ids.cinemaStage.dataset.heroScale) - 1) < .0001);
    assert.equal(h.ids.actors.children.length, 1);
    assert.equal(h.body.children.length, 1);
    assert.equal(h.body.children[0].style.opacity, '1');
    h.advance(7.5);
    assert.ok(Math.abs(Number(h.ids.cinemaStage.dataset.heroYaw) - 7) < .01);
    assert.ok(Math.abs(Number(h.ids.cinemaStage.dataset.heroDrift) - 12) < .01);
    assert.ok(Math.abs(Number(h.ids.cinemaStage.dataset.heroLift)) < .01);
    h.advance(30);
    assert.ok(Math.abs(Number(h.ids.cinemaStage.dataset.heroYaw) - 7) < .01);
    assert.equal(h.raf.size, 1);
    for (const element of h.all) for (const value of Object.values(element.style)) {
      assert.doesNotMatch(String(value), /NaN|Infinity/);
    }
  });
}

test('mouse influence is bounded, rate-limited, and eases back after leaving', () => {
  const h = harness(); h.load(); h.frame(); h.advance(3);
  const before = Number(h.ids.cinemaStage.dataset.heroYaw);
  h.pointer(1, 0);
  h.frame();
  const firstStep = Number(h.ids.cinemaStage.dataset.heroYaw) - before;
  assert.ok(firstStep > 0 && firstStep < .2, `not a sudden spin: ${firstStep}`);
  h.advance(3);
  assert.ok(Number(h.ids.cinemaStage.dataset.heroYaw) < 15.01);
  assert.ok(Number(h.ids.cinemaStage.dataset.heroYaw) > 7);
  h.ids.cinemaStage.emit('pointerleave');
  h.advance(6);
  assert.ok(Number(h.ids.cinemaStage.dataset.heroYaw) < 7.1);
});

test('touch and coarse pointers never steer or capture the scrolling interaction', () => {
  const h = harness({ fine: false }); const baseline = harness({ fine: false });
  h.load(); baseline.load(); h.frame(); baseline.frame();
  h.advance(3); baseline.advance(3);
  h.pointer(1, 0, 'touch'); h.pointer(1, 0, 'mouse');
  h.advance(2); baseline.advance(2);
  assert.equal(h.body.style.transform, baseline.body.style.transform);
  assert.equal(h.ids.cinemaStage.listeners.has('touchmove'), false);
  assert.equal(h.ids.cinemaStage.listeners.has('pointerdown'), false);
});

test('pause freezes the portrait and pointer response; resume continues without elapsed-time jumps', () => {
  const h = harness(); h.load(); h.frame(); h.advance(4);
  h.ids.heroMotionToggle.emit('click');
  assert.equal(h.ids.heroMotionToggle.getAttribute('aria-pressed'), 'true');
  assert.equal(h.ids.heroMotionToggle.textContent, '继续动效');
  const snapshot = h.body.style.transform;
  const time = h.ids.cinemaStage.dataset.heroTime;
  h.pointer(1, 1); h.frame(30000);
  assert.equal(h.body.style.transform, snapshot);
  assert.equal(h.ids.cinemaStage.dataset.heroTime, time);
  assert.equal(h.raf.size, 0);
  h.ids.heroMotionToggle.emit('click'); h.frame(20000);
  assert.equal(h.ids.cinemaStage.dataset.heroTime, time);
  assert.equal(h.ids.heroMotionToggle.getAttribute('aria-pressed'), 'false');
  h.frame();
  assert.ok(Number(h.ids.cinemaStage.dataset.heroTime) > Number(time));
});

test('reduced motion is static, full-body, and ignores pointer and resume requests', () => {
  const h = harness({ reduced: true }); h.load();
  assert.equal(h.ids.cinemaStage.dataset.motion, 'reduced');
  assert.equal(h.ids.cinemaStage.dataset.heroScale, '1.00000');
  assert.equal(h.ids.cinemaStage.dataset.heroYaw, '0.000');
  assert.equal(h.ids.cinemaStage.dataset.heroDrift, '0.000');
  assert.equal(h.ids.cinemaStage.dataset.heroLift, '0.000');
  assert.equal(h.ids.heroMotionToggle.disabled, true);
  assert.equal(h.raf.size, 0);
  const before = h.body.style.transform;
  h.pointer(1, 1); h.advance(2);
  assert.equal(h.body.style.transform, before);
  assert.equal(h.window.midouHeroMotion.resume(), false);
  h.reduceMedia.matches = false; h.reduceMedia.emit('change');
  assert.equal(h.raf.size, 1);
});

test('a reduced-motion preference change exits a macro pose immediately', () => {
  const h = harness(); h.load(); h.frame(); h.advance(.5);
  assert.ok(Number(h.ids.cinemaStage.dataset.heroScale) > 4);
  h.reduceMedia.matches = true; h.reduceMedia.emit('change');
  assert.equal(h.ids.cinemaStage.dataset.heroScale, '1.00000');
  assert.equal(h.raf.size, 0);
});

test('offscreen and background intervals pause the clock and do not catch up on resume', () => {
  const h = harness(); h.load(); h.frame(); h.advance(4);
  h.visibility(false);
  const before = h.ids.cinemaStage.dataset.heroTime;
  h.frame(30000);
  assert.equal(h.ids.cinemaStage.dataset.heroTime, before);
  h.visibility(true); h.frame(20000);
  assert.equal(h.ids.cinemaStage.dataset.heroTime, before);
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.raf.size, 0);
  h.document.hidden = false; h.document.emit('visibilitychange'); h.frame(10000);
  assert.equal(h.ids.cinemaStage.dataset.heroTime, before);
});

test('asset failure hides the missing portrait and displays an honest readable fallback', () => {
  const h = harness(); h.fail();
  assert.equal(h.ids.filmLoading.hidden, true);
  assert.equal(h.ids.cinemaStage.dataset.motion, 'error');
  assert.equal(h.actor.style.opacity, '0');
  assert.equal(h.body.children[0].className, 'cat-skin front');
  assert.equal(h.ids.cinemaStage.dataset.heroScale, '1.00000');
  assert.equal(h.ids.heroMotionToggle.textContent, '图片暂未载入');
  const fallback = h.ids.cinemaStage.children.find(child => child.className === 'hero-asset-fallback');
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.textContent, '咪Dou 暂时没能露面，先看看下面的五大能力。');
  assert.equal(h.ids.heroMotionToggle.disabled, true);
  assert.equal(h.raf.size, 0);
  assert.equal(h.timers.size, 0);
  h.window.midouHeroMotion.dispose();
  assert.equal(h.ids.cinemaStage.children.includes(fallback), false);
});

test('loading timeout also removes the blocker; dispose cleans up without restarting', () => {
  const h = harness();
  [...h.timers.values()][0]();
  assert.equal(h.ids.cinemaStage.dataset.motion, 'error');
  const loaded = harness(); loaded.load(); loaded.frame();
  loaded.window.midouHeroMotion.dispose(); loaded.window.midouHeroMotion.dispose();
  assert.equal(loaded.raf.size, 0);
  assert.equal(loaded.window.midouHeroMotion.resume(), false);
  assert.equal(loaded.ids.cinemaStage.dataset.motion, 'disposed');
  assert.equal(loaded.ids.cinemaStage.children.some(child => child.className === 'hero-asset-fallback'), false);
  assert.ok(loaded.observers.every(observer => observer.disconnected));
  assert.equal(loaded.ids.cinemaStage.listenerCount + loaded.ids.heroMotionToggle.listenerCount +
    loaded.document.listenerCount + loaded.reduceMedia.listenerCount + loaded.fineMedia.listenerCount, 0);
});
