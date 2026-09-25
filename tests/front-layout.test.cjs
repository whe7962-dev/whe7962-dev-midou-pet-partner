'use strict';

// Static delivery contracts, using only Node built-ins. These checks do not
// classify image pixels or replace browser layout/accessibility inspection.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.resolve(__dirname, '../dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const frontCSS = fs.readFileSync(path.join(dist, 'front-experience.css'), 'utf8');
const app = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// The page is static HTML with quoted attributes. Keeping a small element tree
// lets assertions check containment instead of matching unrelated global text.
function parseHTML(text) {
  const root = {tag: '#document', attrs: {}, children: [], start: 0, end: text.length};
  const stack = [root], all = [];
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][\w:-]*)\b([^>]*?)>/gi;
  for (const match of text.matchAll(tokens)) {
    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index > 0) { stack[index].end = match.index; stack.length = index; }
      continue;
    }
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    }
    const node = {tag, attrs, children: [], parent: stack.at(-1), start: match.index,
      contentStart: match.index + match[0].length, end: match.index + match[0].length};
    node.parent.children.push(node); all.push(node);
    if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(node);
  }
  return {root, all};
}
const {all} = parseHTML(html);
const byId = id => all.find(node => node.attrs.id === id);
const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);
const inside = (node, parent) => {
  for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) if (ancestor === parent) return true;
  return false;
};
const contents = node => html.slice(node.contentStart, node.end);
const text = node => contents(node).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

test('core capabilities are the second main section, immediately after the hero', () => {
  const main = all.find(node => node.tag === 'main');
  assert.ok(main);
  const sections = main.children.filter(node => node.tag === 'section');
  assert.deepEqual(sections.slice(0, 2).map(node => node.attrs.id), ['home', 'abilities']);
  assert.equal(main.children.indexOf(sections[1]), main.children.indexOf(sections[0]) + 1);
});

test('the hero contains five correctly indexed native capability shortcuts', () => {
  const hero = byId('home');
  const links = all.filter(node => inside(node, hero) && 'data-feature-jump' in node.attrs);
  const labels = ['快速问诊', '疾病咨询', '营养方案', '养宠百科', '提取文字'];
  assert.equal(links.length, 5);
  assert.deepEqual(links.map(node => node.attrs['data-feature-jump']), ['0', '1', '2', '3', '4']);
  links.forEach((link, index) => {
    assert.equal(link.tag, 'a');
    assert.equal(link.attrs.href, '#abilities');
    assert.ok(text(link).includes(labels[index]));
    assert.equal(byId(`abilityTab${index}`).attrs['data-ability'], String(index));
    assert.ok(text(byId(`abilityTab${index}`)).includes(labels[index]));
  });
  const shortcutNav = links[0].parent;
  assert.equal(shortcutNav.tag, 'nav');
  assert.ok(shortcutNav.attrs['aria-label']);
});

test('every feature jump targets an existing capability and retains native anchor behavior', () => {
  for (const link of all.filter(node => 'data-feature-jump' in node.attrs)) {
    const index = Number(link.attrs['data-feature-jump']);
    assert.ok(Number.isInteger(index) && index >= 0 && index < 5);
    assert.equal(link.attrs.href, '#abilities');
    assert.ok(byId(`abilityTab${index}`));
  }
  const start = app.indexOf("document.querySelectorAll('[data-feature-jump]')");
  const end = app.indexOf('new IntersectionObserver', start);
  assert.ok(start >= 0 && end > start);
  const handler = app.slice(start, end);
  assert.match(handler, /Number\(link\.dataset\.featureJump\)/);
  assert.match(handler, /Number\.isInteger\(index\)/);
  assert.match(handler, /choose\(index\)/);
  assert.match(handler, /userInteracting\s*=\s*true/);
  assert.match(handler, /scheduleFeatures\(\)/);
  assert.doesNotMatch(handler, /preventDefault\s*\(/);
});

test('the capability demo contains a neutral record sheet instead of photo scanning', () => {
  assert.doesNotMatch(html, /\bscan-(?:photo|line)\b/);
  const panel = byId('abilityPanel');
  assert.ok(panel);
  assert.equal(all.filter(node => node.tag === 'img' && inside(node, panel)).length, 0);
  const sheet = all.find(node => hasClass(node, 'observation-sheet') && inside(node, panel));
  assert.ok(sheet);
  assert.match(sheet.attrs['aria-label'], /记录.*示意/);
  assert.match(sheet.attrs['aria-label'], /无医疗诊断结果/);
  assert.match(text(sheet), /非诊断结果/);
  assert.match(html, /不能代替兽医诊断/);
});

test('two lifestyle photos are outside diagnosis UI and explicitly captioned as non-clinical', () => {
  const moments = byId('moments');
  assert.ok(moments);
  const images = all.filter(node => node.tag === 'img' && inside(node, moments));
  assert.deepEqual(images.map(node => node.attrs.src).sort(), ['assets/daily-comfort.png', 'assets/daily-curiosity.png']);
  for (const image of images) {
    assert.match(image.attrs.alt, /猫/);
    assert.doesNotMatch(image.attrs.alt, /医生|兽医|听诊|医疗|诊断|治疗|doctor|medical|diagnos|clinic/i);
    assert.equal(image.attrs.loading, 'lazy');
    assert.equal(image.attrs.width, '1536');
    assert.equal(image.attrs.height, '1024');
    assert.equal(inside(image, byId('abilityPanel')), false);
    const bytes = fs.readFileSync(path.join(dist, image.attrs.src));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), Number(image.attrs.width));
    assert.equal(bytes.readUInt32BE(20), Number(image.attrs.height));
  }
  assert.match(text(moments), /生活情境配图，非问诊、诊断或疗效展示/);
  for (const image of all.filter(node => node.tag === 'img')) {
    assert.doesNotMatch(image.attrs.alt || '', /医生|兽医|听诊|诊疗|doctor|diagnos|clinic/i);
    assert.doesNotMatch(image.attrs.src || '', /doctor|medical|diagnos|codex-clipboard/i);
  }
});

