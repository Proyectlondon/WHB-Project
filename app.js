const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const PUBLIC_ASSET_BASE = 'https://raw.githubusercontent.com/Proyectlondon/WHB-Project/main/';

function assetUrl(path) {
  if (!path || !window.location.hostname.endsWith('vercel.app')) return path;
  return PUBLIC_ASSET_BASE + path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

class WindField {
  constructor(canvas, foreground = false) {
    this.canvas = canvas;
    this.foreground = foreground;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pointer = { x: -999, y: -999, active: false, vx: 0, vy: 0, lastTime: 0 };
    this.gust = 0;
    this.calm = false;
    this.particles = [];
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      const now = performance.now();
      const elapsed = this.pointer.lastTime ? Math.max(12, now - this.pointer.lastTime) : 16;
      const previousX = this.pointer.x;
      const previousY = this.pointer.y;
      const rawVx = previousX > -900 ? (event.clientX - previousX) / elapsed * 16 : 0;
      const rawVy = previousY > -900 ? (event.clientY - previousY) / elapsed * 16 : 0;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
      this.pointer.vx = this.pointer.vx * .72 + Math.max(-4, Math.min(4, rawVx)) * .28;
      this.pointer.vy = this.pointer.vy * .72 + Math.max(-4, Math.min(4, rawVy)) * .28;
      this.pointer.lastTime = now;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { this.pointer.active = false; }, { passive: true });
    window.addEventListener('pointerdown', (event) => {
      this.gust = 1;
      const radius = this.foreground ? 100 : 112;
      for (const p of this.particles) {
        const dx = p.x - event.clientX;
        const dy = p.y - event.clientY;
        const distance = Math.hypot(dx, dy);
        if (distance < radius) {
          const force = (1 - distance / radius) * (p.depth === 2 ? 1.9 : .75);
          p.vx += (dx / Math.max(distance, 1)) * force;
          p.vy += (dy / Math.max(distance, 1)) * force * .35;
        }
      }
    }, { passive: true });
    this.resize();
    this.seed();
    requestAnimationFrame(this.frame);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
  }
  seed() {
    const base = this.reduced ? 16 : (this.width < 560 ? (this.foreground ? 16 : 50) : (this.foreground ? 38 : 148));
    this.particles = Array.from({ length: base }, (_, index) => {
      const depth = index < Math.round(base * .53) ? 0 : (index < Math.round(base * .86) ? 1 : 2);
      const edge = this.foreground ? index < Math.round(base * .72) : Math.random() < .64;
      return {
        x: edge ? (Math.random() < .5 ? Math.random() * this.width * .3 : this.width * (.7 + Math.random() * .3)) : Math.random() * this.width,
        y: Math.random() * this.height,
        depth,
        size: [2.2, 4.2, 7.5][depth] * (this.foreground ? 1.08 : (.78 + Math.random() * .6)),
        angle: Math.random() * Math.PI * 2,
        speed: [.18, .3, .48][depth] * (.65 + Math.random() * .75),
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        leaf: Math.random() > (depth === 2 ? .25 : .42),
        tone: Math.random() > .42 ? 'cream' : 'gold',
        opacity: 1
      };
    });
  }
  drawLeaf(p) {
    const ctx = this.ctx;
    const alpha = (this.foreground ? (this.calm ? [.16, .22, .36][p.depth] : [.25, .38, .66][p.depth]) : (this.calm ? [.12, .17, .27][p.depth] : [.18, .27, .47][p.depth])) * p.opacity;
    const color = p.tone === 'gold' ? `rgba(214,156,45,${alpha})` : `rgba(238,227,205,${alpha})`;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-p.size * 1.45, 0);
    ctx.bezierCurveTo(-p.size * .55, -p.size * 1.15, p.size * .75, -p.size * .9, p.size * 1.55, 0);
    ctx.bezierCurveTo(p.size * .7, p.size * .95, -p.size * .6, p.size * 1.12, -p.size * 1.45, 0);
    ctx.fill();
    ctx.strokeStyle = `rgba(246,239,222,${alpha * .7})`;
    ctx.lineWidth = .45;
    ctx.beginPath(); ctx.moveTo(-p.size * 1.15, 0); ctx.lineTo(p.size * 1.2, 0); ctx.stroke();
    ctx.restore();
  }
  drawDandelion(p) {
    const ctx = this.ctx;
    const alpha = (this.foreground ? (this.calm ? .25 : .46) : (this.calm ? .18 : .34)) * p.opacity;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.strokeStyle = `rgba(238,227,205,${alpha})`; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(-p.size * .8, p.size * 1.7); ctx.lineTo(p.size * .2, 0); ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI * .8 + i * .4;
      ctx.beginPath(); ctx.moveTo(p.size * .2, 0); ctx.lineTo(p.size * .2 + Math.cos(a) * p.size * 1.4, Math.sin(a) * p.size * 1.4); ctx.stroke();
    }
    ctx.fillStyle = `rgba(214,156,45,${alpha + .08})`; ctx.beginPath(); ctx.arc(p.size * .2, 0, p.size * .32, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  frame(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const pointer = this.pointer;
    const wind = this.calm ? .28 : 1;
    for (const p of this.particles) {
      p.x += (p.speed * wind) + p.vx + Math.sin(time * .00045 + p.phase) * .18;
      p.y += p.vy + Math.sin(time * .0005 + p.phase) * .22 + Math.cos(time * .0003 + p.phase) * .08;
      p.vx *= .94;
      p.vy *= .94;
      p.angle += Math.sin(time * .0007 + p.phase) * .0025;
      if (pointer.active && !this.reduced) {
        const dx = p.x - pointer.x; const dy = p.y - pointer.y; const distance = Math.hypot(dx, dy);
        const radius = this.foreground ? 96 : 112;
        if (distance < radius) {
          const falloff = 1 - distance / radius;
          const push = falloff * (p.depth === 2 ? .62 : .2);
          p.x += (dx / Math.max(distance, 1)) * push; p.y += (dy / Math.max(distance, 1)) * push;
          const drift = falloff * (p.depth === 2 ? .055 : .022);
          p.vx += pointer.vx * drift;
          p.vy += pointer.vy * drift;
        }
      }
      if (p.x > this.width + 30) { p.x = -30; p.y = Math.random() * this.height; }
      if (p.y > this.height + 25) p.y = -25;
      if (p.y < -25) p.y = this.height + 25;
      if (this.foreground && !this.reduced) {
        const xEdge = Math.min(1, Math.abs(p.x - this.width / 2) / (this.width * .34));
        const yEdge = Math.min(1, Math.abs(p.y - this.height / 2) / (this.height * .46));
        p.opacity = .3 + Math.max(xEdge, yEdge) * .7;
      } else {
        p.opacity = 1;
      }
      if (p.leaf) this.drawLeaf(p); else this.drawDandelion(p);
    }
    this.gust *= .93;
    requestAnimationFrame(this.frame);
  }
  setCalm(value) { this.calm = value; }
}

