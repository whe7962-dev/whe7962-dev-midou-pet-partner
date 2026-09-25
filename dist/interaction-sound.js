// Optional, gesture-only audio. Nothing is fetched, and every page starts muted.
(() => {
  'use strict';
  const toggle = document.getElementById('soundToggle');
  if (!toggle) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const controls = 'button,a,input,select,textarea,[role="button"],[contenteditable]';
  const voices = new Set();
  let context = null, enabled = false, disposed = false, unavailable = !AudioContextClass;
  let focused = typeof document.hasFocus !== 'function' || document.hasFocus();
  let lastSound = -Infinity, generation = 0;

  function updateToggle() {
    toggle.disabled = unavailable;
    toggle.textContent = unavailable ? '音效：不支持' : enabled ? '音效：开' : '音效：关';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', unavailable ? '当前浏览器不支持互动音效' : enabled ? '关闭互动音效' : '开启互动音效');
    toggle.title = unavailable ? '互动音效不可用，页面其他功能不受影响' : '仅关键操作播放轻柔短音，默认关闭';
  }
  function release(voice) {
    if (!voices.has(voice)) return;
    voices.delete(voice);
    voice.oscillator.onended = null;
    try { voice.oscillator.disconnect(); } catch { /* Already released. */ }
    try { voice.gain.disconnect(); } catch { /* Already released. */ }
  }
  function stopVoices() {
    for (const voice of [...voices]) {
      try { voice.gain.gain.cancelScheduledValues(context.currentTime); voice.gain.gain.setValueAtTime(0, context.currentTime); } catch { /* Context may have closed. */ }
      try { voice.oscillator.stop(); } catch { /* An ended oscillator cannot stop twice. */ }
      release(voice);
    }
  }
  function closeContext() {
    stopVoices();
    const closing = context;
    context = null;
    if (closing && closing.state !== 'closed') {
      try { Promise.resolve(closing.close()).catch(() => {}); } catch { /* Optional audio never blocks the page. */ }
    }
  }
  function fail() {
    unavailable = true; enabled = false; generation++;
    closeContext(); updateToggle();
  }
  function canPlay() {
    return enabled && !disposed && !unavailable && focused && !document.hidden;
  }
  function note(frequency, duration, volume, delay = 0) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const voice = {oscillator, gain};
    voices.add(voice);
    const start = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .94, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .009);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    gain.gain.setValueAtTime(0, start + duration + .006);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => release(voice);
    oscillator.start(start); oscillator.stop(start + duration + .01);
  }
  async function play(kind) {
    if (!canPlay() || !context) return;
    const now = performance.now();
    if (now - lastSound < 90) return;
    lastSound = now;
    const token = generation;
    try {
      if (context.state === 'suspended') await context.resume();
      if (token !== generation || !canPlay() || !context || context.state === 'closed') return;
      stopVoices();
      if (kind === 'ripple') note(330, .15, .018);
      else if (kind === 'confirm' || kind === 'download') {
        note(440, .11, .014);
        note(660, .135, .009, .025);
      } else note(kind === 'hotspot' ? 523.25 : 392, .065, .018);
    } catch {
      // A pending resume may reject after the user has already muted or left.
      if (token === generation && !disposed) fail();
    }
  }
  function toggleSound() {
    if (disposed || unavailable) return;
    generation++;
    if (enabled) {
      enabled = false;
      stopVoices();
      updateToggle();
      // Suspending also saves resources; only a later explicit click resumes it.
      try { Promise.resolve(context?.suspend()).catch(() => {}); } catch { /* Nonessential. */ }
      return;
    }
    try {
      if (!context || context.state === 'closed') context = new AudioContextClass({latencyHint: 'interactive'});
      enabled = true;
      lastSound = -Infinity;
      updateToggle();
      void play('confirm');
    } catch { fail(); }
  }
  function click(event) {
    // Scripted carousel clicks must never turn into unsolicited audio.
    if (disposed || event.defaultPrevented || event.isTrusted === false) return;
    const target = event.target?.closest ? event.target : event.target?.parentElement;
    if (!target) return;
    if (target.closest('#soundToggle')) { toggleSound(); return; }
    if (!canPlay()) return;
    if (target.closest('.download-trigger')) void play('download');
    else if (target.closest('.hotspot')) void play('hotspot');
    else if (target.closest('.ability-tab,[data-shard-flow],[data-feature-jump]')) void play('click');
    else if (target.closest('#shardStage') && !target.closest(controls)) void play('ripple');
  }
  function quiet() {
    generation++;
    stopVoices();
    try { Promise.resolve(context?.suspend()).catch(() => {}); } catch { /* Nonessential. */ }
  }
  function blur() { focused = false; quiet(); }
  function focus() { focused = true; }
  function visibility() { if (document.hidden) quiet(); }
  function pagehide(event) {
    quiet();
    if (event.persisted) return;
    disposed = true; enabled = false;
    document.removeEventListener('click', click);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', focus);
    window.removeEventListener('pagehide', pagehide);
    closeContext();
  }
  document.addEventListener('click', click);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  window.addEventListener('pagehide', pagehide);
  updateToggle();
})();
