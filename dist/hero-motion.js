/* White-cat product hero: automatic, gently pointer-responsive 2.5D motion.
   One portrait remains visible throughout; this is not a 360-degree 3D model. */
(() => {
  'use strict';

  const stage = document.getElementById('cinemaStage');
  const camera = document.getElementById('stageCamera');
  const holder = document.getElementById('actors');
  const loading = document.getElementById('filmLoading');
  const toggle = document.getElementById('heroMotionToggle');
  if (!stage || !camera || !holder || !toggle) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smootherstep = value => {
    const p = clamp(value, 0, 1);
    return p * p * p * (p * (p * 6 - 15) + 10);
  };

  const actor = document.createElement('div');
  actor.className = 'actor hero-actor';
  actor.setAttribute('aria-hidden', 'true');
  const shadow = document.createElement('div');
  shadow.className = 'floor-shadow';
  const body = document.createElement('div');
  body.className = 'actor-body';
  const skin = document.createElement('div');
  skin.className = 'cat-skin front';
  skin.style.opacity = '1';
  const assetFallback = document.createElement('p');
  assetFallback.className = 'hero-asset-fallback';
  assetFallback.textContent = '咪Dou 暂时没能露面，先看看下面的五大能力。';
  assetFallback.hidden = true;
  stage.append(assetFallback);
  body.append(skin);
  actor.append(shadow, body);
  holder.replaceChildren(actor);
  actor.style.transform = 'translate3d(-50%,-50%,0)';
  body.style.transformOrigin = '50% 50%';
  camera.style.transform = 'none';

  let ready = false;
  let failed = false;
  let disposed = false;
  let userPaused = false;
  let visible = true;
  let elapsed = 0;
  let previousStamp = null;
  let raf = 0;
  let size = 1;
  let introNotified = false;
  let bounds = { left: 0, top: 0, width: 1, height: 1 };
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const canAnimate = () => ready && !failed && !disposed && !userPaused && !reduced.matches;
  const canRun = () => canAnimate() && visible && !document.hidden;

  function syncState() {
    const motion = failed ? 'error' : !ready ? 'loading' : reduced.matches ? 'reduced' : userPaused ? 'paused' : 'playing';
    stage.dataset.motion = motion;
    if (failed) stage.setAttribute('aria-label', '咪Dou 图片暂未载入，可继续浏览下方五大能力。');
    stage.setAttribute('aria-busy', String(!ready && !failed));
    toggle.disabled = !ready || failed || reduced.matches;
    toggle.setAttribute('aria-pressed', String(userPaused || reduced.matches || failed));
    toggle.classList.toggle('paused', userPaused || reduced.matches || failed);
    const label = failed ? '图片暂未载入' : !ready ? '正在加载' : reduced.matches ? '已减少动态' : userPaused ? '继续动效' : '暂停动效';
    toggle.textContent = label;
    toggle.setAttribute('aria-label', reduced.matches && !failed ? '遵循减少动态设置，首屏静态展示' : label);
    toggle.title = failed ? '图片暂未载入，其他内容可正常使用' : reduced.matches ? '已遵循系统减少动态效果偏好' : '同时控制白猫、标题与首屏背景动态';
  }

  function render() {
    const staticScene = reduced.matches || failed;
    const intro = staticScene ? 1 : smootherstep(elapsed / 3);
    const cycle = (Math.max(0, elapsed - 3) % 30) / 30 * Math.PI * 2;
    const settled = intro;
    const yaw = staticScene ? 0 : (Math.sin(cycle) * 7 + pointer.x * 8) * settled;
    const pitch = staticScene ? 0 : (Math.sin(cycle + .45) * 1.2 - pointer.y * 3) * settled;
    const roll = staticScene ? 0 : (Math.sin(cycle * 2) * .65 + pointer.x * .75) * settled;
    const lift = staticScene ? 0 : Math.sin(cycle * 2) * 8 * settled;
    const driftX = staticScene ? 0 : Math.sin(cycle) * 12 * settled;
    const breath = staticScene ? 1 : 1 + Math.sin(cycle) * .006 * settled;
    const scale = Math.exp(Math.log(5.2) * (1 - intro)) * breath;
    // Move the focal point continuously from crown fur (11% height) to the full body.
    const focusY = .11 + .39 * intro;
    const y = (.5 - focusY) * size * scale - lift;
    body.style.transform = `perspective(1200px) translate3d(${driftX.toFixed(3)}px,${y.toFixed(3)}px,0) rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
    actor.style.opacity = ready && !failed ? '1' : '0';
    shadow.style.opacity = String(.12 * intro);
    shadow.style.transform = `translate3d(${(-yaw * .28).toFixed(3)}px,0,0) scale(${(1 - lift * .003).toFixed(5)},1)`;
    stage.dataset.heroTime = elapsed.toFixed(3);
    stage.dataset.heroYaw = yaw.toFixed(3);
    stage.dataset.heroScale = scale.toFixed(5);
    stage.dataset.heroDrift = driftX.toFixed(3);
    stage.dataset.heroLift = lift.toFixed(3);
    if (ready && elapsed >= 3 && !introNotified) {
      introNotified = true;
      stage.dispatchEvent(new Event('hero-settled'));
    }
  }

  function measure() {
    bounds = stage.getBoundingClientRect();
    size = Math.max(1, actor.offsetWidth || Math.min(bounds.width * .65, bounds.height * .8));
    render();
  }

  function stopFrames() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    previousStamp = null;
  }

  function resetPointer() {
    pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
  }

  function tick(stamp) {
    raf = 0;
    if (!canRun()) { previousStamp = null; return; }
    const dt = previousStamp === null ? 0 : clamp((stamp - previousStamp) / 1000, 0, .08);
    previousStamp = stamp;
    elapsed += dt;
    // Deliberately slow response: a full pointer jump cannot snap the portrait around.
    const follow = 1 - Math.exp(-dt * 2.1);
    pointer.x += clamp((pointer.targetX - pointer.x) * follow, -.65 * dt, .65 * dt);
    pointer.y += clamp((pointer.targetY - pointer.y) * follow, -.65 * dt, .65 * dt);
    render();
    raf = requestAnimationFrame(tick);
  }

  function schedule() {
    if (!canRun() || raf) return;
    previousStamp = null;
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (!ready || failed || disposed) return false;
    userPaused = true;
    stopFrames();
    syncState();
    return true;
  }

  function resume() {
    if (!ready || failed || disposed || reduced.matches) return false;
    userPaused = false;
    syncState();
    schedule();
    return true;
  }

  function onToggle() { if (userPaused) resume(); else pause(); }
  function onPointerMove(event) {
    if (!canRun() || !finePointer.matches || event.pointerType !== 'mouse') return;
    bounds = stage.getBoundingClientRect();
    pointer.targetX = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1, -1, 1);
    pointer.targetY = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1, -1, 1);
  }
  function onPointerLeave() { pointer.targetX = pointer.targetY = 0; }
  function onPointerPreference() { resetPointer(); if (ready) render(); }
  function onVisibility() { stopFrames(); onPointerLeave(); if (!document.hidden) schedule(); }
  function onReducedMotion() {
    stopFrames();
    resetPointer();
    // A preference change never strands the visitor in a giant macro close-up.
    if (reduced.matches) elapsed = Math.max(elapsed, 3);
    syncState();
    render();
    schedule();
  }

  toggle.addEventListener('click', onToggle);
  stage.addEventListener('pointermove', onPointerMove, { passive: true });
  stage.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onReducedMotion);
  finePointer.addEventListener('change', onPointerPreference);
  const intersection = new IntersectionObserver(entries => {
    const entry = entries[0];
    visible = !!entry?.isIntersecting && (entry.intersectionRatio === undefined || entry.intersectionRatio >= .05);
    stopFrames();
    if (visible) schedule(); else onPointerLeave();
  }, { threshold: [0, .05] });
  intersection.observe(stage);
  const resize = new ResizeObserver(measure);
  resize.observe(stage);

  const image = new Image();
  let assetTimer = 0;
  let assetSettled = false;
  function assetFinished(ok) {
    if (assetSettled || disposed) return;
    assetSettled = true;
    if (assetTimer) window.clearTimeout(assetTimer);
    assetTimer = 0;
    image.onload = image.onerror = null;
    ready = ok;
    failed = !ok;
    assetFallback.hidden = ok;
    if (reduced.matches || failed) elapsed = 3;
    if (loading) loading.hidden = true;
    measure();
    syncState();
    schedule();
  }
  image.onload = () => assetFinished(true);
  image.onerror = () => assetFinished(false);
  assetTimer = window.setTimeout(() => assetFinished(false), 18000);
  syncState();
  measure();
  image.src = 'assets/midou-front.png';

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopFrames();
    if (assetTimer) window.clearTimeout(assetTimer);
    image.onload = image.onerror = null;
    toggle.removeEventListener('click', onToggle);
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', onReducedMotion);
    finePointer.removeEventListener('change', onPointerPreference);
    intersection.disconnect();
    resize.disconnect();
    assetFallback.remove();
    toggle.disabled = true;
    stage.dataset.motion = 'disposed';
  }

  // Pause/resume only: the public API deliberately has no timeline or seek controls.
  window.midouHeroMotion = Object.freeze({ pause, resume, dispose });
})();
