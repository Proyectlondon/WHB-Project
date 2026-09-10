const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
function assetUrl(path) {
  return path;
}

const MEDIA_FEATURES = [
  { match: '40 Días Después', cover: 'assets/images/poster-40-dias.png', coverKind: 'Portada oficial' },
  { match: 'Astillas Del Olivo', cover: 'assets/images/poster-astillas.png', coverKind: 'Portada oficial' },
  { match: 'Con Tu Espíritu', cover: 'assets/images/con-tu-espiritu.jpg', coverKind: 'Arte del archivo' },
  { match: 'Mi Dios Artesano', cover: 'assets/images/poster-mi-dios-artesano.png', coverKind: 'Portada oficial' },
  { match: 'Mi Huertica', cover: 'assets/images/mi-huertica.jpg', coverKind: 'Arte del archivo' },
  { match: 'Señor Escucha Mi Cantar', cover: 'assets/images/poster-senor-escucha.png', coverKind: 'Portada oficial' },
  { match: 'Zamba del Olivo Verde', cover: 'assets/images/poster-zamba.png', coverKind: 'Portada oficial' },
  { match: 'Tengo Sed', cover: 'assets/images/poster-tengo-sed.png', coverKind: 'Portada oficial' }
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
  'WHB Project': { cover: 'assets/images/poster-son-del-monte.png', coverKind: 'Portada oficial' }
};

function mediaArtwork(video) {
  return MEDIA_ALBUM_ART[video.album] || MEDIA_COVER_FALLBACKS[video.group] || { cover: 'assets/images/son-del-monte.jpg', coverKind: 'Arte del archivo' };
}

function isAiArchiveItem(item) {
  const haystack = [item?.src, item?.label, item?.title, item?.source].filter(Boolean).join(' ').toLowerCase();
  return /(^|[\\/_ -])(complementary|generated-covers?|ai|ia|concept)([\\/. _-]|$)/i.test(haystack)
    || /arte complementario|imagen generada|inteligencia artificial/.test(haystack);
}

function isUnverifiedAlbum(value) {
  return /por confirmar|por definir|pendiente de confirmaci[oó]n/i.test(String(value || ''));
}

function displayAlbum(value, fallback = 'Archivo sonoro') {
  return isUnverifiedAlbum(value) ? fallback : (value || fallback);
}

