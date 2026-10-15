// Dibujo del pinball (solo Canvas 2D). Coordenadas = pixeles de la plantilla (1667 x 3356).
(function (root) {
  'use strict';
  var FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';

  function glow(ctx, x, y, r, c0, c1) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  function text(ctx, s, x, y, size, fill, stroke, align) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineWidth = size * 0.14; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = fill; ctx.fillText(s, x, y);
  }

  function drawFlipper(ctx, T, f) {
    var tip = T.flipperTip(f), dx = tip.x - f.px, dy = tip.y - f.py, l = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / l, ny = dx / l;
    var pass, grow, rp, rt;
    for (pass = 0; pass < 2; pass++) {
      grow = pass === 0 ? 7 : 0; rp = f.rP + grow; rt = f.rT + grow;
      ctx.beginPath();
      ctx.moveTo(f.px + nx * rp, f.py + ny * rp);
      ctx.lineTo(tip.x + nx * rt, tip.y + ny * rt);
      ctx.arc(tip.x, tip.y, rt, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, false);
      ctx.lineTo(f.px - nx * rp, f.py - ny * rp);
      ctx.arc(f.px, f.py, rp, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, false);
      ctx.closePath();
      if (pass === 0) { ctx.fillStyle = '#5a0f2c'; ctx.fill(); }
      else {
        var g = ctx.createLinearGradient(f.px + nx * rp, f.py + ny * rp, f.px - nx * rp, f.py - ny * rp);
        g.addColorStop(0, '#ff6a6a'); g.addColorStop(0.45, '#d8242f'); g.addColorStop(1, '#8c0f22');
        ctx.fillStyle = g; ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(255,225,225,0.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.px + nx * rp * 0.5 + dx / l * 22, f.py + ny * rp * 0.5 + dy / l * 22);
    ctx.lineTo(tip.x + nx * rt * 0.45 - dx / l * 18, tip.y + ny * rt * 0.45 - dy / l * 18);
    ctx.stroke();
    // tapa del pivote (perla azul)
    glow(ctx, f.px, f.py, 24, '#ffffff', '#5fc4ee');
    ctx.strokeStyle = '#1a78c2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.px, f.py, 22, 0, 6.2832); ctx.stroke();
  }

  function drawGear(ctx, G, ang) {
    ctx.save(); ctx.translate(G.gear.x, G.gear.y); ctx.rotate(ang);
    ctx.fillStyle = '#e8a82a';
    for (var i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-18, -118, 36, 46); ctx.restore(); }
    var g = ctx.createRadialGradient(0, 0, 40, 0, 0, 92);
    g.addColorStop(0, '#6a3d00'); g.addColorStop(0.55, '#f5b830'); g.addColorStop(1, '#c98710');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#071a2d'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    for (i = 0; i < 12; i++) { var a = i * Math.PI / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * 70, Math.sin(a) * 70, 7, 0, 6.2832); ctx.fill(); }
    ctx.restore();
  }

  function draw(ctx, T, I, S) {
    var G = T.G, i, j;
    ctx.drawImage(I.bg, 0, 0);

    // luces de carril
    var sides = ['L', 'R'];
    for (j = 0; j < 2; j++) for (i = 0; i < 3; i++) {
      var p = G.lights[sides[j]][i], on = T.lit[sides[j]][i];
      if (on) glow(ctx, p[0], p[1], 52, 'rgba(160,255,190,0.95)', 'rgba(60,220,120,0)');
      glow(ctx, p[0], p[1], 24, on ? '#eaffef' : '#1e5a3a', on ? '#38d27a' : '#0c2a1c');
    }

    drawGear(ctx, G, T.gearAng);

    // blancos "100"
    var c;
    for (i = 0; i < T.circs.length; i++) {
      c = T.circs[i]; if (c.kind !== 'target') continue;
      var f = c.flash, sc = 1 + 0.12 * f;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(sc, sc);
      glow(ctx, 0, 0, 90, 'rgba(255,90,60,' + (0.25 + 0.5 * f) + ')', 'rgba(255,90,60,0)');
      var g = ctx.createRadialGradient(-12, -14, 4, 0, 0, 62);
      g.addColorStop(0, f > 0.1 ? '#ffd070' : '#ff7a50'); g.addColorStop(0.6, '#e8281e'); g.addColorStop(1, '#8e0f12');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = '#ffb090'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 56, 0, 6.2832); ctx.stroke();
      text(ctx, '100', 0, 2, 40, '#ffe9c4', null);
      ctx.restore();
    }

    // faros (bumpers grandes)
    var cropX = [0, 235, 475];
    for (i = 0; i < 3; i++) {
      c = T.circs[i]; var fl = c.flash;
      var bx = 596 + cropX[i], by = 439, im = I['lh' + i];
      if (fl > 0) glow(ctx, c.x, c.y - 20, 190, 'rgba(255,220,120,' + (0.55 * fl) + ')', 'rgba(255,200,80,0)');
      ctx.save(); ctx.translate(c.x, c.y); var s2 = 1 + 0.07 * fl; ctx.scale(s2, s2); ctx.translate(-c.x, -c.y);
      ctx.drawImage(im, bx, by);
      if (fl > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * fl; ctx.drawImage(im, bx, by); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
    }

    // tirachinas
    var sf = 0; for (i = 0; i < T.slingSegs.length; i++) sf = Math.max(sf, T.slingSegs[i].flash);
    ctx.drawImage(I.slings, 447, 2028);
    if (sf > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * sf; ctx.drawImage(I.slings, 447, 2028); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }

    // lanzador
    var pull = T.charge * 90, cx = (G.ballStart[0]);
    ctx.fillStyle = '#9aa3b2'; ctx.fillRect(cx - 11, 3050 + pull, 22, 280 - pull);
    ctx.strokeStyle = '#d6dbe6'; ctx.lineWidth = 6;
    for (i = 0; i < 6; i++) { var yy = 3010 + pull + i * (3300 - 3010 - pull) / 6; ctx.beginPath(); ctx.moveTo(cx - 30, yy); ctx.lineTo(cx + 30, yy + 14); ctx.stroke(); }
    ctx.drawImage(I.charger, cx - 52, 2990 + pull - 8, 104, 73);

    // flíperes
    for (i = 0; i < T.flippers.length; i++) drawFlipper(ctx, T, T.flippers[i]);

    // estela y bola
    var R = G.ballR, tr = S.trail;
    for (i = 0; i < tr.length; i++) { var k = (i + 1) / tr.length; glow(ctx, tr[i][0], tr[i][1], R * (0.7 + 0.5 * k), 'rgba(190,230,255,' + (0.16 * k) + ')', 'rgba(190,230,255,0)'); }
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(T.x + 8, T.y + 12, R, 0, 6.2832); ctx.fill();
    var bg = ctx.createRadialGradient(T.x - R * 0.35, T.y - R * 0.4, R * 0.1, T.x, T.y, R);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.35, '#d9dee9'); bg.addColorStop(0.8, '#7d8699'); bg.addColorStop(1, '#3b4254');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(T.x, T.y, R, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(T.x - R * 0.38, T.y - R * 0.42, R * 0.16, 0, 6.2832); ctx.fill();

    // medidor de potencia (banda derecha)
    ctx.fillStyle = '#4a0f2c'; ctx.fillRect(1625, 2300, 26, 690);
    var h = 690 * T.charge;
    var mg = ctx.createLinearGradient(0, 2990, 0, 2300); mg.addColorStop(0, '#6cf08a'); mg.addColorStop(0.6, '#ffe45c'); mg.addColorStop(1, '#ff5a4a');
    ctx.fillStyle = mg; ctx.fillRect(1625, 2990 - h, 26, h);

    // puntos flotantes
    for (i = 0; i < S.popups.length; i++) {
      var pp = S.popups[i];
      ctx.globalAlpha = Math.min(1, pp.life / 0.4);
      text(ctx, pp.text, pp.x, pp.y, 54, '#fff5b8', '#7a3a00');
      ctx.globalAlpha = 1;
    }

    // marcador (zona de arena superior)
    text(ctx, String(T.score), 833, 92, 92, '#7a2a10', '#fff6cf');
    var sub = 'BOLA ' + T.ballNo + '/3' + (T.mult > 1 ? '  \u00b7  x' + T.mult : '') + '  \u00b7  REC ' + T.high;
    text(ctx, sub, 833, 150, 32, '#8a4b1c', '#fff6cf');

    // mensaje
    if (S.msgT > 0) {
      ctx.globalAlpha = Math.min(1, S.msgT);
      text(ctx, S.msg, 833, 1380, 84, '#fff2a0', '#7a2a10');
      ctx.globalAlpha = 1;
    }

    // pistas
    if (T.canPlunge() && T.score === 0 && T.ballNo === 1 && S.mode === 'play') {
      ctx.fillStyle = 'rgba(4,20,40,0.78)'; ctx.fillRect(200, 1700, 1240, 420);
      ctx.strokeStyle = '#5cc8ff'; ctx.lineWidth = 6; ctx.strokeRect(200, 1700, 1240, 420);
      text(ctx, 'Mant\u00e9n pulsada la zona del lanzador y suelta', 820, 1780, 56, '#ffe9a0', null);
      text(ctx, '(abajo a la derecha, o la tecla ESPACIO)', 820, 1850, 46, '#cfe9ff', null);
      text(ctx, 'Toca la mitad izquierda / derecha para los fl\u00edperes', 820, 1960, 50, '#cfe9ff', null);
      text(ctx, 'Teclado: Z y M  \u00b7  N nueva partida', 820, 2040, 44, '#9fc3e6', null);
    }

    if (S.mode === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(36, 36, 1568, 3284);
      ctx.fillStyle = 'rgba(5,24,46,0.95)'; ctx.fillRect(250, 1250, 1170, 700);
      ctx.strokeStyle = '#ff7ab0'; ctx.lineWidth = 8; ctx.strokeRect(250, 1250, 1170, 700);
      text(ctx, 'FIN DEL JUEGO', 835, 1390, 120, '#ff8fbd', '#3a0a22');
      text(ctx, 'Puntos: ' + T.score, 835, 1560, 90, '#ffe9a0', null);
      text(ctx, 'R\u00e9cord: ' + T.high, 835, 1670, 60, '#bfe3ff', null);
      text(ctx, 'Toca la pantalla para jugar otra vez', 835, 1830, 56, '#ffffff', null);
    }

    if (S.mode === 'start') {
      ctx.fillStyle = 'rgba(2,14,30,0.72)'; ctx.fillRect(36, 36, 1568, 3284);
      var pw = I.play.width, ph = I.play.height, sc2 = 1.7;
      ctx.drawImage(I.play, 835 - pw * sc2 / 2, 1300 - ph * sc2 / 2, pw * sc2, ph * sc2);
      text(ctx, 'PINBALL PLAYA', 835, 760, 150, '#ffe9a0', '#7a2a10');
      text(ctx, 'Toca para empezar', 835, 1800, 70, '#ffffff', null);
      text(ctx, 'Con sonido', 835, 1890, 46, '#9fc3e6', null);
    }

    if (S.mode === 'loading') {
      ctx.fillStyle = '#06182c'; ctx.fillRect(0, 0, 1667, 3356);
      text(ctx, 'Cargando...', 835, 1600, 90, '#ffffff', null);
    }
  }

  root.Render = { draw: draw };
  if (typeof module !== 'undefined') module.exports = root.Render;
})(typeof window !== 'undefined' ? window : globalThis);
