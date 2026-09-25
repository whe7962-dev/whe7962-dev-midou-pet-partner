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

test('Pet Partner owns the page title, description and header/footer brand marks', () => {
  const title = all.find(node => node.tag === 'title');
  const description = all.find(node => node.tag === 'meta' && node.attrs.name === 'description');
  assert.match(text(title), /^宠拍档\s*[—–-]/);
  assert.match(description.attrs.content, /^宠拍档[，,]/);
  assert.doesNotMatch(text(title) + description.attrs.content, /miDou|咪Dou/i);
  const brand = all.find(node => node.tag === 'a' && hasClass(node, 'brand'));
  assert.equal(brand.attrs['aria-label'], '宠拍档首页');
  const marks = all.filter(node => hasClass(node, 'pet-wordmark'));
  assert.equal(marks.length, 2);
  marks.forEach(mark => assert.equal(text(mark), '宠拍档'));
});

test('the only primary heading leads with scientific pet care and Pet Partner', () => {
  const headings = all.filter(node => node.tag === 'h1');
  assert.equal(headings.length, 1);
  assert.equal(headings[0].attrs.id, 'heroTitle');
  assert.equal(text(headings[0]), '科学养宠，有宠拍档。');
  assert.ok(inside(headings[0], byId('home')));
});

test('the hero has its own decorative shard canvas behind the existing content', () => {
  const hero = byId('home');
  const field = byId('heroShardField');
  const copy = all.find(node => hasClass(node, 'hero-copy') && inside(node, hero));
  assert.ok(field, 'Missing hero shard background');
  assert.equal(field.parent, hero);
  assert.ok(hasClass(field, 'aero-shards'));
  assert.equal(field.attrs['aria-hidden'], 'true');
  assert.equal(field.attrs['data-ready'], 'false');
  assert.equal(all.filter(node => node.tag === 'canvas' && inside(node, field)).length, 1);
  assert.equal(all.some(node => inside(node, field) && (['button', 'a', 'input'].includes(node.tag) || 'tabindex' in node.attrs)), false);
  assert.ok(copy);
  assert.ok(hero.children.indexOf(field) < hero.children.indexOf(copy));
  assert.ok(inside(byId('heroTitle'), copy));
  assert.ok(inside(byId('heroMotionToggle'), hero));
  assert.equal(inside(byId('heroTitle'), field), false);
});

test('hero title and background controllers are loaded once with their required styles', () => {
  const scripts = all.filter(node => node.tag === 'script');
  for (const name of ['hero-background.js', 'hero-title.js']) {
    const matches = scripts.filter(node => node.attrs.src === name);
    assert.equal(matches.length, 1, `${name} must be referenced once`);
    if (name === 'hero-background.js') assert.equal(matches[0].attrs.type, 'module');
    else assert.ok('defer' in matches[0].attrs);
  }
  assert.ok(scripts.findIndex(node => node.attrs.src === 'app.js') < scripts.findIndex(node => node.attrs.src === 'hero-title.js'));
  const styles = all.filter(node => node.tag === 'link' && node.attrs.rel === 'stylesheet').map(node => node.attrs.href);
  assert.equal(styles.filter(name => name === 'hero-title.css').length, 1);
  assert.ok(styles.includes('aero-shards.css'));
  assert.ok(styles.indexOf('hero-title.css') > styles.indexOf('front-experience.css'));
});

test('hero shards do not replace the three-card background or create a separate demo screen', () => {
  const fields = all.filter(node => hasClass(node, 'aero-shards'));
  assert.deepEqual(fields.map(node => node.attrs.id).sort(), ['heroShardField', 'shardField']);
  assert.notEqual(byId('heroShardField'), byId('shardField'));
  assert.ok(inside(byId('heroShardField'), byId('home')));
  assert.ok(inside(byId('shardField'), byId('technology')));
  assert.equal(inside(byId('shardField'), byId('home')), false);
  const cards = all.filter(node => node.tag === 'article' && inside(node, byId('shardStage')));
  assert.equal(cards.length, 3);
  assert.ok(inside(byId('insightTitle'), byId('shardStage')));
  assert.equal(all.filter(node => hasClass(node, 'shard-stage')).length, 1);
  assert.equal(all.some(node => node.tag === 'section' && hasClass(node, 'technology')), false);
  assert.equal(all.some(node => hasClass(node, 'shard-toolbar') || hasClass(node, 'shard-flow-controls')), false);
});

