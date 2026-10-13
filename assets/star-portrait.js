/* Star portrait: redraws the hero photo as star particles.
   Bright areas and face outlines become particles; dark background becomes empty sky.
   Particles gather into the face on load, a few twinkle, and drift away from the pointer. */
(function(){
  const img = document.querySelector('.portrait-image');
  if (!img) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'star-portrait';
  canvas.setAttribute('aria-hidden', 'true');
  img.insertAdjacentElement('afterend', canvas);
  const ctx = canvas.getContext('2d');
  let parts = [], box = null, t0 = 0, raf = 0, visible = true;
  const pointer = { x: -1e4, y: -1e4 };

  const STAR = [214, 228, 255], WARM = [255, 238, 214], GOLD = [232, 189, 118];
  const mix = (a, b, k) => a + (b - a) * k;

  function build(){
    // layout size (ignores the photo's reveal transform), placed exactly over the photo
    const r = { width: img.offsetWidth, height: img.offsetHeight };
    if (!r.width || !img.naturalWidth) return;
    Object.assign(canvas.style, { left: img.offsetLeft + 'px', top: img.offsetTop + 'px', width: r.width + 'px', height: r.height + 'px' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // where object-fit:contain + bottom puts the photo inside the element
    const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    box = { w: r.width, h: r.height, x: (r.width - dw) / 2, y: r.height - dh, dw, dh };

    const gap = r.width < 420 ? 3.6 : 4.2;
    const cols = Math.round(dw / gap), rows = Math.round(dh / gap);
    const off = document.createElement('canvas'); off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, 0, 0, cols, rows);
    const d = o.getImageData(0, 0, cols, rows).data;
    const lum = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++){
      const a = d[i * 4 + 3] / 255;
      lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255 * a;
    }
    const L = (x, y) => lum[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];

    parts = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++){
      const i = y * cols + x, l = lum[i];
      // Sobel edge strength: keeps the outlines of face, glasses, hair and shirt
      const gx = L(x+1,y-1) + 2*L(x+1,y) + L(x+1,y+1) - L(x-1,y-1) - 2*L(x-1,y) - L(x-1,y+1);
      const gy = L(x-1,y+1) + 2*L(x,y+1) + L(x+1,y+1) - L(x-1,y-1) - 2*L(x,y-1) - L(x+1,y-1);
      const edge = Math.min(1, Math.hypot(gx, gy) * 1.6);
      // contrast curve: bright skin and highlights become stars, the dark backdrop stays empty sky
      const v = Math.min(1, Math.pow(l * 1.6, 1.5) + edge * .25 * Math.min(1, l * 6));
      if (v < .2) continue;
      const R = d[i*4], G = d[i*4+1], B = d[i*4+2];
      const sat = (Math.max(R, G, B) - Math.min(R, G, B)) / Math.max(1, Math.max(R, G, B));
      const warm = R > B ? Math.min(1, sat * 1.1) : 0;
      const base = [mix(STAR[0], WARM[0], v), mix(STAR[1], WARM[1], v), mix(STAR[2], WARM[2], v)];
      const k = warm * .55;
      const c = [mix(base[0], GOLD[0], k) | 0, mix(base[1], GOLD[1], k) | 0, mix(base[2], GOLD[2], k) | 0];
      const tx = box.x + (x + .5) * (dw / cols) + (Math.random() - .5) * gap * .3;
      const ty = box.y + (y + .5) * (dh / rows) + (Math.random() - .5) * gap * .3;
      parts.push({
        tx, ty, x: tx, y: ty,
        sx: Math.random() * r.width, sy: Math.random() * r.height * .9,
        r: gap * (.08 + .36 * v), a: .3 + .7 * v, c: 'rgb(' + c.join(',') + ')',
        tw: Math.random() < .07, ph: Math.random() * 6.283, delay: Math.random() * .5,
        vx: 0, vy: 0
      });
    }
    t0 = performance.now();
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now){
    if (!box) return;
    ctx.clearRect(0, 0, box.w, box.h);
    const t = (now - t0) / 1000;
    for (const p of parts){
      let x, y;
      if (still){ x = p.tx; y = p.ty; }
      else {
        const k = ease(Math.min(1, Math.max(0, (t - p.delay) / 1.6)));
        x = p.sx + (p.tx - p.sx) * k; y = p.sy + (p.ty - p.sy) * k;
        if (k === 1){
          // gentle push away from the pointer, then spring back home
          const dx = p.x - pointer.x, dy = p.y - pointer.y, dist = Math.hypot(dx, dy);
          if (dist < 70){ const f = (1 - dist / 70) * 2.2; p.vx += dx / (dist || 1) * f; p.vy += dy / (dist || 1) * f; }
          p.vx += (p.tx - p.x) * .08; p.vy += (p.ty - p.y) * .08; p.vx *= .82; p.vy *= .82;
          p.x += p.vx; p.y += p.vy; x = p.x; y = p.y;
        } else { p.x = x; p.y = y; }
      }
      let a = p.a;
      if (p.tw && !still) a *= .55 + .45 * Math.sin(now / 900 + p.ph);
      ctx.globalAlpha = a; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!still && visible) raf = requestAnimationFrame(frame);
  }
  function start(){
    build(); cancelAnimationFrame(raf);
    still ? frame(performance.now()) : (raf = requestAnimationFrame(frame));
  }

  img.style.setProperty('visibility', 'hidden', 'important');
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(start, 200); });
  canvas.parentElement.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; });
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible && !still){ cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  }).observe(canvas);
})();
