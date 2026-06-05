/* =====================================================================
   Daffa Porto — Portfolio scroll engine

   - Smoothly interpolates between scene definitions based on the
     current scroll position.
   - Updates a small set of CSS custom properties on :root.
   - No external deps.
   ===================================================================== */

(function () {
  // -------------------------------------------------------------------
  // Scenes. Each one is a snapshot of the sky at that moment.
  // Order = scroll order. The engine lerps between consecutive entries.
  // -------------------------------------------------------------------
  const SCENES = [
    {
      // 1. Pre-dawn — Hero
      sky_top:  '#0E1A38',
      sky_mid:  '#2C3A60',
      horizon: '#5B4060',
      sea:      '#0B1428',
      sea_deep: '#06101E',
      sun:      '#FFCF6B',
      sun_glow: '#FFE3A8',
      sun_y:    115,   // vh — sun is below horizon, offscreen
      sun_size: 220,
      sun_op:   0.25,
      ink:      '#ECE6F2',
      ink_2:    '#A8B2C8',
      rule:     'rgba(236,230,242,0.18)',
    },
    {
      // 2. First light — santra.id
      sky_top:  '#2E4068',
      sky_mid:  '#7C5A80',
      horizon: '#FF8A6B',
      sea:      '#1F2F50',
      sea_deep: '#11203A',
      sun:      '#FFB87C',
      sun_glow: '#FFD8A8',
      sun_y:    78,    // peeking, only top half emerging
      sun_size: 260,
      sun_op:   0.85,
      ink:      '#F4ECDC',
      ink_2:    '#C8B8A8',
      rule:     'rgba(244,236,220,0.20)',
    },
    {
      // 3. Sunrise — RUNA
      sky_top:  '#5078A8',
      sky_mid:  '#D89488',
      horizon: '#FFB87C',
      sea:      '#3A5478',
      sea_deep: '#243A5A',
      sun:      '#FFCF6B',
      sun_glow: '#FFE3A8',
      sun_y:    52,    // at horizon — half visible, lifting
      sun_size: 280,
      sun_op:   1,
      ink:      '#1F2E48',
      ink_2:    '#4A5C7A',
      rule:     'rgba(31,46,72,0.18)',
    },
    {
      // 4. Bright morning — Vehicle Booking System
      sky_top:  '#9ED4EE',
      sky_mid:  '#D4EBF5',
      horizon: '#FFEAB8',
      sea:      '#4A7BA0',
      sea_deep: '#2F5A82',
      sun:      '#FFE3A0',
      sun_glow: '#FFF4D8',
      sun_y:    26,    // high in the sky
      sun_size: 210,
      sun_op:   1,
      ink:      '#0E2540',
      ink_2:    '#466B8E',
      rule:     'rgba(14,37,64,0.16)',
    },
    {
      // 5. Daylight — Closing / contact
      sky_top:  '#B6DEEF',
      sky_mid:  '#DCEEF7',
      horizon: '#F8E8C8',
      sea:      '#5A8AB0',
      sea_deep: '#3E6E92',
      sun:      '#FFF0BC',
      sun_glow: '#FFF9DC',
      sun_y:    16,    // zenith
      sun_size: 180,
      sun_op:   1,
      ink:      '#0E2540',
      ink_2:    '#466B8E',
      rule:     'rgba(14,37,64,0.16)',
    },
  ];

  // The scene labels shown bottom-right
  const SCENE_LABELS = [
    { time: '05:14', label: 'Pre-dawn' },
    { time: '05:47', label: 'First light' },
    { time: '06:12', label: 'Sunrise' },
    { time: '08:30', label: 'Bright morning' },
    { time: '09:42', label: 'Daylight' },
  ];

  // -------------------------------------------------------------------
  // Color utilities — sRGB linear-space interpolation for smoother blends.
  // -------------------------------------------------------------------
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex({ r, g, b }) {
    const c = (v) => v.toString(16).padStart(2, '0');
    return '#' + c(Math.round(r)) + c(Math.round(g)) + c(Math.round(b));
  }
  function srgbToLin(v) {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function linToSrgb(v) {
    const u = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, u * 255));
  }
  function lerpColor(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex({
      r: linToSrgb(srgbToLin(A.r) * (1 - t) + srgbToLin(B.r) * t),
      g: linToSrgb(srgbToLin(A.g) * (1 - t) + srgbToLin(B.g) * t),
      b: linToSrgb(srgbToLin(A.b) * (1 - t) + srgbToLin(B.b) * t),
    });
  }
  function lerpNum(a, b, t) { return a + (b - a) * t; }
  // parse "rgba(r,g,b,a)" so we can lerp the rule color smoothly too
  function parseRgba(s) {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(parseFloat);
    return { r, g, b, a };
  }
  function lerpRgba(a, b, t) {
    const A = parseRgba(a), B = parseRgba(b);
    if (!A || !B) return a;
    return `rgba(${lerpNum(A.r, B.r, t).toFixed(0)},${lerpNum(A.g, B.g, t).toFixed(0)},${lerpNum(A.b, B.b, t).toFixed(0)},${lerpNum(A.a, B.a, t).toFixed(3)})`;
  }

  // smoothstep for nicer ease around scene boundaries
  function smooth(t) { return t * t * (3 - 2 * t); }

  // -------------------------------------------------------------------
  // Engine
  // -------------------------------------------------------------------
  const root = document.documentElement;
  const scenes = Array.from(document.querySelectorAll('.scene'));
  const dots = Array.from(document.querySelectorAll('.nav .progress .dot'));
  const clockEl = document.querySelector('.timeofday .clock');
  const labelEl = document.querySelector('.timeofday .label');

  function getProgress() {
    // Map scroll position 0..1 over [0, SCENES.length-1]
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, window.scrollY / total));
  }

  function update() {
    const p = getProgress();
    const segs = SCENES.length - 1;
    const pos = p * segs;
    const i = Math.min(Math.floor(pos), segs - 1);
    const t = smooth(pos - i);

    const A = SCENES[i], B = SCENES[i + 1];

    root.style.setProperty('--sky-top',   lerpColor(A.sky_top, B.sky_top, t));
    root.style.setProperty('--sky-mid',   lerpColor(A.sky_mid, B.sky_mid, t));
    root.style.setProperty('--horizon',   lerpColor(A.horizon, B.horizon, t));
    root.style.setProperty('--sea',       lerpColor(A.sea, B.sea, t));
    root.style.setProperty('--sea-deep',  lerpColor(A.sea_deep, B.sea_deep, t));
    root.style.setProperty('--sun',       lerpColor(A.sun, B.sun, t));
    root.style.setProperty('--sun-glow',  lerpColor(A.sun_glow, B.sun_glow, t));
    root.style.setProperty('--sun-y',     lerpNum(A.sun_y, B.sun_y, t).toFixed(2) + 'vh');
    root.style.setProperty('--sun-size',  lerpNum(A.sun_size, B.sun_size, t).toFixed(0) + 'px');
    root.style.setProperty('--sun-op',    lerpNum(A.sun_op, B.sun_op, t).toFixed(3));
    root.style.setProperty('--scene-ink', lerpColor(A.ink, B.ink, t));
    root.style.setProperty('--scene-ink-2', lerpColor(A.ink_2, B.ink_2, t));
    root.style.setProperty('--scene-rule', lerpRgba(A.rule, B.rule, t));

    // Update progress dots and time-of-day readout based on which
    // scene is currently most visible (nearest center of viewport).
    const center = window.scrollY + window.innerHeight / 2;
    let activeIdx = 0;
    let bestD = Infinity;
    scenes.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const c = window.scrollY + r.top + r.height / 2;
      const d = Math.abs(c - center);
      if (d < bestD) { bestD = d; activeIdx = idx; }
    });
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === activeIdx);
      d.classList.toggle('passed', idx < activeIdx);
    });
    if (clockEl && labelEl && SCENE_LABELS[activeIdx]) {
      const interp = SCENE_LABELS[activeIdx];
      clockEl.textContent = interp.time;
      labelEl.textContent = interp.label;
    }
  }

  // throttle to requestAnimationFrame
  let pending = false;
  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      update();
      pending = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('scroll', onScroll, { passive: true });

  // Safety-net: in some environments (sandboxed iframes, programmatic
  // scrollTo, smooth-scrolling in mid-flight) the window 'scroll' event
  // can be dropped. Poll scroll position via rAF as a fallback —
  // virtually free since we no-op when nothing changed.
  let lastScrollY = -1;
  function tick() {
    try {
      if (window.scrollY !== lastScrollY) {
        lastScrollY = window.scrollY;
        update();
      }
    } catch (e) { /* noop */ }
  }
  // Belt-and-braces: rAF for smoothness when the tab is active,
  // setInterval as a hard fallback for sandboxed/background iframes
  // where rAF can be paused entirely.
  (function rafLoop() { tick(); requestAnimationFrame(rafLoop); })();
  setInterval(tick, 100);

  // dot clicks jump to a scene
  dots.forEach((d, idx) => {
    d.addEventListener('click', () => {
      const target = scenes[idx];
      if (target) {
        const y = window.scrollY + target.getBoundingClientRect().top - 1;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // Keyboard nav: ↓/↑/space/PgUp/PgDn jump scene-by-scene
  document.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      const c = currentSceneIdx();
      const next = Math.min(scenes.length - 1, c + 1);
      scrollToScene(next);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      const c = currentSceneIdx();
      const prev = Math.max(0, c - 1);
      scrollToScene(prev);
    }
  });
  function currentSceneIdx() {
    const center = window.scrollY + window.innerHeight / 2;
    let best = 0, bestD = Infinity;
    scenes.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const c = window.scrollY + r.top + r.height / 2;
      const d = Math.abs(c - center);
      if (d < bestD) { bestD = d; best = idx; }
    });
    return best;
  }
  function scrollToScene(idx) {
    const el = scenes[idx];
    if (!el) return;
    const y = window.scrollY + el.getBoundingClientRect().top - 1;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // first paint
  update();
})();