test('IDs are unique and ARIA control/label references resolve', () => {
  const ids = all.filter(node => node.attrs.id).map(node => node.attrs.id);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${ids.filter((id, index) => ids.indexOf(id) !== index).join(', ')}`);
  for (const node of all) {
    for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
      if (!node.attrs[attribute]) continue;
      for (const id of node.attrs[attribute].trim().split(/\s+/)) {
        assert.ok(byId(id), `Unresolved ${attribute}="${id}" on ${node.tag}`);
      }
    }
  }
});

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

test('all seven lifestyle photos are distinct, outside diagnosis UI and captioned as non-clinical', () => {
  const moments = byId('moments');
  assert.ok(moments);
  const images = all.filter(node => node.tag === 'img' && inside(node, moments));
  assert.equal(images.length, 7);
  assert.deepEqual(images.map(node => node.attrs.src).sort(), [
    'assets/daily-comfort.png', 'assets/daily-curiosity.png', 'assets/daily-hideaway.png',
    'assets/daily-mealtime.png', 'assets/daily-play.png', 'assets/daily-sunshine.png', 'assets/daily-window.png'
  ]);
  const cards = all.filter(node => hasClass(node, 'moment-card') && inside(node, moments));
  assert.equal(cards.length, 7);
  cards.forEach(card => assert.equal(images.filter(image => inside(image, card)).length, 1));
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

test('gallery motion resources are referenced once and all seven photo explanations remain in HTML', () => {
  const script = all.filter(node => node.tag === 'script' && node.attrs.src === 'gallery-motion.js');
  assert.equal(script.length, 1);
  assert.ok('defer' in script[0].attrs);
  const styles = all.filter(node => node.tag === 'link' && node.attrs.rel === 'stylesheet').map(node => node.attrs.href);
  assert.equal(styles.filter(name => name === 'gallery-motion.css').length, 1);
  assert.ok(styles.indexOf('gallery-motion.css') > styles.indexOf('front-experience.css'));
  const cards = all.filter(node => hasClass(node, 'moment-card') && inside(node, byId('moments')));
  assert.equal(cards.length, 7);
  for (const card of cards) {
    const copies = all.filter(node => hasClass(node, 'moment-copy') && inside(node, card));
    assert.equal(copies.length, 1);
    const copy = copies[0];
    assert.equal(copy.attrs.hidden, undefined);
    assert.notEqual(copy.attrs['aria-hidden'], 'true');
    const heading = all.find(node => node.tag === 'h3' && inside(node, copy));
    const description = all.find(node => node.tag === 'p' && inside(node, copy));
    assert.ok(heading && text(heading).length > 3, 'A photograph lost its heading');
    assert.ok(description && text(description).length > 5, 'A photograph lost its explanation');
  }
});

test('shards share one content stage with three readable cards instead of a standalone demo', () => {
  const technology = byId('technology');
  const stage = byId('shardStage');
  const field = byId('shardField');
  assert.equal(technology.tag, 'section');
  assert.ok(hasClass(technology, 'insight-section'));
  assert.ok(hasClass(stage, 'shard-content-stage'));
  assert.ok(inside(stage, technology));
  assert.equal(field.parent, stage);
  assert.equal(field.attrs['aria-hidden'], 'true');
  const content = all.find(node => hasClass(node, 'insight-content') && node.parent === stage);
  assert.ok(content);
  assert.ok(stage.children.indexOf(field) < stage.children.indexOf(content));
  assert.ok(inside(byId('insightTitle'), content));
  const cards = all.filter(node => node.tag === 'article' && inside(node, content));
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(card => text(all.find(node => node.tag === 'h3' && inside(node, card)))),
    ['宠语翻译', '情绪识别', '多智能体管家']);
  assert.ok(inside(byId('shardPause'), stage));
  assert.ok(inside(byId('shardStatus'), stage));
  assert.equal(all.filter(node => hasClass(node, 'shard-stage')).length, 1);
  assert.equal(all.filter(node => node.tag === 'section' && hasClass(node, 'technology')).length, 0);
  assert.equal(all.some(node => hasClass(node, 'shard-toolbar') || hasClass(node, 'shard-flow-controls') ||
    'data-shard-flow' in node.attrs), false);
  const stageRule = blockAfter(frontCSS, '.shard-content-stage{').replace(/\s+/g, '');
  assert.match(stageRule, /(?:^|;)height:auto(?:;|$)/);
  assert.match(stageRule, /min-height:0/);
  assert.match(blockAfter(frontCSS, '.shard-content-stage .shard-field').replace(/\s+/g, ''), /z-index:0/);
  assert.match(blockAfter(frontCSS, '.insight-content{').replace(/\s+/g, ''), /z-index:1/);
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

test('all three partner CTAs are native safe links to the specified official entry', () => {
  const triggers = all.filter(node => hasClass(node, 'download-trigger'));
  assert.equal(triggers.length, 3);
  for (const trigger of triggers) {
    assert.equal(trigger.tag, 'a');
    assert.equal(new URL(trigger.attrs.href).href, 'https://www.foresightx.com.cn/');
    assert.equal(trigger.attrs.target, '_blank');
    const rel = (trigger.attrs.rel || '').split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
    assert.equal(trigger.attrs.onclick, undefined);
    assert.equal(trigger.attrs.download, undefined);
    assert.equal(trigger.attrs.role, undefined, 'native link semantics must be preserved');
    assert.notEqual(trigger.attrs['aria-haspopup'], 'dialog');
  }
  const header = all.find(node => node.tag === 'header' && hasClass(node, 'site-header'));
  assert.equal(triggers.filter(node => inside(node, header)).length, 1);
  assert.equal(triggers.filter(node => inside(node, byId('mobileMenu'))).length, 1);
  assert.equal(triggers.filter(node => inside(node, byId('download'))).length, 1);
});

test('the bottom partner CTA keeps its requested label and does not use a waiting-room dialog', () => {
  const trigger = all.find(node => hasClass(node, 'download-trigger') && inside(node, byId('download')));
  assert.ok(hasClass(trigger, 'large-button'));
  assert.equal(text(trigger).replace(/\s*↗\s*$/, ''), '遇见你的宠拍档');
  assert.equal(byId('downloadDialog'), undefined);
  assert.equal(all.some(node => hasClass(node, 'dialog-close') || hasClass(node, 'dialog-ok')), false);
  assert.doesNotMatch(html, /App 下载入口正在准备中|正式安装包与应用商店地址开放后/);
  assert.doesNotMatch(app, /downloadDialog|\.showModal\s*\(|\.dialog-close|\.dialog-ok/);
  assert.doesNotMatch(app, /querySelectorAll\(['"]\.download-trigger['"]\)/,
    'the former click handler must not intercept the native external links');
});

test('mobile navigation reverse tabbing reaches its final native link after the CTA conversion', () => {
  const controls = all.filter(node => ['a', 'button'].includes(node.tag) && inside(node, byId('mobileMenu')));
  assert.equal(controls.at(-1).tag, 'a');
  assert.ok(hasClass(controls.at(-1), 'download-trigger'));
  const handler = app.match(/menuButton\.addEventListener\('keydown',([^\n]+)/)?.[1];
  assert.ok(handler);
  assert.match(handler, /e\.key==='Tab'&&e\.shiftKey&&!menu\.hidden/);
  assert.match(handler, /menu\.querySelectorAll\('a,button'\)/);
  assert.match(handler, /\.at\(-1\)\?\.focus\(\)/);
  assert.doesNotMatch(handler, /menu\.querySelector\('button'\)/);
});

test('README distinguishes the official external entry from this static feature demonstration', () => {
  const readme = fs.readFileSync(path.join(dist, '../README.md'), 'utf8');
  assert.match(readme, /https:\/\/www\.foresightx\.com\.cn/);
  assert.match(readme, /没有连接问诊后端/);
  assert.match(readme, /不直接提供实际安装包/);
  assert.match(readme, /不经过本页弹窗/);
  assert.doesNotMatch(readme, /原生下载信息对话框|下载按钮会展示明确的待开放提示/);
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
