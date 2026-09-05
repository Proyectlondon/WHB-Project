const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const PUBLIC_ASSET_BASE = 'https://raw.githubusercontent.com/Proyectlondon/WHB-Project/main/';

function isHostedPreview() {
  return window.location.protocol === 'https:' || (window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname));
}

function assetUrl(path) {
  if (!path || !isHostedPreview()) return path;
  return PUBLIC_ASSET_BASE + path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

const MEDIA_FEATURES = [
  { match: '40 Días Después', cover: 'assets/images/40-dias-despues.jpg', coverKind: 'Arte del archivo', copy: 'Una canción para atravesar la espera con la mirada puesta en la promesa.' },
  { match: 'Astillas Del Olivo', cover: 'assets/images/astillas-del-olivo.jpg', coverKind: 'Arte del archivo', copy: 'Madera, memoria y una voz que encuentra luz en las pequeñas grietas.' },
  { match: 'Con Tu Espíritu', cover: 'assets/images/con-tu-espiritu.jpg', coverKind: 'Arte del archivo', copy: 'El aire entre las voces: una oración popfolclor que se mueve despacio.' },
  { match: 'Mi Dios Artesano', cover: 'assets/images/mi-dios-artesano.jpg', coverKind: 'Arte del archivo', copy: 'Una canción sobre el oficio de crear y la presencia que acompaña el camino.' },
  { match: 'Mi Huertica', cover: 'assets/images/mi-huertica.jpg', coverKind: 'Arte del archivo', copy: 'Una memoria de diciembre que vuelve a sonar con calidez de casa.' },
  { match: 'Señor Escucha Mi Cantar', cover: 'assets/images/senor-escucha-mi-cantar.jpg', coverKind: 'Arte del archivo', copy: 'La voz se vuelve conversación: pedir, agradecer y seguir cantando.' },
  { match: 'Zamba del Olivo Verde', cover: 'assets/images/zamba-del-olivo-verde.jpg', coverKind: 'Arte del archivo', copy: 'Una raíz que se mueve entre el folclor, la celebración y la esperanza.' },
  { match: 'Tengo Sed', cover: 'assets/images/poster-tengo-sed.png', coverKind: 'Arte del archivo', copy: 'S.A.L. abre una grieta de rock alternativo para decir lo que arde.' }
];

const MEDIA_ALBUM_ART = {
  'Fundamentales Desde La Loma Vol. 1': {
    cover: 'assets/images/complementary/whb-fundamentales-complementary.png',
    coverKind: 'Arte complementario',
    coverAlt: 'Arte complementario de Fundamentales Desde La Loma Vol. 1'
  },
  'El Sermón de las 7 palabras': {
    cover: 'assets/images/complementary/sal-sermon-complementary.png',
    coverKind: 'Arte complementario',
    coverAlt: 'Arte complementario de El Sermón de las 7 palabras · S.A.L'
  },
  'Suspiros de Esperanza': {
    cover: 'assets/images/complementary/pneuma-suspiros-complementary.png',
    coverKind: 'Arte complementario',
    coverAlt: 'Arte complementario de Suspiros de Esperanza · Pneuma'
  }
};

const MEDIA_COVER_FALLBACKS = {
  'S.A.L': { cover: 'assets/images/poster-tengo-sed.png', coverKind: 'Arte del archivo' },
  Pneuma: { cover: 'assets/images/poster-senor-escucha.png', coverKind: 'Arte del archivo' },
  'WHB Project': { cover: 'assets/images/son-del-monte.jpg', coverKind: 'Arte del archivo' }
};

function mediaArtwork(video) {
  return MEDIA_ALBUM_ART[video.album] || MEDIA_COVER_FALLBACKS[video.group] || { cover: 'assets/images/son-del-monte.jpg', coverKind: 'Arte del archivo' };
}

class AmbientWind {
  constructor() {
    this.context = null;
    this.master = null;
    this.source = null;
    this.lfo = null;
    this.lfoGain = null;
    this.enabled = false;
  }
  create() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    this.context = new AudioContext();
    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * .985 + white * .15;
      data[index] = last;
    }
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    const highPass = this.context.createBiquadFilter();
    highPass.type = 'highpass'; highPass.frequency.value = 90;
    const lowPass = this.context.createBiquadFilter();
    lowPass.type = 'lowpass'; lowPass.frequency.value = 780;
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.lfo = this.context.createOscillator();
    this.lfo.frequency.value = .11;
    this.lfoGain = this.context.createGain();
    this.lfoGain.gain.value = .012;
    this.lfo.connect(this.lfoGain).connect(this.master.gain);
    this.source.connect(highPass).connect(lowPass).connect(this.master).connect(this.context.destination);
    this.source.start(); this.lfo.start();
    return true;
  }
  setEnabled(enabled) {
    if (enabled && !this.context && !this.create()) return false;
    if (!this.context || !this.master) return false;
    this.enabled = enabled;
    this.context.resume();
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(enabled ? .045 : 0, this.context.currentTime, .18);
    return true;
  }
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