test('all local HTML, CSS and JavaScript asset/module references exist inside dist', () => {
  const references = [];
  for (const node of all) {
    for (const attribute of ['src', 'href', 'poster']) {
      if (node.attrs[attribute]) references.push({from: 'index.html', value: node.attrs[attribute]});
    }
  }
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { inspect(absolute); continue; }
      if (!/\.(?:css|js)$/.test(entry.name)) continue;
      const from = path.relative(dist, absolute);
      const code = fs.readFileSync(absolute, 'utf8');
      if (entry.name.endsWith('.css')) {
        for (const match of code.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) {
          references.push({from, value: match[1] || match[2] || match[3]});
        }
      } else {
        // Anchor static declarations to lines; the vendor bundle contains WGSL
        // parser strings spelling "import", which are not JavaScript imports.
        for (const pattern of [/^\s*(?:import|export)\s+(?:[^;"'\n]*?\sfrom\s*)?["']([^"']+)["']/gm,
          /\bawait\s+import\s*\(\s*["']([^"']+)["']/g]) {
          for (const match of code.matchAll(pattern)) references.push({from, value: match[1]});
        }
        for (const match of code.matchAll(/["'](assets\/[A-Za-z0-9_./-]+)["']/g)) {
          references.push({from, value: match[1]});
        }
      }
    }
  }
  inspect(dist);
  let checked = 0;
  for (const {from, value} of references) {
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value)) continue;
    if (value.startsWith('#')) {
      assert.ok(byId(decodeURIComponent(value.slice(1))), `Missing anchor ${value} in ${from}`);
      continue;
    }
    assert.ok(!value.startsWith('/'), `Root-relative URL breaks project Pages: ${from}: ${value}`);
    const local = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    const absolute = path.resolve(dist, path.dirname(from), local);
    assert.ok(absolute.startsWith(dist + path.sep), `Resource escapes dist: ${from}: ${value}`);
    assert.ok(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `Missing resource ${from}: ${value}`);
    checked++;
  }
  assert.ok(checked >= 15, `Expected meaningful resource coverage, checked ${checked}`);
});

test('the current homepage has no manual film timeline or legacy film script', () => {
  for (const id of ['filmSeek', 'timecode', 'playPause', 'replay', 'filmCopy', 'filmCopyTitle']) {
    assert.equal(byId(id), undefined, `Legacy timeline UI returned: ${id}`);
  }
  assert.equal(all.some(node => 'data-time' in node.attrs), false);
  assert.equal(all.some(node => hasClass(node, 'film-controls') || hasClass(node, 'film-chapters')), false);
  const scripts = all.filter(node => node.tag === 'script').map(node => node.attrs.src);
  assert.ok(scripts.includes('hero-motion.js'));
  assert.ok(!scripts.includes('cinematic.js'));
});

test('optional sound starts visibly and semantically off', () => {
  const sound = byId('soundToggle');
  assert.ok(sound);
  assert.equal(sound.tag, 'button');
  assert.equal(sound.attrs.type, 'button');
  assert.equal(sound.attrs['aria-pressed'], 'false');
  assert.match(sound.attrs['aria-label'], /开启互动音效/);
  assert.match(text(sound), /音效：关/);
});

function blockAfter(css, marker) {
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `Missing CSS block: ${marker}`);
  const open = css.indexOf('{', start);
  let depth = 1;
  for (let i = open + 1; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  assert.fail(`Unclosed CSS block: ${marker}`);
}

test('mobile capabilities use five equal grid columns, not a hidden horizontal strip', () => {
  const mobile = blockAfter(frontCSS, '@media(max-width:800px)');
  const list = blockAfter(mobile, '.ability-list');
  const compact = list.replace(/\s+/g, '');
  assert.match(compact, /(?:^|;)display:grid(?:;|$)/);
  assert.match(compact, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(compact, /overflow:visible/);
  assert.match(blockAfter(mobile, '.ability-tab').replace(/\s+/g, ''), /min-width:0/);
  const styles = all.filter(node => node.tag === 'link' && node.attrs.rel === 'stylesheet').map(node => node.attrs.href);
  assert.ok(styles.indexOf('front-experience.css') > styles.indexOf('styles.css'));
  assert.ok(styles.indexOf('front-experience.css') > styles.indexOf('hero-motion.css'));
});
