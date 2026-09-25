const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../dist/gallery-motion.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../dist/gallery-motion.css'), 'utf8');
const baseCss = fs.readFileSync(path.join(__dirname, '../dist/front-experience.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const properties = ['--card-rx', '--card-ry', '--photo-x', '--photo-y'];

function mediaBody(source, query) {
  const start = source.indexOf(`@media${query}`);
  assert.notEqual(start, -1, `missing media rule ${query}`);
  const open = source.indexOf('{', start);
  let depth = 1;
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  assert.fail(`unclosed media rule ${query}`);
}

function ruleBody(source, selector) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectors.trim().split(',').map(value => value.trim()).includes(selector)) return body;
  }
  assert.fail(`missing CSS selector ${selector}`);
}

function minHeight(source, selector = '.moments .moment-card') {
  const match = ruleBody(source, selector).match(/(?:^|;)\s*min-height:([^;]+)/);
  assert.ok(match, `missing min-height on ${selector}`);
  return match[1].trim();
}

function pixels(value, viewport) {
  const plain = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (plain) return Number(plain[1]);
  const clamp = value.match(/^clamp\((\d+)px,\s*(\d+)vw,\s*(\d+)px\)$/);
  assert.ok(clamp, `expected a bounded fluid height, got ${value}`);
  return Math.max(Number(clamp[1]), Math.min(viewport * Number(clamp[2]) / 100, Number(clamp[3])));
}

function harness({ count = 7, reduced = false, fine = true, hidden = false, saved = {} } = {}) {
  class Target {
    constructor() { this.listeners = new Map(); this.options = new Map(); }
    addEventListener(name, fn, options) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
      this.options.set(name, options);
    }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name, event = {}) { for (const fn of this.listeners.get(name) || []) fn(event); }
    get listenerCount() { return [...this.listeners.values()].reduce((sum, values) => sum + values.size, 0); }
  }
  const cards = Array.from({ length: count }, (_, index) => {
    const card = new Target();
    const values = new Map(Object.entries(index ? {} : saved));
    card.style = {
      getPropertyValue: name => values.get(name) || '',
      setProperty: (name, value) => values.set(name, String(value)),
      removeProperty: name => values.delete(name)
    };
    card.rect = { left: 100, top: 80, width: 400, height: 360 };
    card.measures = 0;
    card.getBoundingClientRect = () => { card.measures++; return { ...card.rect }; };
    return card;
  });
  const document = new Target();
  document.hidden = hidden;
  document.querySelectorAll = selector => selector === '.moment-card' ? cards : [];
  const window = new Target();
  const reduceMedia = new Target(); reduceMedia.matches = reduced;
  const fineMedia = new Target(); fineMedia.matches = fine;
  const raf = new Map(); const observers = [];
  let sequence = 0;
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; this.targets = []; }
  }
  const forbidTimer = () => { throw new Error('The gallery must not schedule autoplay or recurring timers'); };
  window.setTimeout = window.setInterval = forbidTimer;
  vm.runInNewContext(script, {
    document, window, IntersectionObserver: Observer,
    matchMedia: query => query.includes('reduced-motion') ? reduceMedia : fineMedia,
    requestAnimationFrame(fn) { const id = ++sequence; raf.set(id, fn); return id; },
    cancelAnimationFrame(id) { raf.delete(id); },
    setTimeout: forbidTimer, setInterval: forbidTimer
  });
  return {
    cards, document, window, reduceMedia, fineMedia, raf, observers,
    frame() { const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach(fn => fn(100)); },
    pointer(index = 0, x = 1, y = 1, pointerType = 'mouse') {
      const card = cards[index]; const { left, top, width, height } = card.rect;
      card.emit('pointermove', { clientX: left + width * x, clientY: top + height * y, pointerType,
        preventDefault() { throw new Error('Gallery feedback must never intercept scrolling'); } });
    },
    visible(index, value) { observers[0].callback([{ target: cards[index], isIntersecting: value }]); },
    values(index = 0) { return properties.map(name => cards[index].style.getPropertyValue(name)); }
  };
}

test('a page without gallery cards exits without observers, listeners, or an API', () => {
  const h = harness({ count: 0 });
  assert.equal(h.observers.length, 0);
  assert.equal(h.raf.size, 0);
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.window.petGalleryMotion, undefined);
});

