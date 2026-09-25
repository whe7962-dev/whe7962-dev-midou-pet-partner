'use strict';

// Run with: node --test tests/cinematic.test.cjs
// These tests cover timeline state and geometry, not browser layout or visual fidelity.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../dist/cinematic.js'), 'utf8');
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

function createHarness({ width, height, actorSize, reduced = false }) {
  const elements = [];
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.events = new Map();
      this.className = '';
      this.hidden = false;
      this.disabled = false;
      this.value = '0';
      this.innerHTML = '';
      this._text = '';
      this.clientWidth = width;
      this.clientHeight = height;
      this.offsetWidth = actorSize;
      this.style = { setProperty(name, value) { this[name] = String(value); } };
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        toggle: (name, force) => {
          const names = new Set(this.className.split(/\s+/).filter(Boolean));
          const add = force === undefined ? !names.has(name) : force;
          if (add) names.add(name); else names.delete(name);
          this.className = [...names].join(' ');
          return add;
        }
      };
      elements.push(this);
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; this._text = ''; }
    set textContent(text) { this._text = String(text); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(type, callback) {
      if (!this.events.has(type)) this.events.set(type, []);
      this.events.get(type).push(callback);
    }
    dispatch(type, extra = {}) {
      for (const callback of this.events.get(type) || []) callback({ type, target: this, ...extra });
    }
    scrollIntoView(options) { this.lastScroll = options; }
  }

  const ids = Object.fromEntries([
    'cinemaStage', 'stageCamera', 'actors', 'filmCopy', 'filmCopyTitle', 'filmCopyEn',
    'cinemaIntro', 'pocketScene', 'filmSeek', 'playPause', 'filmLoading', 'frameNote',
    'timecode', 'replay', 'replayDetail', 'home'
  ].map(id => [id, new Element()]));
  const chapters = [1.3, 8.2, 12.8, 18, 24.5].map(time => {
    const button = new Element('button');
    button.dataset.time = String(time);
    return button;
  });
  const document = new Element('document');
  document.getElementById = id => {
    assert.ok(ids[id], `Unexpected DOM lookup: ${id}`);
    return ids[id];
  };
  document.createElement = tag => new Element(tag);
  document.querySelectorAll = selector => {
    assert.equal(selector, '[data-time]');
    return chapters;
  };

  const media = new Element();
  media.matches = reduced;
  const images = [];
  const frames = new Map();
  const observers = [];
  let frameId = 0;
  class Image {
    constructor() { images.push(this); }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() { this.callback(); }
  }
  vm.runInNewContext(script, {
    document, Image, IntersectionObserver, ResizeObserver,
    matchMedia: query => {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return media;
    },
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  }, { filename: 'dist/cinematic.js' });

  return {
    ids, chapters, document, images, media, frames, elements,
    actors: ids.actors.children,
    async load() { images.forEach(image => image.onload()); await flushPromises(); },
    seek(time) {
      ids.filmSeek.dispatch('pointerdown');
      ids.filmSeek.value = String(time);
      ids.filmSeek.dispatch('input');
      ids.filmSeek.dispatch('change');
    },
    pause() { if (!ids.playPause.classList.contains('paused')) ids.playPause.dispatch('click'); },
    frame(stamp) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(stamp));
    },
    visible(value) { observers[0].callback([{ isIntersecting: value }]); }
  };
}

function visibleActors(harness) {
  return harness.actors.filter(actor => Number(actor.style.opacity) > 0);
}

function finiteState(harness, time) {
  for (const element of harness.elements) {
    for (const [key, value] of Object.entries(element.style)) {
      if (typeof value === 'function') continue;
      assert.doesNotMatch(String(value), /NaN|Infinity/, `${time}s ${element.className} ${key}`);
      if (key === 'opacity') assert.ok(Number(value) >= 0 && Number(value) <= 1, `${time}s opacity: ${value}`);
    }
  }
  assert.equal(harness.ids.cinemaStage.dataset.time, time.toFixed(3));
  assert.equal(Number(harness.ids.filmSeek.value), time);
  for (const actor of visibleActors(harness)) {
    const skins = actor.children[1].children;
    assert.equal(skins.filter(skin => skin.style.opacity === '1').length, 1, `${time}s has one visible view per actor`);
  }
}