function groupBy(items, key) {
  return items.reduce((groups, item) => { (groups[item[key]] ||= []).push(item); return groups; }, {});
}

function renderAudio(audio) {
  const root = $('#audio-catalog');
  if (!root) return;
  const groups = groupBy(audio, 'album');
  root.innerHTML = Object.entries(groups).map(([album, tracks], albumIndex) => `<details class="album-block"${albumIndex === 0 ? ' open' : ''}><summary class="album-title"><span>${album}</span><span class="album-meta"><span>${tracks.length} ${tracks.length === 1 ? 'pista' : 'pistas'}</span><span class="album-toggle" aria-hidden="true"></span></span></summary><div class="album-track-list">${tracks.map((track, index) => `<div class="track"><span class="track-no">${String(index + 1).padStart(2, '0')}</span><span class="track-title">${track.title}</span><audio controls preload="none" src="${assetUrl(track.path)}" aria-label="Reproducir ${track.title}"></audio></div>`).join('')}</div></details>`).join('');
  $('#audio-count').textContent = audio.length;
}

function renderVideos(videos, filter = 'all') {
  const root = $('#video-catalog');
  if (!root) return;
  const visible = filter === 'all' ? videos : videos.filter((video) => video.group === filter);
  root.innerHTML = visible.map((video) => `<article class="video-card"><div class="video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${video.id}?rel=0" title="${video.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="video-meta"><p>${video.group} · ${video.album}</p><h3>${video.title}</h3><small>${video.kind}</small></div></article>`).join('');
}

function renderGallery(gallery) {
  const root = $('#gallery-grid');
  if (!root) return;
  root.innerHTML = gallery.map((item) => `<figure class="gallery-tile"><img loading="lazy" src="${assetUrl(item.src)}" alt="${item.alt}"><figcaption class="gallery-caption"><span>${item.label}</span><b>${item.title}</b></figcaption></figure>`).join('');
}

