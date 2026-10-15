// Fisica del pinball (sin dependencias del navegador). Coordenadas = pixeles de la plantilla (1667 x 3356).
(function (root) {
  'use strict';
  var SUBDT = 1 / 600;
  var GRAV = 3000, MAXV = 5300, DAMP = 0.03;

  function Table(G) {
    this.G = G;
    this.R = G.ballR;
    this.segs = [];
    this.circs = [];
    this.flippers = [];
    this.pressed = { L: false, R: false };
    this.events = [];
    this.high = 0;
    this._build();
    this.newGame();
  }

  Table.prototype._addSeg = function (a, b, e, kind) {
    var s = { ax: a[0], ay: a[1], bx: b[0], by: b[1], e: e, kick: false, oneWay: false, nx: 0, ny: 0, flash: 0,
              minx: Math.min(a[0], b[0]), maxx: Math.max(a[0], b[0]), miny: Math.min(a[1], b[1]), maxy: Math.max(a[1], b[1]),
              kind: kind || 0 };
    this.segs.push(s);
    return s;
  };

  Table.prototype._poly = function (pts, closed, e) {
    var n = pts.length, last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) this._addSeg(pts[i], pts[(i + 1) % n], e);
  };

  Table.prototype._build = function () {
    var G = this.G;
    this._poly(G.arch, false, 0.4);
    for (var i = 0; i < G.hulls.length; i++) this._poly(G.hulls[i], true, 0.45);
    for (i = 0; i < G.polys.length; i++) this._poly(G.polys[i], true, 0.4);
    for (i = 0; i < G.walls.length; i++) this._addSeg(G.walls[i].a, G.walls[i].b, G.walls[i].seat ? 0.05 : 0.3, G.walls[i].seat ? 3 : 0);
    var gt = this._addSeg(G.gate.a, G.gate.b, 0.3, 2);
    gt.oneWay = true; gt.nx = G.gate.n[0]; gt.ny = G.gate.n[1];
    // tirachinas: aristas con patada
    this.slingSegs = [];
    for (i = 0; i < G.slings.length; i++) {
      var pts = G.slings[i].pts, n = pts.length, cx = 0, cy = 0, k;
      for (k = 0; k < n; k++) { cx += pts[k][0]; cy += pts[k][1]; }
      cx /= n; cy /= n;
      for (k = 0; k < n; k++) {
        var s = this._addSeg(pts[k], pts[(k + 1) % n], 0.45, 1);
        if (G.slings[i].kick.indexOf(k) >= 0) {
          var dx = s.bx - s.ax, dy = s.by - s.ay, l = Math.sqrt(dx * dx + dy * dy);
          var nx = -dy / l, ny = dx / l;
          var mx = (s.ax + s.bx) / 2 - cx, my = (s.ay + s.by) / 2 - cy;
          if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
          s.kick = true; s.nx = nx; s.ny = ny; s.kind = 4;
          this.slingSegs.push(s);
        }
      }
    }
    this.bumperCount = G.bumpers.length;
    for (i = 0; i < G.bumpers.length; i++) this.circs.push({ x: G.bumpers[i].x, y: G.bumpers[i].y, r: G.bumpers[i].r, e: 0.9, kick: 1100, pts: 100, flash: 0, kind: 'bumper', idx: i });
    for (i = 0; i < G.targets.length; i++) this.circs.push({ x: G.targets[i].x, y: G.targets[i].y, r: G.targets[i].r, e: 0.8, kick: 650, pts: 100, flash: 0, kind: 'target', idx: i });
    for (i = 0; i < G.flippers.length; i++) {
      var f = G.flippers[i];
      this.flippers.push({ side: f.side, dir: f.side === 'L' ? 1 : -1, px: f.x, py: f.y, len: f.len, rP: 30, rT: 15,
                           rest: f.rest, act: f.act, ang: f.rest, omega: 0 });
    }
  };

  Table.prototype.flipperTip = function (f) {
    return { x: f.px + f.dir * Math.cos(f.ang) * f.len, y: f.py + Math.sin(f.ang) * f.len };
  };

  Table.prototype.newBall = function () {
    this.x = this.G.ballStart[0]; this.y = this.G.ballStart[1]; this.vx = 0; this.vy = 0;
    this.lit = { L: [false, false, false], R: [false, false, false] };
    this.mult = 1; this.charge = 0; this.saveTime = 0; this.stuck = 0;
    this.launched = false;
  };

  Table.prototype.newGame = function () {
    this.score = 0; this.ballNo = 1; this.gameOver = false; this.saveAvail = true;
    this.gearAng = 0; this.gearSpin = 0; this.gearCool = 0; this.time = 0;
    this.pulls = 0;
    this.newBall();
  };

  Table.prototype.emit = function (type, data) { this.events.push({ type: type, d: data || {} }); };

  Table.prototype.canPlunge = function () {
    return !this.gameOver && this.x > 1530 && this.y > 2850 && Math.hypot(this.vx, this.vy) < 140;
  };

  Table.prototype.launch = function (ch) {
    if (!this.canPlunge() || ch < 0.05) return;
    this.vy = -(2200 + 3000 * ch);
    this.vx = 0;
    this.saveTime = this.saveAvail ? 8 : 0;
    this.launched = true;
    this.emit('launch', { power: ch });
  };

  Table.prototype.addScore = function (pts) { this.score += pts * this.mult; };

  Table.prototype._hitSeg = function (s) {
    var R = this.R;
    if (this.x < s.minx - R || this.x > s.maxx + R || this.y < s.miny - R || this.y > s.maxy + R) return;
    var abx = s.bx - s.ax, aby = s.by - s.ay;
    var t = ((this.x - s.ax) * abx + (this.y - s.ay) * aby) / (abx * abx + aby * aby);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var cx = s.ax + abx * t, cy = s.ay + aby * t;
    var dx = this.x - cx, dy = this.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= R) return;
    if (s.oneWay && (dx * s.nx + dy * s.ny <= 0 || this.vx * s.nx + this.vy * s.ny >= 0)) return;
    var nx, ny;
    if (dist > 1e-5) { nx = dx / dist; ny = dy / dist; }
    else { var l = Math.sqrt(abx * abx + aby * aby); nx = -aby / l; ny = abx / l; }
    this.x = cx + nx * R; this.y = cy + ny * R;
    var vn = this.vx * nx + this.vy * ny;
    if (vn >= 0) return;
    this.vx -= (1 + s.e) * vn * nx; this.vy -= (1 + s.e) * vn * ny;
    if (s.kick && -vn > 300 && nx * s.nx + ny * s.ny > 0.5) {
      this.vx += nx * 1100; this.vy += ny * 1100;
      s.flash = 1; this.addScore(10); this.emit('sling', { x: this.x, y: this.y });
    } else if (-vn > 500) {
      this.emit('wall', { v: -vn });
    }
  };

  Table.prototype._hitCirc = function (c) {
    var R = this.R, dx = this.x - c.x, dy = this.y - c.y, rr = R + c.r;
    if (Math.abs(dx) > rr || Math.abs(dy) > rr) return;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= rr) return;
    var nx = 0, ny = -1;
    if (dist > 1e-5) { nx = dx / dist; ny = dy / dist; }
    this.x = c.x + nx * rr; this.y = c.y + ny * rr;
    var vn = this.vx * nx + this.vy * ny;
    if (vn >= 0) return;
    this.vx -= (1 + c.e) * vn * nx; this.vy -= (1 + c.e) * vn * ny;
    if (-vn > 90) {
      this.vx += nx * c.kick; this.vy += ny * c.kick;
      c.flash = 1;
      this.addScore(c.pts);
      this.emit(c.kind, { idx: c.idx, x: c.x, y: c.y, pts: c.pts * this.mult });
    }
  };

  Table.prototype._hitFlipper = function (f) {
    var R = this.R, tx = f.px + f.dir * Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
    var abx = tx - f.px, aby = ty - f.py;
    var t = ((this.x - f.px) * abx + (this.y - f.py) * aby) / (abx * abx + aby * aby);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var cx = f.px + abx * t, cy = f.py + aby * t, rf = f.rP + (f.rT - f.rP) * t;
    var dx = this.x - cx, dy = this.y - cy, dist = Math.sqrt(dx * dx + dy * dy), rr = R + rf;
    if (dist >= rr) return;
    var nx = 0, ny = -1;
    if (dist > 1e-5) { nx = dx / dist; ny = dy / dist; }
    this.x = cx + nx * rr; this.y = cy + ny * rr;
    var rx = cx - f.px, ry = cy - f.py;
    var vfx = -ry * f.omega * f.dir, vfy = rx * f.omega * f.dir;
    var vrx = this.vx - vfx, vry = this.vy - vfy;
    var vn = vrx * nx + vry * ny;
    if (vn >= 0) return;
    vrx -= 1.5 * vn * nx; vry -= 1.5 * vn * ny;
    this.vx = vrx + vfx; this.vy = vry + vfy;
    if (-vn > 600) this.emit('flipperHit', { v: -vn });
  };

  Table.prototype._substep = function (dt) {
    var i, f;
    for (i = 0; i < this.flippers.length; i++) {
      f = this.flippers[i];
      var up = this.pressed[f.side];
      var target = up ? f.act : f.rest, speed = up ? 18 : 10;
      var old = f.ang, diff = target - f.ang, mx = speed * dt;
      if (Math.abs(diff) <= mx) f.ang = target; else f.ang += (diff > 0 ? 1 : -1) * mx;
      f.omega = (f.ang - old) / dt;
    }
    this.vy += GRAV * dt;
    var damp = 1 - DAMP * dt;
    this.vx *= damp; this.vy *= damp;
    var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (sp > MAXV) { this.vx *= MAXV / sp; this.vy *= MAXV / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    for (i = 0; i < this.segs.length; i++) this._hitSeg(this.segs[i]);
    for (i = 0; i < this.circs.length; i++) this._hitCirc(this.circs[i]);
    for (i = 0; i < this.flippers.length; i++) this._hitFlipper(this.flippers[i]);
    // luces de carril
    var G = this.G, sides = ['L', 'R'];
    for (var s = 0; s < 2; s++) {
      var arr = G.lights[sides[s]], lit = this.lit[sides[s]];
      for (i = 0; i < 3; i++) {
        if (!lit[i] && Math.hypot(this.x - arr[i][0], this.y - arr[i][1]) < 48) {
          lit[i] = true; this.addScore(50);
          this.emit('light', { side: sides[s], i: i });
          if (lit[0] && lit[1] && lit[2]) {
            this.addScore(2000);
            if (this.mult < 5) this.mult++;
            this.emit('bonus', { mult: this.mult, side: sides[s] });
            lit[0] = lit[1] = lit[2] = false;
          }
        }
      }
    }
    // engranaje
    if (this.gearCool <= 0 && Math.hypot(this.x - G.gear.x, this.y - G.gear.y) < G.gear.r) {
      this.gearCool = 0.5; this.gearSpin += 14; this.addScore(500);
      this.emit('gear', { x: G.gear.x, y: G.gear.y });
    }
    if (this.y > G.drainY) this._drained();
  };

  Table.prototype._drained = function () {
    if (this.saveTime > 0) {
      this.saveAvail = false; this.emit('save');
      this.newBall();
      return;
    }
    this.emit('drain');
    this.ballNo++;
    if (this.ballNo > 3) {
      this.ballNo = 3; this.gameOver = true;
      if (this.score > this.high) this.high = this.score;
      this.x = this.G.ballStart[0]; this.y = this.G.ballStart[1]; this.vx = this.vy = 0;
      this.emit('gameover');
    } else {
      this.saveAvail = true;
      this.newBall();
    }
  };

  // avanza la simulacion un paso fijo
  Table.prototype.step = function (dt) {
    if (this.gameOver) return;
    this._substep(dt);
    this.time += dt;
    if (this.saveTime > 0) this.saveTime = Math.max(0, this.saveTime - dt);
    // seguridad: bola inmovil fuera del carril y de los flíperes durante mucho tiempo
    var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (sp < 20 && !this.canPlunge()) this.stuck += dt; else this.stuck = 0;
    if (this.stuck > 5) {
      this.vx += (Math.random() < 0.5 ? -1 : 1) * 900; this.vy -= 1200; this.stuck = 0;
      this.emit('nudge');
    }
  };

  Table.prototype.setFlippers = function (L, R) {
    if (L !== this.pressed.L) this.emit(L ? 'flipUp' : 'flipDown', { side: 'L' });
    if (R !== this.pressed.R) this.emit(R ? 'flipUp' : 'flipDown', { side: 'R' });
    this.pressed.L = L; this.pressed.R = R;
  };

  // lanzador: held = esta pulsado
  Table.prototype.updatePlunger = function (held, dt) {
    if (held && this.canPlunge()) {
      var prev = this.charge;
      this.charge = Math.min(1, this.charge + dt * 0.9);
      if (Math.floor(prev * 8) !== Math.floor(this.charge * 8)) this.emit('pull', { c: this.charge });
    } else if (this.charge > 0) {
      if (this.canPlunge()) this.launch(this.charge);
      this.charge = 0;
    }
  };

  // efectos visuales (flash, engranaje)
  Table.prototype.updateFx = function (dt) {
    var i;
    for (i = 0; i < this.segs.length; i++) if (this.segs[i].flash > 0) this.segs[i].flash = Math.max(0, this.segs[i].flash - dt * 4);
    for (i = 0; i < this.circs.length; i++) if (this.circs[i].flash > 0) this.circs[i].flash = Math.max(0, this.circs[i].flash - dt * 5);
    this.gearAng += this.gearSpin * dt;
    this.gearSpin *= Math.max(0, 1 - dt * 1.2);
    if (this.gearCool > 0) this.gearCool -= dt;
  };

  root.Physics = { Table: Table, SUBDT: SUBDT };
  if (typeof module !== 'undefined') module.exports = root.Physics;
})(typeof window !== 'undefined' ? window : globalThis);