function videoEmbedUrl(id) {
  const origin = window.location.origin && window.location.origin !== 'null' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1${origin}`;
}

function renderVideoFrame(frame, video, loading = 'lazy') {
  if (!frame || !video) return;
  if (window.location.protocol === 'file:') {
    frame.innerHTML = `<div class="media-file-fallback"><img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="Miniatura de ${video.title}" loading="eager"><div><p>El reproductor necesita abrirse desde un servidor local.</p><a class="text-link" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noreferrer">Abrir video en YouTube <span>↗</span></a></div></div>`;
    return;
  }
  frame.innerHTML = `<iframe loading="${loading}" src="${videoEmbedUrl(video.id)}" title="${video.title}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

class AmbientWind {
  constructor() {
    // Se solicita activo desde el inicio. Los navegadores que bloquean
    // autoplay mantienen los archivos en reproducción silenciosa hasta el
    // primer gesto del visitante y luego liberan el sonido sin otro clic.
    this.enabled = false;
    this.unlocked = false;
    this.birds = null;
    this.river = null;
    this.atmosphereContext = null;
    this.atmosphereSource = null;
    this.atmosphereGain = null;
    this.pianoGain = null;
    this.pianoDelay = null;
    this.pianoEchoGain = null;
    this.pianoTimer = null;
    this.pianoStep = 0;
    this.openingBreathPlayed = false;
  }
  create() {
    this.birds = new Audio(assetUrl('assets/audio/ambience/park_ambience_birds.mp3'));
    this.river = new Audio(assetUrl('assets/audio/ambience/park_ambience_river.mp3'));
    [this.birds, this.river].forEach((audio) => {
      audio.loop = true;
      audio.preload = 'auto';
      audio.muted = true;
      audio.setAttribute('aria-hidden', 'true');
    });
    this.birds.volume = .28;
    this.river.volume = .2;
    return true;
  }
  createAtmosphere() {
    if (this.atmosphereContext || !window.AudioContext && !window.webkitAudioContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.atmosphereContext = new AudioContextClass();
    const buffer = this.atmosphereContext.createBuffer(1, this.atmosphereContext.sampleRate * 3, this.atmosphereContext.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < channel.length; index += 1) {
      last = last * .985 + (Math.random() * 2 - 1) * .015;
      channel[index] = last;
    }
    this.atmosphereSource = this.atmosphereContext.createBufferSource();
    this.atmosphereSource.buffer = buffer;
    this.atmosphereSource.loop = true;
    const filter = this.atmosphereContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    this.atmosphereGain = this.atmosphereContext.createGain();
    this.atmosphereGain.gain.value = .006;
    this.atmosphereSource.connect(filter).connect(this.atmosphereGain).connect(this.atmosphereContext.destination);
    this.atmosphereSource.start();

    // Una cama de piano generada con Web Audio: acordes lentos y abiertos,
    // suficientemente bajos para convivir con el río y los pájaros sin
    // convertir la navegación en una pista musical protagonista.
    this.pianoGain = this.atmosphereContext.createGain();
    this.pianoGain.gain.value = 0;
    const pianoFilter = this.atmosphereContext.createBiquadFilter();
    pianoFilter.type = 'lowpass';
    pianoFilter.frequency.value = 1450;
    pianoFilter.Q.value = .28;
    this.pianoDelay = this.atmosphereContext.createDelay(2.5);
    this.pianoDelay.delayTime.value = .72;
    this.pianoEchoGain = this.atmosphereContext.createGain();
    this.pianoEchoGain.gain.value = .16;
    this.pianoGain.connect(pianoFilter);
    pianoFilter.connect(this.atmosphereContext.destination);
    pianoFilter.connect(this.pianoDelay).connect(this.pianoEchoGain).connect(this.atmosphereContext.destination);
    this.startPianoAtmosphere();
  }
  playPianoNote(frequency, startTime, duration = 7.2) {
    if (!this.atmosphereContext || !this.pianoGain) return;
    const oscillator = this.atmosphereContext.createOscillator();
    const harmonic = this.atmosphereContext.createOscillator();
    const envelope = this.atmosphereContext.createGain();
    oscillator.type = 'triangle';
    harmonic.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    harmonic.frequency.setValueAtTime(frequency * 2, startTime);
    harmonic.detune.setValueAtTime(-2, startTime);
    const harmonicGain = this.atmosphereContext.createGain();
    harmonicGain.gain.value = .16;
    envelope.gain.setValueAtTime(.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(.56, startTime + .8);
    envelope.gain.exponentialRampToValueAtTime(.34, startTime + 2.9);
    envelope.gain.exponentialRampToValueAtTime(.0001, startTime + duration);
    oscillator.connect(envelope);
    harmonic.connect(harmonicGain).connect(envelope);
    envelope.connect(this.pianoGain);
    oscillator.start(startTime);
    harmonic.start(startTime);
    oscillator.stop(startTime + duration + .08);
    harmonic.stop(startTime + duration + .08);
  }
  startPianoAtmosphere() {
    if (this.pianoTimer || !this.atmosphereContext) return;
    const chords = [
      [261.63, 392.00, 523.25],
      [220.00, 329.63, 440.00],
      [174.61, 261.63, 392.00],
      [196.00, 293.66, 392.00]
    ];
    const playChord = () => {
      const start = this.atmosphereContext.currentTime + .06;
      const chord = chords[this.pianoStep % chords.length];
      chord.forEach((frequency, index) => this.playPianoNote(frequency, start + index * .28, 8.8));
      this.pianoStep += 1;
    };
    playChord();
    this.pianoTimer = window.setInterval(playChord, 9500);
  }
  playOpeningBreath() {
    if (!this.enabled || !this.unlocked || !this.atmosphereContext || this.openingBreathPlayed) return false;
    this.openingBreathPlayed = true;
    const context = this.atmosphereContext;
    const start = context.currentTime + .04;
    const duration = 3.7;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      previous = previous * .94 + (Math.random() * 2 - 1) * .06;
      channel[index] = previous * 2.4;
    }
    const source = context.createBufferSource();
    const highPass = context.createBiquadFilter();
    const windBand = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = .9;
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(120, start);
    windBand.type = 'bandpass';
    windBand.Q.value = .42;
    windBand.frequency.setValueAtTime(260, start);
    windBand.frequency.linearRampToValueAtTime(1450, start + 1.15);
    windBand.frequency.linearRampToValueAtTime(620, start + 2.35);
    windBand.frequency.exponentialRampToValueAtTime(220, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.035, start + .42);
    gain.gain.exponentialRampToValueAtTime(.11, start + 1.25);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(highPass).connect(windBand).connect(gain).connect(context.destination);
    source.start(start);
    source.stop(start + duration + .08);

    // El soplo ocupa el primer plano durante un instante y luego devuelve el
    // paisaje sonoro a su nivel normal. La transición evita que el viento se
    // pierda detrás del río y los pájaros en altavoces pequeños.
    const fadeNativeAudio = (audio, target, milliseconds) => {
      if (!audio) return;
      const initial = audio.volume;
      const startedAt = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / milliseconds);
        audio.volume = initial + (target - initial) * progress;
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    fadeNativeAudio(this.birds, .12, 420);
    fadeNativeAudio(this.river, .08, 420);
    window.setTimeout(() => {
      if (!this.enabled) return;
      fadeNativeAudio(this.birds, .28, 850);
      fadeNativeAudio(this.river, .2, 850);
    }, 2900);
    return true;
  }
  unlock() {
    if (!this.enabled || !this.birds || this.unlocked) return;
    this.unlocked = true;
    [this.birds, this.river].forEach((audio) => { audio.muted = false; });
    Promise.all([this.birds.play(), this.river.play()]).catch(() => {});
    this.createAtmosphere();
    if (this.atmosphereGain && this.atmosphereContext) this.atmosphereGain.gain.setTargetAtTime(.006, this.atmosphereContext.currentTime, .12);
    if (this.pianoGain && this.atmosphereContext) this.pianoGain.gain.setTargetAtTime(.028, this.atmosphereContext.currentTime, .18);
    this.atmosphereContext?.resume().catch(() => {});
  }
  setEnabled(enabled) {
    if (!this.birds && !this.create()) return false;
    this.enabled = enabled;
    if (enabled) {
      const starts = [this.birds.play(), this.river.play()];
      Promise.all(starts).catch(() => {});
      if (this.unlocked) {
        [this.birds, this.river].forEach((audio) => { audio.muted = false; });
        if (this.atmosphereGain && this.atmosphereContext) this.atmosphereGain.gain.setTargetAtTime(.006, this.atmosphereContext.currentTime, .12);
        if (this.pianoGain && this.atmosphereContext) this.pianoGain.gain.setTargetAtTime(.028, this.atmosphereContext.currentTime, .18);
      }
    } else {
      this.birds.pause();
      this.river.pause();
      [this.birds, this.river].forEach((audio) => { audio.muted = true; });
      if (this.atmosphereGain && this.atmosphereContext) this.atmosphereGain.gain.setTargetAtTime(0, this.atmosphereContext.currentTime, .12);
      if (this.pianoGain && this.atmosphereContext) this.pianoGain.gain.setTargetAtTime(0, this.atmosphereContext.currentTime, .18);
    }
    return enabled;
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
    const releasePointer = () => {
      window.setTimeout(() => { this.pointer.active = false; }, 180);
    };
    window.addEventListener('pointerleave', () => { this.pointer.active = false; }, { passive: true });
    window.addEventListener('pointerup', releasePointer, { passive: true });
    window.addEventListener('pointercancel', releasePointer, { passive: true });
    window.addEventListener('pointerdown', (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
      this.pointer.lastTime = performance.now();
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
    // Algunos navegadores móviles cancelan Pointer Events al comenzar el
    // desplazamiento. Estos listeners mantienen una estela táctil ligera.
    window.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      this.pointer.x = touch.clientX;
      this.pointer.y = touch.clientY;
      this.pointer.active = true;
      this.pointer.lastTime = performance.now();
      this.gust = .7;
    }, { passive: true });
    window.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      const now = performance.now();
      const elapsed = this.pointer.lastTime ? Math.max(12, now - this.pointer.lastTime) : 16;
      const nextX = touch.clientX;
      const nextY = touch.clientY;
      this.pointer.vx = this.pointer.vx * .72 + Math.max(-4, Math.min(4, (nextX - this.pointer.x) / elapsed * 16)) * .28;
      this.pointer.vy = this.pointer.vy * .72 + Math.max(-4, Math.min(4, (nextY - this.pointer.y) / elapsed * 16)) * .28;
      this.pointer.x = nextX;
      this.pointer.y = nextY;
      this.pointer.active = true;
      this.pointer.lastTime = now;
    }, { passive: true });
    window.addEventListener('touchend', releasePointer, { passive: true });
    window.addEventListener('touchcancel', releasePointer, { passive: true });
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
  root.innerHTML = `<div class="whb-player" id="whb-player" aria-label="Reproductor WHB Project"><div class="whb-player-meta"><span class="whb-player-kicker">AHORA SUENA</span><strong id="whb-player-title">Elige una Radio Version</strong><small id="whb-player-album">WHB Project · catálogo sonoro</small></div><div class="whb-player-controls"><button type="button" class="whb-player-button" data-audio-prev aria-label="Pista anterior">←</button><button type="button" class="whb-player-button whb-player-play" data-audio-play aria-label="Reproducir">▶</button><button type="button" class="whb-player-button" data-audio-next aria-label="Siguiente pista">→</button><div class="whb-player-progress"><input id="whb-player-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progreso de la pista"><div class="whb-player-times"><span id="whb-player-current">0:00</span><span id="whb-player-duration">0:00</span></div></div><label class="whb-player-volume" aria-label="Volumen"><span>◒</span><input id="whb-player-volume" type="range" min="0" max="1" value="0.8" step="0.05" aria-label="Volumen"></label></div><div class="whb-player-queue" role="group" aria-label="Modo de reproducción"><button type="button" class="whb-queue-button is-active" data-audio-queue="single">Una pista</button><button type="button" class="whb-queue-button" data-audio-queue="repeat-one">Repetir pista</button><button type="button" class="whb-queue-button" data-audio-queue="album">Reproducir álbum</button><button type="button" class="whb-queue-button" data-audio-queue="all">Todo en orden</button><button type="button" class="whb-queue-button" data-audio-queue="shuffle">Aleatorio</button><button type="button" class="whb-queue-button" data-audio-queue="repeat-all">Repetir todo</button><span id="whb-player-mode">Termina al finalizar</span></div><audio id="whb-audio" preload="metadata"></audio></div><div class="audio-search-wrap"><label class="audio-search" for="audio-search">Buscar en la loma<input id="audio-search" type="search" placeholder="Canción, álbum o proyecto" autocomplete="off"></label></div><div class="whb-mini-player" id="whb-mini-player" aria-label="Controles de reproducción rápida" hidden><div class="whb-mini-copy"><span>AHORA SUENA</span><strong id="whb-mini-title">Elige una canción</strong><small id="whb-mini-album">WHB Project</small></div><button type="button" class="whb-mini-button" data-audio-mini-prev aria-label="Pista anterior">←</button><button type="button" class="whb-mini-button whb-mini-play" data-audio-mini-play aria-label="Reproducir">▶</button><button type="button" class="whb-mini-button" data-audio-mini-next aria-label="Siguiente pista">→</button><button type="button" class="whb-mini-close" data-audio-mini-close aria-label="Ocultar reproductor">×</button></div>${Object.entries(groups).map(([albumName, tracks], albumIndex) => `<details class="album-block"${albumIndex === 0 ? ' open' : ''}><summary class="album-title"><span>${displayAlbum(albumName)}</span><span class="album-meta"><span>${tracks.length} ${tracks.length === 1 ? 'pista' : 'pistas'}</span><span class="album-toggle" aria-hidden="true"></span></span></summary><div class="album-track-list">${tracks.map((track, index) => `<button class="track" type="button" data-audio-index="${audio.indexOf(track)}"><span class="track-no">${String(index + 1).padStart(2, '0')}</span><span class="track-title">${track.title}</span><span class="track-play-mark" aria-hidden="true">▶</span></button>`).join('')}</div></details>`).join('')}`;
  $('#audio-count').textContent = audio.length;
  const playerArtwork = document.createElement('div');
  playerArtwork.className = 'whb-player-art';
  playerArtwork.innerHTML = '<img id="whb-player-art" src="' + assetUrl('assets/images/hero-whb-poster.jpg') + '" alt="Arte de la pista actual" loading="lazy">';
  document.getElementById('whb-player')?.prepend(playerArtwork);

  const player = $('#whb-player');
  const mini = $('#whb-mini-player');
  const audioElement = $('#whb-audio');
  const title = $('#whb-player-title');
  const album = $('#whb-player-album');
  const artwork = $('#whb-player-art');
  const play = $('[data-audio-play]', player);
  const progress = $('#whb-player-progress');
  const volume = $('#whb-player-volume');
  const current = $('#whb-player-current');
  const duration = $('#whb-player-duration');
  const mode = $('#whb-player-mode');
  let activeIndex = -1;
  let queueMode = 'single';
  let queueIndices = [];
  let mainPlayerVisible = true;
  let miniDismissed = false;
  const updateMiniVisibility = () => {
    mini.hidden = !(activeIndex >= 0 && !mainPlayerVisible && !miniDismissed);
    document.body.classList.toggle('has-mini-player', !mini.hidden);
  };
  const formatTime = (value) => { if (!Number.isFinite(value)) return '0:00'; const minutes = Math.floor(value / 60); const seconds = String(Math.floor(value % 60)).padStart(2, '0'); return `${minutes}:${seconds}`; };
  const shuffle = (indices) => indices.slice().sort(() => Math.random() - .5);
  const setQueue = (nextMode) => {
    queueMode = nextMode;
    if (nextMode === 'album' && activeIndex >= 0) {
      const albumName = audio[activeIndex].album;
      queueIndices = audio.map((track, index) => track.album === albumName ? index : -1).filter((index) => index >= 0);
    } else if (nextMode === 'album') {
      queueIndices = audio.map((track, index) => track.album === audio[0].album ? index : -1).filter((index) => index >= 0);
    } else if (nextMode === 'all' || nextMode === 'repeat-all' || nextMode === 'shuffle') {
      queueIndices = audio.map((_, index) => index);
      if (nextMode === 'shuffle') queueIndices = shuffle(queueIndices);
    } else {
      queueIndices = activeIndex >= 0 ? [activeIndex] : (audio.length ? [0] : []);
    }
    const labels = {
      single: 'Termina al finalizar',
      'repeat-one': 'Repite esta pista',
      album: `Álbum · ${audio[queueIndices[0]]?.album || ''}`,
      all: 'Todo el catálogo · en orden',
      shuffle: 'Todo el catálogo · aleatorio',
      'repeat-all': 'Todo el catálogo · en bucle'
    };
    mode.textContent = labels[nextMode] || labels.single;
    $$('[data-audio-queue]', player).forEach((button) => button.classList.toggle('is-active', button.dataset.audioQueue === nextMode));
  };
  const selectTrack = (index, autoplay = false, preserveQueue = false) => {
    if (!preserveQueue) setQueue('single');
    miniDismissed = false;
    activeIndex = (index + audio.length) % audio.length;
    const track = audio[activeIndex];
    audioElement.pause();
    audioElement.removeAttribute('src');
    audioElement.load();
    audioElement.src = assetUrl(track.path);
    audioElement.load();
    title.textContent = track.title;
    album.textContent = `${track.group || 'WHB Project'} · ${displayAlbum(track.album)}`;
    if (artwork && track.art) { artwork.src = assetUrl(track.art); artwork.alt = `Arte de ${track.title}`; }
    progress.value = '0'; current.textContent = '0:00'; duration.textContent = '0:00';
    $$('[data-audio-index]', root).forEach((button) => button.classList.toggle('is-active', Number(button.dataset.audioIndex) === activeIndex));
    syncMini();
    if (autoplay) {
      const start = () => audioElement.play().catch(() => {});
      if (audioElement.readyState >= 2) start();
      else audioElement.addEventListener('canplay', start, { once: true });
    }
  };
  const syncPlay = () => { const playing = !audioElement.paused; play.textContent = playing ? 'Ⅱ' : '▶'; play.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir'); player.classList.toggle('is-playing', playing); };
  const syncMini = () => { const playing = !audioElement.paused; $('#whb-mini-title').textContent = title.textContent; $('#whb-mini-album').textContent = album.textContent; $('[data-audio-mini-play]', mini).textContent = playing ? 'Ⅱ' : '▶'; $('[data-audio-mini-play]', mini).setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir'); updateMiniVisibility(); };
  const moveTrack = (direction) => {
    if (activeIndex < 0) return selectTrack(0, true);
    if (queueMode === 'repeat-one') return selectTrack(activeIndex + direction, true);
    if (queueMode !== 'single' && queueIndices.length) {
      const position = queueIndices.indexOf(activeIndex);
      return selectTrack(queueIndices[(position + direction + queueIndices.length) % queueIndices.length], true, true);
    }
    return selectTrack(activeIndex + direction, true);
  };
  play.addEventListener('click', () => { if (activeIndex < 0) selectTrack(0); if (audioElement.paused) audioElement.play().catch(() => {}); else audioElement.pause(); });
  $('[data-audio-prev]', player).addEventListener('click', () => moveTrack(-1));
  $('[data-audio-next]', player).addEventListener('click', () => moveTrack(1));
  $('[data-audio-mini-prev]', mini).addEventListener('click', () => moveTrack(-1));
  $('[data-audio-mini-next]', mini).addEventListener('click', () => moveTrack(1));
  $('[data-audio-mini-play]', mini).addEventListener('click', () => { if (audioElement.paused) audioElement.play().catch(() => {}); else audioElement.pause(); });
  $('[data-audio-mini-close]', mini).addEventListener('click', () => { miniDismissed = true; updateMiniVisibility(); });
  $$('[data-audio-queue]', player).forEach((button) => button.addEventListener('click', () => { setQueue(button.dataset.audioQueue); selectTrack(queueIndices[0] ?? 0, true, true); }));
  root.addEventListener('click', (event) => { const button = event.target.closest('[data-audio-index]'); if (button) selectTrack(Number(button.dataset.audioIndex), true); });
  root.addEventListener('toggle', (event) => {
    if (event.target.tagName !== 'DETAILS' || !event.target.open || !window.matchMedia('(max-width: 560px)').matches) return;
    root.querySelectorAll('.album-block[open]').forEach((block) => { if (block !== event.target) block.open = false; });
  }, true);
  $('#audio-search')?.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLocaleLowerCase();
    root.querySelectorAll('.album-block').forEach((block) => {
      let matches = 0;
      block.querySelectorAll('.track').forEach((track) => {
        const match = !query || track.textContent.toLocaleLowerCase().includes(query) || block.querySelector('.album-title')?.textContent.toLocaleLowerCase().includes(query);
        track.hidden = !match;
        if (match) matches += 1;
      });
      block.hidden = matches === 0;
      if (query && matches) block.open = true;
    });
  });
  progress.addEventListener('input', () => { if (audioElement.duration) audioElement.currentTime = audioElement.duration * (Number(progress.value) / 100); });
  volume.addEventListener('input', () => { audioElement.volume = Number(volume.value); });
  audioElement.volume = Number(volume.value);
  audioElement.addEventListener('loadedmetadata', () => { duration.textContent = formatTime(audioElement.duration); });
  audioElement.addEventListener('timeupdate', () => { if (audioElement.duration) progress.value = String((audioElement.currentTime / audioElement.duration) * 100); current.textContent = formatTime(audioElement.currentTime); });
  audioElement.addEventListener('play', () => { syncPlay(); syncMini(); }); audioElement.addEventListener('pause', () => { syncPlay(); syncMini(); });
  audioElement.addEventListener('ended', () => {
    if (queueMode === 'single' || !queueIndices.length) return;
    if (queueMode === 'repeat-one') return selectTrack(activeIndex, true, true);
    const position = queueIndices.indexOf(activeIndex);
    if (position >= 0 && position < queueIndices.length - 1) selectTrack(queueIndices[position + 1], true, true);
    else if (queueMode === 'repeat-all') selectTrack(queueIndices[0], true, true);
    else if (queueMode === 'shuffle') { setQueue('shuffle'); selectTrack(queueIndices[0], true, true); }
    else { setQueue('single'); syncPlay(); syncMini(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { mainPlayerVisible = entry.isIntersecting; updateMiniVisibility(); }, { threshold: 0.08 }).observe(player);
  } else {
    window.addEventListener('scroll', () => { mainPlayerVisible = player.getBoundingClientRect().bottom > 0 && player.getBoundingClientRect().top < window.innerHeight; updateMiniVisibility(); }, { passive: true });
  }
}

function renderVideos(videos, filter = 'all') {
  const root = $('#video-catalog');
  if (!root) return;
  const visible = filter === 'all' ? videos : videos.filter((video) => video.group === filter);
  root.innerHTML = visible.map((video) => `<article class="video-card"><div class="video-frame"><button class="video-load" type="button" data-video-id="${video.id}" aria-label="Reproducir ${video.title}"><img loading="lazy" src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="" decoding="async"><span aria-hidden="true">▶</span></button></div><div class="video-meta"><p>${video.group} · ${video.album}</p><h3>${video.title}</h3><small>${video.kind}</small></div></article>`).join('');
  root.querySelectorAll('[data-video-id]').forEach((button) => button.addEventListener('click', () => {
    const video = visible.find((item) => item.id === button.dataset.videoId);
    if (!video) return;
    const frame = button.closest('.video-frame');
    renderVideoFrame(frame, video, 'eager');
  }, { once: true }));
}

function renderGallery(gallery) {
  const root = $('#gallery-grid');
  if (!root) return;
  root.innerHTML = gallery.filter((item) => !isAiArchiveItem(item)).map((item) => `<figure class="gallery-tile"><img loading="lazy" src="${assetUrl(item.src)}" alt="${item.alt}"><figcaption class="gallery-caption"><span>${item.label}</span><b>${item.title}</b></figcaption></figure>`).join('');
}

function renderMedia(catalog) {
  const root = $('#media-stage');
  if (!root) return;
  const videos = catalog.videos || [];
  const archive = (catalog.gallery || []).filter((item) => !isAiArchiveItem(item));
  const featured = MEDIA_FEATURES.map((feature) => {
    const video = videos.find((candidate) => candidate.title === feature.match || candidate.title.includes(feature.match));
    return video ? { ...feature, ...video, copy: `Videoclip oficial de “${video.title}”. Puedes verlo aquí y volver a la música cuando quieras.` } : null;
  }).filter(Boolean);
  const featuredIds = new Set(featured.map((item) => item.id));
  const remaining = videos.filter((video) => !featuredIds.has(video.id)).map((video) => ({
    ...video,
    ...mediaArtwork(video),
    copy: `Videoclip oficial de “${video.title}”. Puedes verlo aquí y volver a la música cuando quieras.`
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
  const watch = $('#media-watch');
  const frame = $('#media-player');
  const galleryImage = $('#media-gallery-image');
  const galleryCaption = $('#media-gallery-caption');
  const thumbs = $('#media-gallery-thumbs');
  const videoThumbs = $('#media-video-thumbs');
  const coverNote = $('#media-cover-note');
  const index = $('#media-index');
  const total = $('#media-total');
  const galleryCount = $('#media-gallery-count');
  const commentForm = $('#gallery-comment-form');
  const commentStatus = $('#gallery-comment-status');

  if (galleryCount) galleryCount.textContent = `Archivo WHB · ${archive.length} piezas`;

  const renderVideoThumbs = () => {
    if (!videoThumbs) return;
    videoThumbs.innerHTML = items.map((item, itemIndex) => `<button class="media-video-thumb${itemIndex === mediaIndex ? ' is-active' : ''}" type="button" data-video-index="${itemIndex}" aria-label="Ver videoclip ${itemIndex + 1}: ${item.title}" aria-current="${itemIndex === mediaIndex ? 'true' : 'false'}"><img loading="lazy" src="https://i.ytimg.com/vi/${item.id}/mqdefault.jpg" alt=""><span><b>${String(itemIndex + 1).padStart(2, '0')}</b>${item.title}</span></button>`).join('');
    const activeThumb = videoThumbs.querySelector('.media-video-thumb.is-active');
    if (activeThumb) {
      const target = activeThumb.getBoundingClientRect();
      const strip = videoThumbs.getBoundingClientRect();
      if (videoThumbs.scrollHeight > videoThumbs.clientHeight + 2) {
        videoThumbs.scrollTo({ top: videoThumbs.scrollTop + target.top - strip.top - (videoThumbs.clientHeight - target.height) / 2, behavior: 'auto' });
      } else {
        videoThumbs.scrollTo({ left: videoThumbs.scrollLeft + target.left - strip.left - (videoThumbs.clientWidth - target.width) / 2, behavior: 'auto' });
      }
    }
  };

  const renderGalleryThumbs = () => {
    if (!thumbs) return;
    thumbs.innerHTML = archive.map((item, itemIndex) => `<button class="media-thumb${itemIndex === galleryIndex ? ' is-active' : ''}" type="button" data-gallery-index="${itemIndex}" aria-label="Ver imagen ${itemIndex + 1} de ${archive.length}"><img loading="lazy" src="${assetUrl(item.src)}" alt=""></button>`).join('');
    const activeThumb = thumbs.querySelector('.media-thumb.is-active');
    if (activeThumb) {
      const target = activeThumb.getBoundingClientRect();
      const strip = thumbs.getBoundingClientRect();
      thumbs.scrollTo({ left: thumbs.scrollLeft + target.left - strip.left - (thumbs.clientWidth - target.width) / 2, behavior: 'auto' });
    }
  };

  const renderGalleryState = () => {
    if (!archive.length) return;
    const image = archive[galleryIndex % archive.length];
    if (galleryImage) { galleryImage.src = assetUrl(image.src); galleryImage.alt = image.alt; }
    if (galleryCaption) galleryCaption.textContent = `${image.label} · ${image.title}`;
    if (commentForm) commentForm.dataset.image = image.src;
    renderGalleryThumbs();
  };

  const lightbox = $('#gallery-lightbox');
  const lightboxImage = $('#gallery-lightbox-image');
  const lightboxCaption = $('#gallery-lightbox-caption');
  const updateLightbox = () => {
    const image = archive[galleryIndex % archive.length];
    if (!image) return;
    if (lightboxImage) { lightboxImage.src = assetUrl(image.src); lightboxImage.alt = image.alt; }
    if (lightboxCaption) lightboxCaption.textContent = `${image.label} · ${image.title}`;
  };
  const openLightbox = () => {
    if (!lightbox || !archive.length) return;
    updateLightbox();
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
  };
  galleryImage?.addEventListener('click', openLightbox);
  galleryImage?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(); } });
  lightbox?.querySelector('[data-gallery-close]')?.addEventListener('click', () => lightbox.close?.());
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close?.(); });
  lightbox?.addEventListener('cancel', () => lightbox.close?.());
  lightbox?.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => { galleryIndex = (galleryIndex - 1 + archive.length) % archive.length; renderGalleryState(); updateLightbox(); });
  lightbox?.querySelector('[data-lightbox-next]')?.addEventListener('click', () => { galleryIndex = (galleryIndex + 1) % archive.length; renderGalleryState(); updateLightbox(); });

  const update = (direction = 0, focusActiveVideo = false) => {
    const item = items[mediaIndex];
    const shell = $('.media-song-shell', root);
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
    if (watch) { watch.href = '#media-player'; watch.setAttribute('aria-label', `Ver video oficial de ${item.title} en la página`); }
    renderVideoFrame(frame, item);
    if (index) index.textContent = String(mediaIndex + 1).padStart(2, '0');
    if (total) total.textContent = String(items.length).padStart(2, '0');
    renderVideoThumbs();
    if (focusActiveVideo) videoThumbs?.querySelector('.media-video-thumb.is-active')?.focus({ preventScroll: true });
  };

  watch?.addEventListener('click', (event) => {
    event.preventDefault();
    frame?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    frame?.querySelector('iframe')?.focus({ preventScroll: true });
  });

  const changeMedia = (direction, button) => {
    button?.focus({ preventScroll: true });
    mediaIndex = direction < 0 ? (mediaIndex - 1 + items.length) % items.length : (mediaIndex + 1) % items.length;
    window.requestAnimationFrame(() => update(direction));
  };
  $$('[data-media-prev]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); changeMedia(-1, button); }));
  $$('[data-media-next]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); changeMedia(1, button); }));
  const galleryRoot = $('#media-gallery');
  galleryRoot?.addEventListener('click', (event) => {
    const previous = event.target.closest('[data-gallery-prev]');
    const next = event.target.closest('[data-gallery-next]');
    if (previous) { galleryIndex = (galleryIndex - 1 + archive.length) % archive.length; renderGalleryState(); }
    if (next) { galleryIndex = (galleryIndex + 1) % archive.length; renderGalleryState(); }
  });
  thumbs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-index]');
    if (!button) return;
    galleryIndex = Number(button.dataset.galleryIndex) || 0;
    renderGalleryState();
  });
  videoThumbs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-video-index]');
    if (!button) return;
    mediaIndex = Number(button.dataset.videoIndex) || 0;
    window.requestAnimationFrame(() => update(1, true));
  });
  commentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!commentStatus) return;
    commentStatus.textContent = 'Enviando a revisión…';
    const data = new FormData(commentForm);
    const payload = { name: data.get('name'), email: data.get('email'), comment: data.get('comment'), image: commentForm.dataset.image || '' };
    const openMailFallback = () => {
      const subject = encodeURIComponent(`Comentario para la galería WHB · ${payload.name}`);
      const body = encodeURIComponent([
        'Comentario pendiente de revisión para el archivo público de WHB.',
        '',
        `Nombre: ${payload.name}`,
        `Correo: ${payload.email}`,
        `Imagen: ${payload.image || 'Archivo WHB'}`,
        '',
        'Comentario:',
        payload.comment,
        '',
        'La persona autorizó su publicación si el equipo lo aprueba.'
      ].join('\n'));
      commentStatus.textContent = 'Abrimos tu correo con el comentario preparado para revisión…';
      window.location.href = `mailto:whbprojectmusic@gmail.com?subject=${subject}&body=${body}`;
    };
    try {
      const response = await fetch('/api/gallery-comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (result.fallback) return openMailFallback();
      if (!response.ok) throw new Error(result.error || 'No pudimos enviar el comentario.');
      commentStatus.textContent = 'Gracias. Tu comentario quedó pendiente de aprobación.';
      commentForm.reset();
    } catch (error) {
      commentStatus.textContent = error.message;
    }
  });
  const comments = $('#gallery-comments');
  fetch('content/gallery-comments.json').then((response) => response.ok ? response.json() : []).then((approved) => {
    if (!comments || !Array.isArray(approved) || !approved.length) return;
    comments.replaceChildren();
    const label = document.createElement('p'); label.className = 'gallery-comments-label'; label.textContent = 'Voces que han pasado por el archivo'; comments.append(label);
    approved.forEach((item) => { const quote = document.createElement('blockquote'); quote.className = 'gallery-comment'; const text = document.createElement('p'); text.textContent = `“${String(item.comment || '').slice(0, 800)}”`; const cite = document.createElement('cite'); cite.textContent = String(item.name || 'Visitante').slice(0, 80); quote.append(text, cite); comments.append(quote); });
  }).catch(() => {});
  let gestureStart = null;
  const swipeTarget = $('.media-song-shell', root) || root;
  const finishSwipe = (event) => {
    if (!gestureStart || (event.pointerType && event.pointerType !== 'touch')) return;
    const dx = event.clientX - gestureStart.x;
    const dy = event.clientY - gestureStart.y;
    const elapsed = performance.now() - gestureStart.time;
    gestureStart = null;
    swipeTarget.classList.remove('is-swipe-active');
    if (elapsed > 900 || Math.abs(dx) < 32 || Math.abs(dx) < Math.abs(dy) * 1.05) return;
    mediaIndex = dx < 0 ? (mediaIndex + 1) % items.length : (mediaIndex - 1 + items.length) % items.length;
    update(dx < 0 ? 1 : -1);
  };
  swipeTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    gestureStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    swipeTarget.classList.add('is-swipe-active');
  }, { passive: true });
  swipeTarget.addEventListener('pointerup', finishSwipe, { passive: true });
  swipeTarget.addEventListener('pointercancel', () => {
    gestureStart = null;
    swipeTarget.classList.remove('is-swipe-active');
  }, { passive: true });
  root.addEventListener('keydown', (event) => {
    if (event.target !== root) return;
    event.preventDefault();
    if (event.key === 'ArrowRight') { mediaIndex = (mediaIndex + 1) % items.length; update(1); }
    if (event.key === 'ArrowLeft') { mediaIndex = (mediaIndex - 1 + items.length) % items.length; update(-1); }
  });
  root.tabIndex = 0;
  window.whbOpenProject = (projectName) => {
    const target = items.findIndex((item) => item.group === projectName);
    if (target >= 0) {
      mediaIndex = target;
      update();
      document.querySelector('#media-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    document.querySelector('#music')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const albumBlock = [...document.querySelectorAll('#audio-catalog .album-block')].find((block) => block.textContent.includes(projectName));
    if (albumBlock) albumBlock.open = true;
    return false;
  };
  update();
  renderGalleryState();
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
    document.addEventListener('click', (event) => {
      const projectLink = event.target.closest('[data-project]');
      if (!projectLink || typeof window.whbOpenProject !== 'function') return;
      event.preventDefault();
      window.whbOpenProject(projectLink.dataset.project);
    });
  } catch (error) {
    console.warn('No se pudo cargar el catálogo.', error);
    if (window.location.protocol === 'file:') {
      renderVideoFrame($('#media-player'), { id: '-RHLsyCG-1U', title: '40 Días Después' });
    }
    $$('.loading').forEach((node) => { node.textContent = 'El archivo estará disponible en cuanto se conecte la fuente.'; });
  }
}

function initHeroOpening(ambient) {
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
  let breathPlayed = false;
  const playOpeningBreath = () => {
    if (breathPlayed || finished || opening.classList.contains('is-hidden')) return;
    ambient?.unlock();
    breathPlayed = Boolean(ambient?.playOpeningBreath());
  };
  const hideOpening = () => {
    opening.classList.remove('is-finishing');
    opening.classList.add('is-hidden');
    opening.setAttribute('aria-hidden', 'true');
    opening.removeAttribute('aria-modal');
    opening.setAttribute('inert', '');
    window.setTimeout(() => video.pause(), 900);
  };
  const finish = ({ transition = false } = {}) => {
    if (finished) return;
    finished = true;
    if (transition) {
      opening.classList.add('is-finishing');
      window.setTimeout(hideOpening, 650);
      return;
    }
    hideOpening();
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
      opening.classList.remove('video-fallback');
      if (enter) {
        const label = enter.firstChild;
        if (label && label.nodeType === Node.TEXT_NODE) label.textContent = 'Entrar al campo ';
        enter.setAttribute('aria-label', 'Entrar al campo');
      }
    }).catch(() => keepPoster());
  };
  enter?.addEventListener('click', () => {
    playOpeningBreath();
    if (!started && video.paused) {
      start();
      return;
    }
    finish();
  });
  skip?.addEventListener('click', finish);
  video.addEventListener('ended', () => finish({ transition: true }), { once: true });
  video.addEventListener('error', keepPoster, { once: true });
  video.addEventListener('canplay', start, { once: true });
  window.addEventListener('pointerdown', playOpeningBreath, { once: true, passive: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') finish(); }, { passive: true });
  window.setTimeout(() => { if (!started && !finished) keepPoster(); }, 2600);
  if (video.readyState >= 3) start();
}

function initRemoteStaticAssets() {
  $$('[data-asset]').forEach((element) => {
    const path = element.dataset.asset;
    if (path) element.setAttribute('src', assetUrl(path));
  });
  $$('[data-asset-poster]').forEach((element) => {
    const path = element.dataset.assetPoster;
    if (path) element.setAttribute('poster', assetUrl(path));
  });
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
      const current = $('#current-section');
      const activeLink = links.find((link) => link.dataset.section === sectionId);
      if (current && activeLink) current.textContent = activeLink.textContent.replace(/\s+/g, ' ').trim();
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

function initJournalReader() {
  const dialog = $('#journal-reader');
  const title = $('#journal-reader-title');
  const body = $('#journal-reader-body');
  const close = dialog?.querySelector('[data-journal-close]');
  if (!dialog || !title || !body) return;
  const escapeHtml = (value) => String(value).replace(/[&<>\"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
  }[character]));
  const inlineMarkdown = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  const renderMarkdown = (markdown) => {
    const blocks = [];
    let paragraph = [];
    const flush = () => {
      if (!paragraph.length) return;
      blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    };
    String(markdown).split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || /^\*\*(Fuente|Estado):/.test(line) || /^---+$/.test(line)) {
        flush();
        return;
      }
      if (/^# /.test(line)) { flush(); return; }
      if (/^##? /.test(line)) {
        flush();
        blocks.push(`<h3>${inlineMarkdown(line.replace(/^##? /, ''))}</h3>`);
        return;
      }
      paragraph.push(line);
    });
    flush();
    return blocks.join('');
  };
  const open = async (button) => {
    title.textContent = button.dataset.journalTitle || 'Lectura del cuaderno';
    body.innerHTML = '<p class="loading">Abriendo el archivo…</p>';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    try {
      const response = await fetch(`content/${button.dataset.journalFile}`);
      if (!response.ok) throw new Error('journal unavailable');
      body.innerHTML = renderMarkdown(await response.text());
    } catch {
      body.innerHTML = '<p>No pudimos abrir esta entrada en este momento. El extracto sigue disponible en la tarjeta.</p>';
    }
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-journal-file]');
    if (button) open(button);
  });
  close?.addEventListener('click', () => dialog.close?.());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close?.(); });
  dialog.addEventListener('cancel', () => dialog.close?.());
}

