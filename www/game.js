// Pinball Playa: entrada (toque / mouse / teclado), sonido y bucle principal.
(function () {
  'use strict';
  var G = window.GEOM, W = G.W, H = G.H, SUBDT = Physics.SUBDT;
  var cv = document.getElementById('c'), ctx = cv.getContext('2d');
  var muteBtn = document.getElementById('mute'), fsBtn = document.getElementById('fs');
  var T = new Physics.Table(G);
  var I = {}, loaded = false;
  var S = { mode: 'loading', popups: [], trail: [], msg: '', msgT: 0 };
  var scale = 1, offX = 0, offY = 0, dpr = 1, overTimer = 0;

  try { T.high = parseInt(localStorage.getItem('pinball_hi') || '0', 10) || 0; } catch (e) {}

  // ---------------- pantalla ----------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var w = window.innerWidth, h = window.innerHeight;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = Math.min(w / W, h / H);
    offX = (w - W * scale) / 2; offY = (h - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  resize();

  // ---------------- imagenes ----------------
  var names = ['bg', 'lh0', 'lh1', 'lh2', 'slings', 'charger', 'play'], pending = names.length;
  names.forEach(function (n) {
    var im = new Image();
    im.onload = function () { I[n] = im; if (--pending === 0) { loaded = true; S.mode = 'start'; } };
    im.onerror = function () { S.msg = 'Error cargando ' + n; };
    im.src = 'img/' + n + '.png';
  });

  // ---------------- sonido ----------------
  var AC = null, master = null, bufs = {}, muted = false, lastPlay = {}, wavesSrc = null;
  var SOUNDS = ['bumper0', 'bumper1', 'bumper2', 'target', 'sling', 'flipup', 'flipdown', 'flipperhit', 'wall', 'light',
                'bonus', 'gear', 'launch', 'pull', 'drain', 'save', 'gameover', 'start', 'waves'];
  function decode(ab) {
    return new Promise(function (res, rej) {
      var p = AC.decodeAudioData(ab, res, rej);
      if (p && p.catch) p.catch(rej);
    });
  }
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    AC = new C();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(AC.destination);
    if (AC.state === 'suspended') AC.resume();
    SOUNDS.forEach(function (n) {
      fetch('snd/' + n + '.wav').then(function (r) { return r.arrayBuffer(); }).then(decode).then(function (b) {
        bufs[n] = b; if (n === 'waves') startWaves();
      }).catch(function () {});
    });
  }
  function startWaves() {
    if (wavesSrc || !bufs.waves || !AC) return;
    wavesSrc = AC.createBufferSource(); wavesSrc.buffer = bufs.waves; wavesSrc.loop = true;
    var g = AC.createGain(); g.gain.value = 0.32; wavesSrc.connect(g); g.connect(master); wavesSrc.start();
  }
  function play(n, vol, rate) {
    if (!AC || muted || !bufs[n]) return;
    var now = AC.currentTime;
    if (lastPlay[n] && now - lastPlay[n] < 0.03) return;
    lastPlay[n] = now;
    var s = AC.createBufferSource(); s.buffer = bufs[n];
    if (rate) s.playbackRate.value = rate;
    var g = AC.createGain(); g.gain.value = vol == null ? 1 : vol;
    s.connect(g); g.connect(master); s.start();
  }
  function setMuted(m) {
    muted = m; if (master) master.gain.value = m ? 0 : 0.85;
    muteBtn.textContent = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  }
  muteBtn.addEventListener('click', function (e) { e.stopPropagation(); initAudio(); setMuted(!muted); });
  muteBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  fsBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  fsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var el = document.documentElement;
    if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el); }
    else { (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document); }
  });
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  // ---------------- entrada ----------------
  var pointers = {}, keys = {};
  function toTable(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale };
  }
  function startGame() {
    initAudio();
    T.newGame(); S.popups = []; S.trail = []; S.msgT = 0; S.mode = 'play';
    play('start', 0.9);
  }
  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    initAudio();
    if (S.mode === 'start') { startGame(); return; }
    if (S.mode === 'over') { if (overTimer > 0.8) startGame(); return; }
    if (S.mode !== 'play') return;
    var p = toTable(e), role;
    if (p.x > 1480 && p.y > 2200) role = 'P';
    else role = (e.clientX < window.innerWidth / 2) ? 'L' : 'R';
    pointers[e.pointerId] = role;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  function release(e) { delete pointers[e.pointerId]; }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('blur', function () { pointers = {}; keys = {}; });

  var KEYMAP = { KeyZ: 'L', KeyA: 'L', ArrowLeft: 'L', ShiftLeft: 'L', KeyM: 'R', KeyL: 'R', ArrowRight: 'R', ShiftRight: 'R',
                 Space: 'P', ArrowDown: 'P' };
  window.addEventListener('keydown', function (e) {
    if (KEYMAP[e.code]) e.preventDefault();
    if (e.repeat) return;
    initAudio();
    if (S.mode === 'start') { startGame(); return; }
    if (S.mode === 'over' && overTimer > 0.8 && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyN')) { startGame(); return; }
    if (e.code === 'KeyN' && S.mode === 'play') { startGame(); return; }
    if (e.code === 'KeyX') setMuted(!muted);
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { delete keys[e.code]; });

  function inputState() {
    var L = false, R = false, P = false, k, id;
    for (k in keys) { var r = KEYMAP[k]; if (r === 'L') L = true; else if (r === 'R') R = true; else if (r === 'P') P = true; }
    for (id in pointers) { var q = pointers[id]; if (q === 'L') L = true; else if (q === 'R') R = true; else P = true; }
    return { L: L, R: R, P: P };
  }

  // ---------------- eventos de la fisica ----------------
  function popup(x, y, text) { S.popups.push({ x: x, y: y, text: text, life: 0.9 }); }
  function say(m) { S.msg = m; S.msgT = 1.8; }
  function handleEvents() {
    var ev = T.events;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i], d = e.d;
      switch (e.type) {
        case 'bumper': play('bumper' + (d.idx % 3), 0.95); vibrate(14); popup(d.x, d.y - 130, '+' + d.pts); break;
        case 'target': play('target', 0.9); vibrate(9); popup(d.x, d.y - 90, '+' + d.pts); break;
        case 'sling': play('sling', 0.9); vibrate(12); break;
        case 'wall': play('wall', Math.min(1, d.v / 3500) * 0.8, 0.9 + Math.random() * 0.25); break;
        case 'flipperHit': play('flipperhit', 0.7); break;
        case 'flipUp': play('flipup', 0.85); break;
        case 'flipDown': play('flipdown', 0.6); break;
        case 'light': play('light', 0.8); break;
        case 'bonus': play('bonus', 0.95); say('\u00a1BONUS!  x' + d.mult); vibrate(40); break;
        case 'gear': play('gear', 0.85); popup(d.x, d.y - 150, '+500'); break;
        case 'launch': play('launch', 0.95); break;
        case 'pull': play('pull', 0.5, 0.8 + d.c * 0.7); break;
        case 'drain': play('drain', 0.95); vibrate(60); break;
        case 'save': play('save', 0.95); say('BOLA SALVADA'); break;
        case 'gameover':
          play('gameover', 0.95); overTimer = -1.2;
          try { localStorage.setItem('pinball_hi', String(T.high)); } catch (er) {}
          break;
      }
    }
    ev.length = 0;
  }

  // ---------------- bucle ----------------
  var last = 0, acc = 0;
  document.addEventListener('visibilitychange', function () {
    if (AC) { if (document.hidden) AC.suspend(); else if (!muted) AC.resume(); }
    last = 0;
  });

  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    if (document.hidden) return;

    if (S.mode === 'play' || S.mode === 'over') {
      var inp = inputState();
      if (S.mode === 'play') {
        T.setFlippers(inp.L, inp.R);
        T.updatePlunger(inp.P, dt);
        acc += dt;
        while (acc >= SUBDT) { T.step(SUBDT); acc -= SUBDT; }
      }
    }
    T.updateFx(dt);
    handleEvents();

    // interfaz
    if (S.mode === 'play' && T.gameOver) { overTimer += dt; if (overTimer >= 0) { S.mode = 'over'; overTimer = 0; } }
    else if (S.mode === 'over') overTimer += dt;
    if (S.msgT > 0) S.msgT -= dt;
    for (var i = S.popups.length - 1; i >= 0; i--) {
      var p = S.popups[i]; p.life -= dt; p.y -= 90 * dt;
      if (p.life <= 0) S.popups.splice(i, 1);
    }
    S.trail.push([T.x, T.y]); if (S.trail.length > 9) S.trail.shift();

    // dibujo
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#06182c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    if (loaded) Render.draw(ctx, T, I, S);
    else { ctx.fillStyle = '#fff'; ctx.font = 'bold 90px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Cargando...', W / 2, H / 2); }
  }
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
