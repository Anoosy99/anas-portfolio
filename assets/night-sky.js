/* Night sky: a few faint stars at dusk (top of the page), more appear as you scroll into night.
   One fixed canvas, ~160 stars, slow subtle twinkle on a few; no twinkle with reduced motion. */
(function(){
  const canvas = document.createElement('canvas');
  canvas.id = 'night-sky';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COUNT = 160, FIRST = 5;
  let w = 0, h = 0, dpr = 1, stars = [], progress = 0, raf = 0;

  function makeStars(){
    stars = [];
    for (let i = 0; i < COUNT; i++){
      const big = Math.random() < .06;
      const tint = Math.random();
      stars.push({
        x: Math.random(), y: Math.random(),
        r: big ? 1 + Math.random() * .55 : .35 + Math.random() * .5,
        a: big ? .75 + Math.random() * .25 : .3 + Math.random() * .45,
        // when this star appears: the first few are out at dusk, the rest fade in through the night
        t: i < FIRST ? 0 : Math.pow(Math.random(), .85),
        c: tint < .72 ? '236,242,255' : tint < .92 ? '196,214,255' : '255,232,204',
        tw: !still && Math.random() < .16, ph: Math.random() * Math.PI * 2, sp: .35 + Math.random() * .6,
        glow: big
      });
    }
  }
  function resize(){
    // the canvas is 100lvh tall (CSS), so the phone's sliding address bar never changes its size
    const nw = canvas.clientWidth || window.innerWidth, nh = canvas.clientHeight || window.innerHeight;
    if (nw === w && nh === h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = nw; h = nh;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }
  function readScroll(){
    const max = Math.max(1, document.documentElement.scrollHeight - h);
    progress = Math.min(1, Math.max(0, window.scrollY / max));
  }
  const smooth = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  function draw(now){
    ctx.clearRect(0, 0, w, h);
    const night = progress * 1.08;
    for (const s of stars){
      let a = s.a * smooth(s.t - .1, s.t + .04, night);
      if (s.t === 0) a = s.a * (.55 + .45 * Math.min(1, progress * 3));
      if (a < .01) continue;
      if (s.tw) a *= .72 + .28 * Math.sin(now / 1000 * s.sp + s.ph);
      const x = s.x * w, y = s.y * h;
      if (s.glow){
        ctx.fillStyle = 'rgba(' + s.c + ',' + (a * .12).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, s.r * 3.2, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
    }
  }
  function loop(now){ draw(now); raf = requestAnimationFrame(loop); }

  makeStars(); readScroll(); resize();
  window.addEventListener('resize', () => { readScroll(); resize(); });
  window.addEventListener('scroll', () => { readScroll(); if (still) draw(0); }, { passive: true });
  if (!still) raf = requestAnimationFrame(loop);
})();