async function loadCatalog() {
  try {
    const response = await fetch('content/catalog.json');
    if (!response.ok) throw new Error('catalog unavailable');
    const catalog = await response.json();
    renderAudio(catalog.audio || []);
    renderVideos(catalog.videos || []);
    renderGallery(catalog.gallery || []);
  } catch (error) {
    console.warn('No se pudo cargar el catálogo.', error);
    $$('.loading').forEach((node) => { node.textContent = 'El archivo estará disponible en cuanto se conecte la fuente.'; });
  }
}

function initHeroOpening() {
  const opening = $('#hero-opening');
  const video = $('#hero-video');
  const enter = $('#hero-enter');
  const skip = $('#hero-skip');
  if (!opening || !video) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    opening.remove();
    return;
  }
  // La apertura se muestra en cada recarga para que el video sea parte real
  // de la identidad del sitio. `?no-intro=1` queda como salida técnica.
  if (new URLSearchParams(window.location.search).has('no-intro')) {
    opening.remove();
    return;
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    opening.classList.add('is-hidden');
    opening.setAttribute('aria-hidden', 'true');
    opening.removeAttribute('aria-modal');
    opening.setAttribute('inert', '');
    window.setTimeout(() => video.pause(), 900);
  };
  enter?.addEventListener('click', finish);
  skip?.addEventListener('click', finish);
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') finish(); }, { passive: true });
  window.setTimeout(finish, 8600);
  video.play().catch(() => finish(false));
}

function initNavigation() {
  const nav = $('#chapter-nav');
  const toggle = $('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a') && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { nav?.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); }
  });
  const links = $$('.chapter-nav a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.toggle('is-active', link.dataset.section === entry.target.id));
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      document.body.dataset.season = seasons[Number(entry.target.dataset.chapter || 0) % seasons.length];
    });
  }, { threshold: .45 });
  $$('.chapter').forEach((section) => observer.observe(section));
}

function initReveal() {
  // La entrada de textos se activa solo cuando JavaScript está disponible;
  // así el contenido sigue siendo visible si la animación se desactiva.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selectors = [
    '.hero-copy', '.hero-note', '.scroll-cue',
    '.chapter .section-intro', '.chapter .section-head', '.chapter .family-intro', '.chapter .contact-main',
    '.chapter h2', '.chapter h3', '.chapter .lede', '.chapter .pull-quote',
    '.chapter .story-copy > p', '.chapter .family-lede', '.chapter .contact-main > p',
    '.chapter .project-row', '.chapter .service-grid article', '.chapter .video-meta', '.chapter .gallery-caption'
  ];
  const targets = $$(selectors.join(','));
  if (!targets.length) return;
  targets.forEach((element, index) => {
    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
  });
  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      instance.unobserve(entry.target);
    });
  }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((element) => observer.observe(element));
}

function initCursor() {
  const cursor = $('.cursor-seed');
  if (!cursor || !window.matchMedia('(pointer:fine)').matches) return;
  window.addEventListener('pointermove', (event) => {
    // La hoja conserva una orientación fija: la punta siempre coincide con el hotspot.
    // El movimiento del puntero afecta al viento del lienzo, no al cuerpo del cursor.
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  }, { passive: true });
  window.addEventListener('pointerdown', () => {
    cursor.classList.remove('is-gust');
    void cursor.offsetWidth;
    cursor.classList.add('is-gust');
    window.setTimeout(() => cursor.classList.remove('is-gust'), 650);
  }, { passive: true });
  $$('a,button,.track audio').forEach((element) => {
    element.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
    element.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const wind = new WindField($('#windfield'));
  const windFront = new WindField($('#windfield-front'), true);
  const toggle = $('.sound-toggle');
  toggle?.addEventListener('click', () => {
    const pressed = toggle.getAttribute('aria-pressed') === 'true';
    toggle.setAttribute('aria-pressed', String(!pressed));
    wind.setCalm(!pressed);
    windFront.setCalm(!pressed);
    toggle.querySelector('span:last-child').textContent = !pressed ? 'Calma' : 'Ambiente';
  });
  $$('.filter').forEach((button) => button.addEventListener('click', async () => {
    $$('.filter').forEach((item) => item.classList.remove('is-active')); button.classList.add('is-active');
    const response = await fetch('content/catalog.json'); const catalog = await response.json(); renderVideos(catalog.videos || [], button.dataset.filter);
  }));
  initNavigation(); initReveal(); initCursor(); initHeroOpening(); loadCatalog();
});