function renderMedia(catalog) {
  const root = $('#media-stage');
  if (!root) return;
  const videos = catalog.videos || [];
  const archive = catalog.gallery || [];
  const featured = MEDIA_FEATURES.map((feature) => {
    const video = videos.find((candidate) => candidate.title === feature.match || candidate.title.includes(feature.match));
    return video ? { ...feature, ...video } : null;
  }).filter(Boolean);
  const featuredIds = new Set(featured.map((item) => item.id));
  const remaining = videos.filter((video) => !featuredIds.has(video.id)).map((video) => ({
    ...video,
    ...mediaArtwork(video),
    copy: `${video.kind} de ${video.album}. Una pieza más del archivo que sigue respirando.`
  }));
  const items = [...featured, ...remaining];
  if (!items.length) return;

  let mediaIndex = 0;
  let galleryIndex = 0;
  let transitionTimer;
  const cover = $('#media-cover');
  const album = $('#media-album');
  const group = $('#media-group');
  const title = $('#media-title');
  const copy = $('#media-copy');
  const kind = $('#media-kind');
  const frame = $('#media-player');
  const galleryImage = $('#media-gallery-image');
  const galleryCaption = $('#media-gallery-caption');
  const thumbs = $('#media-gallery-thumbs');
  const coverNote = $('#media-cover-note');
  const index = $('#media-index');
  const total = $('#media-total');

  const renderGalleryThumbs = () => {
    if (!thumbs) return;
    thumbs.innerHTML = archive.slice(0, 6).map((item, itemIndex) => `<button class="media-thumb${itemIndex === galleryIndex ? ' is-active' : ''}" type="button" data-gallery-index="${itemIndex}" aria-label="Ver imagen ${itemIndex + 1}"><img loading="lazy" src="${assetUrl(item.src)}" alt=""></button>`).join('');
  };

  const update = (direction = 0) => {
    const item = items[mediaIndex];
    if (direction && root) {
      root.classList.remove('is-transitioning');
      window.requestAnimationFrame(() => root.classList.add('is-transitioning'));
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => root.classList.remove('is-transitioning'), 520);
    }
    if (cover) { cover.src = assetUrl(item.cover); cover.alt = item.coverAlt || `Arte de ${item.album} · ${item.title}`; }
    if (coverNote) coverNote.textContent = item.coverKind || 'Arte del archivo';
    if (album) album.textContent = item.album;
    if (group) group.textContent = item.group;
    if (title) title.textContent = item.title;
    if (copy) copy.textContent = item.copy;
    if (kind) kind.textContent = item.kind;
    if (frame) frame.innerHTML = `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${item.id}?rel=0" title="${item.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    if (index) index.textContent = String(mediaIndex + 1).padStart(2, '0');
    if (total) total.textContent = String(items.length).padStart(2, '0');
    if (archive.length) {
      const image = archive[galleryIndex % archive.length];
      if (galleryImage) { galleryImage.src = assetUrl(image.src); galleryImage.alt = image.alt; }
      if (galleryCaption) galleryCaption.textContent = `${image.label} · ${image.title}`;
      renderGalleryThumbs();
    }
  };

  $$('[data-media-prev]').forEach((button) => button.addEventListener('click', () => { mediaIndex = (mediaIndex - 1 + items.length) % items.length; update(-1); }));
  $$('[data-media-next]').forEach((button) => button.addEventListener('click', () => { mediaIndex = (mediaIndex + 1) % items.length; update(1); }));
  $$('[data-gallery-prev]').forEach((button) => button.addEventListener('click', () => { galleryIndex = (galleryIndex - 1 + archive.length) % archive.length; update(0); }));
  $$('[data-gallery-next]').forEach((button) => button.addEventListener('click', () => { galleryIndex = (galleryIndex + 1) % archive.length; update(0); }));
  thumbs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-index]');
    if (!button) return;
    galleryIndex = Number(button.dataset.galleryIndex) || 0;
    update(0);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { mediaIndex = (mediaIndex + 1) % items.length; update(1); }
    if (event.key === 'ArrowLeft') { mediaIndex = (mediaIndex - 1 + items.length) % items.length; update(-1); }
  });
  root.tabIndex = 0;
  update();
}

async function loadCatalog() {
  try {
    const response = await fetch('content/catalog.json');
    if (!response.ok) throw new Error('catalog unavailable');
    const catalog = await response.json();
    renderAudio(catalog.audio || []);
    renderVideos(catalog.videos || []);
    renderGallery(catalog.gallery || []);
    renderMedia(catalog);
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
  // Repetir estas propiedades evita que algunos navegadores móviles
  // interpreten el archivo como una pieza con audio y bloqueen el autoplay.
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  let finished = false;
  let started = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    opening.classList.add('is-hidden');
    opening.setAttribute('aria-hidden', 'true');
    opening.removeAttribute('aria-modal');
    opening.setAttribute('inert', '');
    window.setTimeout(() => video.pause(), 900);
  };
  const keepPoster = () => {
    if (finished || started) return;
    opening.classList.add('video-fallback');
    opening.querySelector('.hero-opening-kicker')?.replaceChildren(document.createTextNode('WHB Project · La loma está lista'));
    if (enter) {
      const label = enter.firstChild;
      if (label && label.nodeType === Node.TEXT_NODE) label.textContent = 'Reproducir apertura ';
      enter.setAttribute('aria-label', 'Reproducir apertura');
    }
  };
  const start = () => {
    if (finished || started) return;
    video.play().then(() => {
      started = true;
      opening.classList.add('is-playing');
      if (enter) {
        const label = enter.firstChild;
        if (label && label.nodeType === Node.TEXT_NODE) label.textContent = 'Entrar al campo ';
        enter.setAttribute('aria-label', 'Entrar al campo');
      }
    }).catch(() => keepPoster());
  };
  enter?.addEventListener('click', () => {
    if (!started && video.paused) {
      start();
      return;
    }
    finish();
  });
  skip?.addEventListener('click', finish);
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', keepPoster, { once: true });
  video.addEventListener('canplay', start, { once: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') finish(); }, { passive: true });
  window.setTimeout(() => { if (!started && !finished) keepPoster(); }, 2600);
  if (video.readyState >= 3) start();
}

function initRemoteStaticAssets() {
  if (!isHostedPreview()) return;
  $$('[data-asset]').forEach((element) => {
    const path = element.dataset.asset;
    if (path) element.setAttribute('src', assetUrl(path));
  });
  $$('[data-asset-poster]').forEach((element) => {
    const path = element.dataset.assetPoster;
    if (path) element.setAttribute('poster', assetUrl(path));
  });
  $('#hero-video')?.load();
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
  const navigationTargets = $$('.chapter, [data-nav-anchor]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const sectionId = entry.target.dataset.navAnchor || entry.target.id;
      links.forEach((link) => link.classList.toggle('is-active', link.dataset.section === sectionId));
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      const chapter = entry.target.dataset.chapter || entry.target.closest('.chapter')?.dataset.chapter || 0;
      document.body.dataset.season = seasons[Number(chapter) % seasons.length];
    });
  }, { threshold: .45 });
  navigationTargets.forEach((section) => observer.observe(section));
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
  const ambient = new AmbientWind();
  const toggle = $('.sound-toggle');
  toggle?.addEventListener('click', () => {
    const pressed = toggle.getAttribute('aria-pressed') === 'true';
    const enabled = !pressed;
    const activated = ambient.setEnabled(enabled);
    if (!activated && enabled) return;
    toggle.setAttribute('aria-pressed', String(enabled));
    wind.setCalm(enabled);
    windFront.setCalm(enabled);
    toggle.querySelector('span:last-child').textContent = enabled ? 'Ambiente activo' : 'Ambiente';
  });
  $$('.filter').forEach((button) => button.addEventListener('click', async () => {
    $$('.filter').forEach((item) => item.classList.remove('is-active')); button.classList.add('is-active');
    const response = await fetch('content/catalog.json'); const catalog = await response.json(); renderVideos(catalog.videos || [], button.dataset.filter);
  }));
  initNavigation(); initReveal(); initCursor(); initRemoteStaticAssets(); initHeroOpening(); loadCatalog();
});