test('seven cards initialize without autoplay, timers, or idle animation frames', () => {
  const h = harness();
  assert.equal(h.observers.length, 1);
  assert.deepEqual(h.observers[0].targets, h.cards);
  assert.equal(h.raf.size, 0);
  assert.deepEqual(Object.keys(h.window.petGalleryMotion), ['dispose']);
  assert.equal(Object.isFrozen(h.window.petGalleryMotion), true);
  for (const card of h.cards) assert.equal(card.options.get('pointermove').passive, true);
});

test('mouse input coalesces into one frame and applies bounded, independent card depth', () => {
  const h = harness();
  h.pointer(0, .1, .1);
  h.pointer(0, 9, -9);
  h.pointer(1, 0, 1);
  assert.equal(h.raf.size, 1);
  assert.deepEqual(h.values(), ['', '', '', '']);
  h.frame();
  assert.deepEqual(h.values(), ['1.80deg', '2.20deg', '-4.00px', '4.00px']);
  assert.deepEqual(h.values(1), ['-1.80deg', '-2.20deg', '4.00px', '-4.00px']);
  assert.deepEqual(h.values(2), ['', '', '', '']);
  assert.equal(h.cards[0].measures, 1);
  assert.equal(h.raf.size, 0, 'rendering does not create a perpetual animation loop');
});

test('zero-size cards do not schedule frames or write invalid transforms', () => {
  const h = harness();
  h.cards[0].rect.width = 0;
  h.pointer();
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
});

test('leave, cancellation, and blur restore previous custom properties and cancel pending poses', () => {
  const saved = { '--card-rx': '.5deg', '--photo-x': '1px' };
  for (const event of ['pointerleave', 'pointercancel', 'blur']) {
    const h = harness({ saved });
    h.pointer(); h.frame();
    h.cards[0].emit(event);
    assert.deepEqual(h.values(), ['.5deg', '', '1px', '']);
    h.pointer(); h.cards[0].emit(event); h.frame();
    assert.deepEqual(h.values(), ['.5deg', '', '1px', '']);
    assert.equal(h.raf.size, 0);
  }
});

test('scroll remeasures the card while resize resets it and cancels the pending frame', () => {
  const h = harness();
  h.pointer(); h.frame();
  assert.equal(h.cards[0].measures, 1);
  h.window.emit('scroll');
  h.cards[0].rect = { left: 20, top: -100, width: 320, height: 250 };
  h.pointer(0, 0, 0); h.frame();
  assert.equal(h.cards[0].measures, 2);
  assert.deepEqual(h.values(), ['1.80deg', '-2.20deg', '4.00px', '4.00px']);
  h.pointer(); h.window.emit('resize');
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
});

test('touch, pen, and coarse pointers leave scrolling untouched and create no JS motion', () => {
  const h = harness();
  h.pointer(0, 1, 1, 'touch');
  h.pointer(0, 1, 1, 'pen');
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
  for (const card of h.cards) {
    assert.equal(card.listeners.has('touchmove'), false);
    assert.equal(card.listeners.has('pointerdown'), false);
  }
  const coarse = harness({ fine: false });
  coarse.pointer();
  assert.equal(coarse.raf.size, 0);
  assert.equal(coarse.cards[0].measures, 0);
});

test('reduced motion is static initially and preference changes reset active and pending input', () => {
  const reduced = harness({ reduced: true });
  reduced.pointer();
  assert.equal(reduced.raf.size, 0);
  assert.deepEqual(reduced.values(), ['', '', '', '']);
  const h = harness();
  h.pointer(); h.frame(); h.pointer();
  h.reduceMedia.matches = true; h.reduceMedia.emit('change');
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
  h.pointer();
  assert.equal(h.raf.size, 0);
  h.reduceMedia.matches = false; h.reduceMedia.emit('change');
  assert.equal(h.raf.size, 0, 'enabling motion still does not start autoplay');
  h.pointer();
  assert.equal(h.raf.size, 1);
});

test('switching to a coarse pointer resets the desktop pose and stops new pointer frames', () => {
  const h = harness();
  h.pointer(); h.frame(); h.pointer();
  h.fineMedia.matches = false; h.fineMedia.emit('change');
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
  h.pointer();
  assert.equal(h.raf.size, 0);
});