function renderedSnapshot(harness) {
  const styles = element => Object.fromEntries(Object.entries(element.style).filter(([, value]) => typeof value !== 'function'));
  return {
    actors: visibleActors(harness).map(actor => ({
      id: actor.dataset.actor, style: styles(actor),
      shadow: styles(actor.children[0]), body: styles(actor.children[1]),
      skins: actor.children[1].children.map(skin => skin.style.opacity)
    })),
    camera: harness.ids.stageCamera.style.transform,
    copy: Number(harness.ids.filmCopy.style.opacity) > 0 ? {
      className: harness.ids.filmCopy.className,
      style: styles(harness.ids.filmCopy),
      title: harness.ids.filmCopyTitle.textContent,
      letters: harness.ids.filmCopyTitle.children.map(styles),
      subtitle: harness.ids.filmCopyEn.textContent
    } : null,
    pocket: Number(harness.ids.pocketScene.style.opacity) > 0 ? styles(harness.ids.pocketScene) : null,
    chapter: harness.ids.cinemaStage.dataset.chapter
  };
}

const viewports = [
  { name: 'desktop 1440px', width: 1440, height: 690, actorSize: 513 },
  { name: 'mobile 390px', width: 390, height: 614, actorSize: 273 }
];

for (const viewport of viewports) {
  test(`${viewport.name}: waits for all assets before autoplay`, async () => {
    const h = createHarness(viewport);
    assert.deepEqual(h.images.map(image => image.src), [
      'assets/midou-front.png', 'assets/midou-views.png', 'assets/midou-pocket.png'
    ]);
    h.ids.playPause.dispatch('click');
    assert.equal(h.frames.size, 0);
    h.images[0].onload(); h.images[1].onload();
    await flushPromises();
    assert.equal(h.ids.filmLoading.hidden, false);
    assert.equal(h.frames.size, 0);
    h.images[2].onload();
    await flushPromises();
    assert.equal(h.ids.filmLoading.hidden, true);
    assert.equal(h.frames.size, 1);
    assert.equal(h.ids.playPause.getAttribute('aria-label'), '暂停开场');
    finiteState(h, 0);
  });

  test(`${viewport.name}: all phases and boundary seeks remain finite and reversible`, async () => {
    const h = createHarness(viewport);
    await h.load(); h.pause();
    const boundaries = [0, .5, 1.3, 5.5, 6.7, 8, 8.7, 9, 11, 12.7, 14, 15.7, 17.5, 18, 19.5, 20.7, 22.4, 23, 24.3, 25.8, 28];
    const samples = [...new Set([
      ...Array.from({ length: 281 }, (_, i) => i / 10),
      ...boundaries.flatMap(time => [time - .000001, time, time + .000001]).filter(time => time >= 0 && time <= 28)
    ])].sort((a, b) => a - b);
    const expected = new Map();
    for (const time of samples) {
      h.seek(time); finiteState(h, time); expected.set(time, renderedSnapshot(h));
    }
    for (const time of [...samples].reverse()) {
      h.seek(time); finiteState(h, time);
      assert.deepEqual(renderedSnapshot(h), expected.get(time), `reverse seek at ${time}s must match forward seek`);
    }

    const scenes = [
      [0.25, 1], [0.9, 1], [4.6, 1, '咪Dou，天生专业。'], [6.1, 1], [7.2, 1],
      [8.6, 0, '可爱，也有质感。'], [10.4, 1, '可爱，也有质感。'], [11.7, 1],
      [13.4, 0, '把好心情，随身带。'], [15, 1, '双耳传感，随时监听。'],
      [16.8, 5, '双耳传感，随时监听。'], [17.95, 0], [19.1, 2], [20, 2],
      [21.9, 7], [22.7, 7], [23.7, 7], [25.2, 7, '每一款，都有偏爱。'], [27.4, 1]
    ];
    for (const [time, count, text] of scenes) {
      h.seek(time);
      assert.equal(visibleActors(h).length, count, `${time}s actor count`);
      if (text) {
        assert.ok(Number(h.ids.filmCopy.style.opacity) > 0, `${time}s caption visible`);
        assert.equal(h.ids.filmCopyTitle.textContent, text);
      }
    }
  });

  test(`${viewport.name}: final frame stops on one small centered cat without text`, async () => {
    const h = createHarness(viewport);
    await h.load();
    h.frame(1000); h.frame(30000);
    finiteState(h, 28);
    assert.equal(h.frames.size, 0);
    assert.equal(h.ids.playPause.getAttribute('aria-label'), '重播开场');
    const [cat] = visibleActors(h);
    assert.equal(visibleActors(h).length, 1);
    assert.equal(cat.dataset.actor, '0');
    const geometry = cat.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px,0\).*scale\(([-\d.]+),([-\d.]+)\)/);
    assert.ok(geometry, 'final actor transform is measurable');
    assert.ok(Math.abs(Number(geometry[1]) + viewport.actorSize / 2) < .01, 'cat is horizontally centered');
    assert.ok(Math.abs(Number(geometry[3]) * viewport.actorSize - viewport.height * .1) < .1, 'cat canvas height is 10% of stage');
    assert.equal(h.ids.filmCopy.style.opacity, '0');
    assert.equal(h.ids.cinemaIntro.style.opacity, '0');
    assert.equal(h.ids.pocketScene.style.opacity, '0');
  });

  test(`${viewport.name}: reduced motion stays paused until explicitly played`, async () => {
    const h = createHarness({ ...viewport, reduced: true });
    await h.load();
    finiteState(h, 4.6);
    assert.equal(h.frames.size, 0);
    assert.equal(h.ids.playPause.getAttribute('aria-label'), '播放开场');
    h.chapters[1].dispatch('click');
    finiteState(h, 8.2);
    assert.equal(h.frames.size, 0);
    h.ids.replay.dispatch('click');
    finiteState(h, 0);
    assert.equal(h.frames.size, 0);
    h.ids.playPause.dispatch('click');
    assert.equal(h.frames.size, 1, 'explicit play is allowed');
    h.frame(1000); h.frame(1500);
    finiteState(h, .5);
    h.media.dispatch('change');
    finiteState(h, 4.6);
    assert.equal(h.frames.size, 0);
  });
}

test('asset failure retains a useful fallback and disables unavailable playback', async () => {
  const h = createHarness(viewports[0]);
  h.images[0].onerror();
  await flushPromises();
  assert.equal(h.frames.size, 0);
  assert.equal(h.ids.filmLoading.hidden, false);
  assert.match(h.ids.filmLoading.textContent, /开场素材暂未载入/);
  assert.equal(h.ids.filmLoading.children[1].href, '#meet');
  assert.equal(h.ids.playPause.disabled, true);
  assert.equal(h.ids.filmSeek.disabled, true);
});

test('offscreen and background pauses do not count suspended time', async () => {
  const h = createHarness(viewports[0]);
  await h.load();
  h.frame(1000); h.frame(2000);
  finiteState(h, 1);
  h.visible(false);
  assert.equal(h.frames.size, 0);
  h.visible(true);
  h.frame(60000);
  finiteState(h, 1);
  h.document.hidden = true;
  h.document.dispatch('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.document.dispatch('visibilitychange');
  h.frame(120000); h.frame(120500);
  finiteState(h, 1.5);
});