function initBookingForm() {
  const form = $('#booking-form');
  const status = $('#booking-status');
  if (!form) return;
  const openMailFallback = (payload) => {
    const subject = encodeURIComponent(`Solicitud WHB / 3FR · ${payload.request}`);
    const body = encodeURIComponent([
      `Nombre: ${payload.name}`,
      `Correo: ${payload.email}`,
      `Fecha tentativa: ${payload.date}`,
      `Ciudad y lugar: ${payload.location}`,
      `Solicitud: ${payload.request}`,
      `Asistentes: ${payload.guests}`,
      '',
      'Contexto:',
      payload.message || 'Sin detalles adicionales.'
    ].join('\n'));
    if (status) status.textContent = 'No hay recepción web configurada; abrimos tu correo con la solicitud preparada…';
    window.location.href = `mailto:whbprojectmusic@gmail.com?subject=${subject}&body=${body}`;
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = Object.fromEntries(['name', 'email', 'date', 'location', 'request', 'guests', 'message'].map((key) => [key, String(data.get(key) || '').trim()]));
    if (status) status.textContent = 'Enviando tu solicitud…';
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const response = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.fallback) return openMailFallback(payload);
      form.reset();
      if (status) status.textContent = 'Solicitud recibida. Revisaremos agenda, ciudad y necesidades antes de responderte.';
    } catch {
      openMailFallback(payload);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const wind = new WindField($('#windfield'));
  const windFront = new WindField($('#windfield-front'), true);
  const ambient = new AmbientWind();
  const toggle = $('.sound-toggle');
  const syncAmbientUI = (enabled, unlocked = ambient.unlocked) => {
    const listening = enabled && unlocked;
    toggle?.setAttribute('aria-pressed', String(listening));
    toggle?.setAttribute('aria-label', listening ? 'Silenciar sonido ambiente de la loma' : enabled ? 'Activar sonido ambiente de la loma (toca para iniciar)' : 'Activar sonido ambiente de la loma');
    if (toggle) toggle.title = listening ? 'Ambiente activo: pájaros, río y piano suave.' : enabled ? 'Toca o haz clic una vez para iniciar el ambiente: pájaros, río y piano suave.' : 'Activar sonido ambiente de la loma';
    const label = toggle?.querySelector('span:last-child');
    if (label) label.textContent = listening ? 'Ambiente activo' : enabled ? 'Toca para escuchar' : 'Ambiente';
    wind.setCalm(enabled);
    windFront.setCalm(enabled);
  };
  const unlockAmbient = () => {
    const wasUnlocked = ambient.unlocked;
    ambient.unlock();
    if (!wasUnlocked && ambient.unlocked) syncAmbientUI(ambient.enabled, true);
  };
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((eventName) => {
    window.addEventListener(eventName, unlockAmbient, { passive: true });
  });
  const defaultAmbient = ambient.setEnabled(true);
  syncAmbientUI(defaultAmbient);
  toggle?.addEventListener('click', () => {
    const pressed = toggle.getAttribute('aria-pressed') === 'true';
    const enabled = !pressed;
    const activated = ambient.setEnabled(enabled);
    if (!activated && enabled) return;
    if (enabled) ambient.unlock();
    syncAmbientUI(enabled, ambient.unlocked);
  });
  $$('.filter').forEach((button) => button.addEventListener('click', async () => {
    $$('.filter').forEach((item) => item.classList.remove('is-active')); button.classList.add('is-active');
    const response = await fetch('content/catalog.json'); const catalog = await response.json(); renderVideos(catalog.videos || [], button.dataset.filter);
  }));
  initNavigation(); initReveal(); initCursor(); initJournalReader(); initBookingForm(); initRemoteStaticAssets(); initHeroOpening(ambient); loadCatalog();
  const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || isLocalPreview)) {
    navigator.serviceWorker.register('./sw.js').then((registration) => registration.update()).catch(() => {});
  }
});