test('backgrounding the page cancels the frame and resuming waits for fresh pointer input', () => {
  const h = harness();
  h.pointer(); h.frame(); h.pointer();
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
  h.pointer();
  assert.equal(h.raf.size, 0);
  h.document.hidden = false; h.document.emit('visibilitychange');
  assert.equal(h.raf.size, 0);
  h.pointer(); h.frame();
  assert.notDeepEqual(h.values(), ['', '', '', '']);
});

test('offscreen cards reset, ignore input, and resume only after becoming visible', () => {
  const h = harness();
  h.pointer(); h.frame(); h.pointer();
  h.visible(0, false); h.frame();
  assert.deepEqual(h.values(), ['', '', '', '']);
  assert.equal(h.raf.size, 0);
  h.pointer();
  assert.equal(h.raf.size, 0);
  h.visible(0, true);
  assert.equal(h.raf.size, 0);
  h.pointer(); h.frame();
  assert.notDeepEqual(h.values(), ['', '', '', '']);
});

test('bfcache pagehide clears motion but retains input handlers for restoration', () => {
  const h = harness();
  const listeners = h.cards[0].listenerCount;
  h.pointer(); h.frame(); h.pointer();
  h.window.emit('pagehide', { persisted: true });
  assert.equal(h.raf.size, 0);
  assert.deepEqual(h.values(), ['', '', '', '']);
  assert.equal(h.cards[0].listenerCount, listeners);
  assert.equal(h.observers[0].disconnected, undefined);
  h.pointer(); h.frame();
  assert.notDeepEqual(h.values(), ['', '', '', '']);
});

test('disposal and nonpersisted pagehide clean up all listeners, frames, and observations', () => {
  for (const reason of ['dispose', 'pagehide']) {
    const h = harness({ saved: { '--photo-y': '2px' } });
    h.pointer(); h.frame(); h.pointer();
    if (reason === 'dispose') h.window.petGalleryMotion.dispose();
    else h.window.emit('pagehide', { persisted: false });
    h.window.petGalleryMotion.dispose();
    assert.equal(h.raf.size, 0);
    assert.equal(h.observers[0].disconnected, true);
    assert.equal(h.window.listenerCount + h.document.listenerCount + h.reduceMedia.listenerCount + h.fineMedia.listenerCount, 0);
    for (const card of h.cards) assert.equal(card.listenerCount, 0);
    assert.deepEqual(h.values(), ['', '', '', '2px']);
    h.pointer(); h.window.emit('resize'); h.reduceMedia.emit('change');
    assert.equal(h.raf.size, 0);
  }
});

