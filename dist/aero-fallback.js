// A small, dependency-free interpretation for browsers without WebGPU.
// The illustration is decorative: all controls and content remain real HTML.
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const flows = ['stream', 'vortex', 'ribbon'];
const controlSelector = 'a,button,input,select,textarea,[role="button"],[contenteditable="true"]';

function randomSequence(seed = 271828) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function tint(hex, white, alpha) {
  const value = /^#[\da-f]{6}$/i.test(hex) ? hex.slice(1) : '93bbce';
  const channels = [0, 2, 4].map(offset => Math.round(mix(parseInt(value.slice(offset, offset + 2), 16), 255, white)));
  return `rgba(${channels.join(',')},${alpha})`;
}

export function mountFallback(root, initialOptions = {}) {
  const canvas = root.querySelector('canvas.aero-shards__canvas');
  const stage = root.parentElement || root;
  let options = {
    backgroundColor: '#FFFFFF', shardColor: '#93BBCE', accentColor: '#83B9D2',
    flow: 'stream', paused: false, speed: .55, spin: .65, shardSize: 1.15,
    interaction: 'repel', interactionRadius: 1.5, interactionStrength: .5,
    rippleIntensity: .8, holdToGather: true, transitionDuration: 1.2,
    ...initialOptions
  };
  let context;
  try { context = canvas?.getContext('2d', {alpha: false}); } catch { /* Static CSS remains visible. */ }
  if (!context) {
    options.onError?.(new Error('Canvas 2D is unavailable.'));
    return {setOptions() {}, dispose() {}};
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = [];
  const pointer = {x: 0, y: 0, active: false, down: false, id: null, startX: 0, startY: 0, started: 0, touch: false, moved: false, gathering: false};
  let width = 1, height = 1, ratio = 1, particles = [], palette;
  let disposed = false, failed = false, visible = true, frame = 0, lastTick = null, elapsed = 0;
  let ripple = null, gather = 0;
  let weights = flows.map(flow => Number(flow === options.flow));
  if (!weights.some(Boolean)) weights = [1, 0, 0];

  function listen(target, event, callback, settings = {passive: true}) {
    target.addEventListener(event, callback, settings);
    listeners.push(() => target.removeEventListener(event, callback, settings));
  }
  function moving() { return !disposed && !failed && !options.paused && !reduced.matches && !document.hidden && visible; }
  function clearPointer() {
    pointer.active = pointer.down = pointer.gathering = false;
    pointer.id = null;
    pointer.moved = true;
  }
  function resetInteraction() { clearPointer(); ripple = null; gather = 0; }
  function makePalette() {
    palette = {
      pearl: tint(options.shardColor, .88, .96), face: tint(options.shardColor, .52, .88),
      edge: tint(options.accentColor, .1, .47), rim: tint(options.accentColor, .66, .9),
      glint: 'rgba(255,255,255,.94)', atmosphere: tint(options.accentColor, .6, .10),
      atmosphereClear: tint(options.accentColor, 1, 0), shadow: tint(options.shardColor, .05, .07)
    };
  }
  function populate() {
    const random = randomSequence();
    const count = width <= 800 ? 150 : 400;
    particles = Array.from({length: count}, (_, index) => ({
      index, u: random(), cross: (random() + random() + random() - 1.5) / 1.5,
      depth: random() * 2 - 1, size: .55 + random() * .8, phase: random() * TAU,
      tilt: random() * TAU, slender: .38 + random() * .45
    }));
  }
  function position(particle, time) {
    const u = (particle.u + time * .014 * clamp(Number(options.speed) || 0, 0, 3)) % 1;
    const angle = u * TAU;
    const cross = particle.cross;
    const depth = particle.depth;
    const stream = [
      width * (.035 + u * .93),
      height * (.5 - Math.sin(u * Math.PI * 1.3 - .4) * .15 + cross * .26),
      Math.sin(angle + particle.phase) * .32 + depth * .68
    ];
    const vortex = [
      width * (.5 + Math.cos(angle) * (.32 + cross * .09)),
      height * (.47 + Math.sin(angle) * (.25 + cross * .11)),
      Math.sin(angle) * .6 + depth * .4
    ];
    const ribbon = [
      width * (.04 + u * .92),
      height * (.49 + Math.sin(angle * 1.2 - .75) * .17 + cross * .13 * Math.cos(angle)),
      Math.cos(angle * 1.2) * .65 + depth * .35
    ];
    return stream.map((value, index) => value * weights[0] + vortex[index] * weights[1] + ribbon[index] * weights[2]);
  }
  function polygon(points, color) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index++) context.lineTo(points[index][0], points[index][1]);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }
  function render() {
    if (disposed || failed) return;
    try {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, width, height);
      const atmosphere = context.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, width * .5);
      atmosphere.addColorStop(0, palette.atmosphere);
      atmosphere.addColorStop(1, palette.atmosphereClear);
      context.fillStyle = atmosphere;
      context.fillRect(0, 0, width, height);
      const interactive = moving();
      const radius = Math.min(width, height) * .22 * clamp(Number(options.interactionRadius) || 1.5, .2, 3);
      const strength = clamp(Number(options.interactionStrength) || 0, 0, 2);
      const items = particles.map(particle => ({particle, position: position(particle, elapsed)})).sort((a, b) => a.position[2] - b.position[2]);
      for (const {particle, position: point} of items) {
        let [x, y, z] = point;
        if (interactive && pointer.active) {
          const dx = x - pointer.x, dy = y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const influence = Math.pow(clamp(1 - distance / radius, 0, 1), 2);
          const force = options.interaction === 'repel' ? influence * radius * .36 * strength * (1 - gather) : 0;
          x += dx / distance * force;
          y += dy / distance * force;
          const orbit = particle.u * TAU + elapsed * .22;
          x = mix(x, pointer.x + Math.cos(orbit) * radius * (.14 + particle.size * .11), gather * .76);
          y = mix(y, pointer.y + Math.sin(orbit) * radius * (.09 + particle.size * .07), gather * .76);
        }
        if (interactive && ripple) {
          const age = elapsed - ripple.time;
          const dx = x - ripple.x, dy = y - ripple.y, distance = Math.max(1, Math.hypot(dx, dy));
          const ring = age * Math.max(width, height) * .55;
          const force = Math.exp(-Math.pow((distance - ring) / 55, 2)) * (1 - age / 1.5) * 24 * clamp(Number(options.rippleIntensity) || 0, 0, 2);
          x += dx / distance * force;
          y += dy / distance * force;
        }
        const perspective = .72 + (z + 1) * .25;
        const size = (width <= 800 ? 7 : 9) * particle.size * perspective * clamp(Number(options.shardSize) || 1, .35, 3);
        const rotation = particle.tilt + Math.sin(elapsed * .28 + particle.phase) * .55 * clamp(Number(options.spin) || 0, 0, 3);
        const cosine = Math.cos(rotation), sine = Math.sin(rotation);
        const shape = [[-size, -size * particle.slender * .25], [size * .5, -size * particle.slender], [size, size * particle.slender * .4], [-size * .3, size * particle.slender], [size * .1, 0]];
        const projected = shape.map(([px, py]) => [x + px * cosine - py * sine, y + px * sine + py * cosine]);
        const [a, b, c, d, center] = projected;
        if (z > .38) polygon(projected.slice(0, 4).map(([px, py]) => [px + 2, py + 4]), palette.shadow);
        polygon([a, b, center], palette.pearl);
        polygon([b, c, center], palette.face);
        polygon([c, d, center], palette.edge);
        polygon([d, a, center], palette.rim);
        context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.lineTo(center[0], center[1]);
        context.strokeStyle = palette.glint; context.lineWidth = .6; context.stroke();
      }
      root.dataset.ready = 'true';
      root.dataset.renderer = 'canvas2d';
    } catch (error) {
      failed = true;
      stop();
      root.dataset.ready = 'false';
      options.onError?.(error);
    }
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTick = null;
  }
  function tick(now) {
    frame = 0;
    if (!moving()) return;
    if (lastTick === null) lastTick = now - 1000 / 30;
    const difference = now - lastTick;
    if (difference >= 1000 / 30 - .5) {
      const delta = Math.min(difference / 1000, .1);
      elapsed += delta;
      lastTick = now;
      const target = flows.includes(options.flow) ? options.flow : 'stream';
      const blend = 1 - Math.exp(-delta * 4 / Math.max(.1, Number(options.transitionDuration) || 1.2));
      weights = weights.map((weight, index) => mix(weight, Number(flows[index] === target), blend));
      pointer.gathering = pointer.down && !pointer.moved && options.holdToGather && now - pointer.started > 230;
      gather = mix(gather, Number(pointer.gathering), 1 - Math.exp(-delta * 6));
      if (ripple && elapsed - ripple.time > 1.5) ripple = null;
      render();
    }
    if (moving()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    if (!moving()) resetInteraction();
    if (moving()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed) return;
    const bounds = root.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width));
    const nextHeight = Math.max(1, Math.round(bounds.height));
    const repopulate = !particles.length || (nextWidth <= 800) !== (width <= 800);
    width = nextWidth; height = nextHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (repopulate) populate();
    render();
  }
  function blocked(event) { return Boolean(event.target?.closest?.(controlSelector)); }
  function coordinates(event) {
    const bounds = root.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top;
  }
  function down(event) {
    if (!moving() || blocked(event) || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    coordinates(event);
    pointer.active = pointer.down = true; pointer.moved = false; pointer.gathering = false;
    pointer.id = event.pointerId; pointer.touch = event.pointerType === 'touch';
    pointer.startX = event.clientX; pointer.startY = event.clientY; pointer.started = performance.now();
  }
  function move(event) {
    if (!moving() || blocked(event)) { clearPointer(); return; }
    if (pointer.down && event.pointerId !== pointer.id) return;
    if (event.pointerType === 'touch' && !pointer.down) return;
    if (pointer.down && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 10) {
      pointer.moved = true;
      if (pointer.touch) { clearPointer(); return; }
    }
    coordinates(event); pointer.active = true;
  }
  function up(event) {
    if (!pointer.down || event.pointerId !== pointer.id) return;
    if (moving() && !pointer.moved && !pointer.gathering && !blocked(event)) ripple = {x: pointer.x, y: pointer.y, time: elapsed};
    pointer.down = pointer.gathering = false; pointer.id = null;
    if (pointer.touch) pointer.active = false;
  }
  function leave() { clearPointer(); }
  function visibilityChange() { sync(); }
  function preferenceChange() {
    resetInteraction();
    weights = flows.map(flow => Number(flow === options.flow));
    sync(); render();
  }
  listen(stage, 'pointerdown', down);
  listen(stage, 'pointermove', move);
  listen(stage, 'pointerleave', leave);
  listen(window, 'pointerup', up);
  listen(window, 'pointercancel', leave);
  listen(window, 'blur', leave);
  listen(window, 'scroll', leave, {passive: true, capture: true});
  listen(document, 'visibilitychange', visibilityChange);
  listen(reduced, 'change', preferenceChange);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (resizeObserver) resizeObserver.observe(root); else listen(window, 'resize', resize);
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }) : null;
  intersectionObserver?.observe(stage);
  makePalette(); resize(); sync();
  return {
    setOptions(partial = {}) {
      if (disposed) return;
      options = {...options, ...partial};
      makePalette();
      if (options.paused || reduced.matches) weights = flows.map(flow => Number(flow === options.flow));
      sync(); render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop(); resetInteraction();
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      listeners.forEach(remove => remove());
      root.dataset.ready = 'false';
    }
  };
}