test('CSS keeps captions visible, supplies touch feedback, and disables transformations for reduced motion', () => {
  assert.match(css, /\.moments \.moment-card:before\{[^}]*pointer-events:none;[^}]*linear-gradient\(/);
  assert.match(css, /\.moments \.moment-copy[^}]*z-index:2/);
  assert.doesNotMatch(css, /\.moment-copy[^{}]*\{[^}]*\b(?:opacity:0|visibility:hidden|display:none)/);
  assert.match(css, /@media\(max-width:800px\)[\s\S]*\.moments \.moment-card:active\{scale:\.992\}/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  const reduced = css.slice(css.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.match(reduced, /transition:none!important/);
  assert.match(reduced, /transform:none!important;scale:none!important/);
  assert.match(reduced, /translate:none!important/);
});

test('larger photos retain the desktop 2 / 3 / 2 grid and seven original linked stories', () => {
  assert.match(baseCss, /\.moments-grid\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)\}/);
  assert.match(baseCss, /\.moment-card\{grid-column:span 2\}/);
  assert.match(baseCss, /\.moment-card:nth-child\(-n\+2\)\{grid-column:span 3\}/);
  assert.match(baseCss, /\.moment-card:nth-last-child\(-n\+2\)\{grid-column:span 3\}/);
  const desktop = css.slice(0, css.indexOf('@media'));
  assert.doesNotMatch(desktop, /\bgrid-template-columns\s*:|\bgrid-column\s*:|\border\s*:/);
  const cards = [...html.matchAll(/<a\b([^>]*class="[^"]*\bmoment-card\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(cards.length, 7);
  assert.deepEqual(cards.map(([, attrs]) => Number(attrs.match(/data-feature-jump="(\d+)"/)[1])), [3, 1, 2, 3, 1, 3, 3]);
  assert.deepEqual(cards.map(([, , body]) => body.match(/<h3>([\s\S]*?)<\/h3>/)[1].replace(/<br\s*\/?\s*>/g, '')), [
    '它的小问号，值得认真回答。', '放松的日常，也值得好好记录。', '每一口，都是关心。',
    '窗边的小心思。', '陪它，慢慢晒太阳。', '伸个爪，回应你。', '给它一点自己的空间。'
  ]);
  for (const [, attrs, body] of cards) {
    assert.match(attrs, /href="#abilities"/);
    assert.equal((body.match(/class="moment-copy"/g) || []).length, 1);
    assert.match(body, /<p>[^<]+<b aria-hidden="true">↗<\/b><\/p>/);
  }
});

test('desktop photo viewports grow within bounded fluid heights without fixing text height', () => {
  const desktop = css.slice(0, css.indexOf('@media'));
  const regular = minHeight(desktop);
  const first = minHeight(desktop, '.moments .moment-card:nth-child(-n+2)');
  const last = minHeight(desktop, '.moments .moment-card:nth-last-child(-n+2)');
  assert.equal(regular, 'clamp(440px,36vw,560px)');
  assert.equal(first, 'clamp(500px,42vw,640px)');
  assert.equal(last, first);
  for (const [width, expectedRegular, expectedWide] of [[801, 440, 500], [1100, 440, 500], [1440, 518.4, 604.8], [1920, 560, 640]]) {
    assert.equal(pixels(regular, width), expectedRegular);
    assert.equal(pixels(first, width), expectedWide);
    assert.ok(pixels(first, width) > pixels(regular, width));
  }
  for (const selector of ['.moments .moment-card', '.moments .moment-card:nth-child(-n+2)', '.moments .moment-card:nth-last-child(-n+2)']) {
    assert.doesNotMatch(ruleBody(desktop, selector), /(?:^|;)(?:height|max-height):/);
  }
});

test('tablet and phone height overrides preserve the established responsive columns', () => {
  const tablet = mediaBody(css, '(max-width:800px)');
  const phone = mediaBody(css, '(max-width:600px)');
  assert.ok(css.indexOf('@media(max-width:600px)') > css.indexOf('@media(max-width:800px)'));
  for (const selector of ['.moments .moment-card', '.moments .moment-card:nth-child(-n+2)', '.moments .moment-card:nth-last-child(-n+2)']) {
    assert.equal(minHeight(tablet, selector), '420px');
    assert.equal(minHeight(phone, selector), 'clamp(410px,110vw,480px)');
    assert.match(ruleBody(phone, selector), /(?:^|;)grid-column:span 1(?:;|$)/);
    assert.doesNotMatch(ruleBody(phone, selector), /(?:^|;)(?:height|max-height):/);
  }
  assert.doesNotMatch(tablet, /grid-template-columns:/, 'the gallery override must not alter the existing tablet grid');
  assert.match(ruleBody(phone, '.moments .moments-grid'), /grid-template-columns:minmax\(0,1fr\)/);
  for (const [width, expected] of [[320, 410], [375, 412.5], [390, 429], [430, 473], [480, 480], [600, 480]]) {
    assert.equal(pixels(minHeight(phone), width), expected);
  }
  assert.equal(pixels(minHeight(tablet), 601), 420);
  assert.equal(pixels(minHeight(tablet), 800), 420);
});

test('larger cropped photos have individual cat focal points and untruncated caption overlays', () => {
  assert.match(ruleBody(css, '.moments .moment-image'), /position:absolute;inset:0;width:100%;height:100%/);
  assert.match(ruleBody(css, '.moments .moment-image img'), /object-fit:cover/);
  for (const [index, focal] of [[3, '60% center'], [4, '56% center'], [5, '63% center']]) {
    assert.ok(ruleBody(css, `.moments .moment-card:nth-child(${index}) img`).includes(`object-position:${focal}`));
  }
  const overlay = ruleBody(css, '.moments .moment-card:before');
  assert.match(overlay, /#0e243200 28%,#0e24321a 48%,#0e2432b8 76%,#0e2432f2 100%/);
  const copy = ruleBody(css, '.moments .moment-copy');
  assert.match(copy, /position:relative;z-index:2;align-self:end/);
  assert.match(copy, /padding:24px 28px/);
  assert.doesNotMatch(css, /(?:line-clamp|text-overflow|white-space:nowrap)/);
  assert.doesNotMatch(copy, /(?:^|;)(?:height|max-height|overflow):/);
});
