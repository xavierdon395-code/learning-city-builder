/**
 * HTML5 Canvas 像素城市场景（requestAnimationFrame）
 * 天空/地面/道路/建筑/行人/粒子均在 Canvas 内绘制；
 * 云朵为 DOM 叠加层 + CSS 横向飘动（见 city-clouds.css 或 app.css）
 */
(function (global) {
  "use strict";

  var REF_W = 360;
  var REF_H = 200;

  var C = {
    skyTop: "#4A90D9",
    skyBot: "#F5FBFF",
    sun: "#FFD700",
    sunRay: "#FFE566",
    grass1: "#7BC47F",
    grass2: "#5A9E5E",
    dirt: "#8B6340",
    road: "#9E9E9E",
    roadDark: "#757575",
    wood: "#C4A265",
    woodDark: "#8B6340",
    stone: "#9E9E9E",
    stoneDark: "#6D6D6D",
    gold: "#FFD700",
    white: "#F8F8F8",
    black: "#2C1810",
    brick: "#B8956A",
    cabinWall: "#A67C52",
    door: "#8B4513",
    flagRed: "#C0392B",
    torch: "#FF8C00",
    water: "#4FC3F7",
  };

  function tierIdx(n) {
    if (n >= 50) return 6;
    if (n >= 35) return 5;
    if (n >= 20) return 4;
    if (n >= 10) return 3;
    if (n >= 5) return 2;
    return 1;
  }

  function fillBlock(ctx, x, y, w, h, color, light, dark) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    if (light) {
      ctx.fillStyle = light;
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, h);
    }
    if (dark) {
      ctx.fillStyle = dark;
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, h);
    }
  }

  function drawSun(ctx, ox, oy, s, t) {
    var cx = ox + 300 * s;
    var cy = oy + 18 * s;
    var pulse = 1 + Math.sin(t / 400) * 0.04;
    var rs = 5 * s * pulse;
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + t / 2000;
      var len = 14 * s * pulse;
      fillBlock(
        ctx,
        cx + Math.cos(a) * (rs + 4) - 2 * s,
        cy + Math.sin(a) * (rs + 4) - 2 * s,
        4 * s,
        4 * s,
        C.sunRay
      );
    }
    fillBlock(ctx, cx - rs, cy - rs, rs * 2, rs * 2, C.sun, "#FFF59D", "#F9A825");
  }

  function drawGround(ctx, ox, oy, gw, gh, s) {
    var groundTop = oy + gh * 0.52;
    var jag = [];
    var x = 0;
    while (x <= gw) {
      jag.push(groundTop + (Math.sin(x * 0.08) * 2 + (x % 7)) * s);
      x += 4 * s;
    }
    ctx.fillStyle = C.grass1;
    ctx.beginPath();
    ctx.moveTo(ox, groundTop + 40 * s);
    for (var i = 0; i < jag.length; i++) {
      ctx.lineTo(ox + i * 4 * s, jag[i]);
    }
    ctx.lineTo(ox + gw, oy + gh);
    ctx.lineTo(ox, oy + gh);
    ctx.closePath();
    ctx.fill();

    fillBlock(ctx, ox, groundTop + 12 * s, gw, 16 * s, C.grass2);
    fillBlock(ctx, ox, groundTop + 28 * s, gw, 24 * s, C.dirt);

    for (var g = 0; g < 24; g++) {
      var gx = ox + ((g * 47 + 13) % Math.floor(gw - 8));
      var gy = groundTop + 6 * s + (g % 3) * s;
      fillBlock(ctx, gx, gy, 2 * s, 4 * s, "#4E8F52");
      fillBlock(ctx, gx + 2 * s, gy - 2 * s, 2 * s, 3 * s, "#4E8F52");
    }
  }

  function drawRoad(ctx, ox, oy, gw, gh, s, roadY) {
    var y = roadY;
    var h = 10 * s;
    fillBlock(ctx, ox, y, gw, h, C.road, "#BDBDBD", C.roadDark);
    for (var rx = ox; rx < ox + gw; rx += 8 * s) {
      fillBlock(ctx, rx, y + h / 2 - s, 4 * s, 2 * s, C.roadDark);
    }
  }

  function drawCabin(ctx, bx, by, w, h, s, t) {
    fillBlock(ctx, bx, by, w, h, C.cabinWall, "#C4A265", "#6D4C41");
    var roofH = 14 * s;
    for (var i = 0; i < 6; i++) {
      var rw = w - i * 6 * s;
      var rx = bx + (w - rw) / 2;
      fillBlock(ctx, rx, by - roofH + i * 2 * s, rw, 2 * s, "#5D4037", "#8D6E63", "#3E2723");
    }
    fillBlock(ctx, bx + w * 0.35, by + h * 0.35, 10 * s, 10 * s, C.white, null, C.black);
    fillBlock(ctx, bx + w * 0.35 + 4 * s, by + h * 0.35, 2 * s, 10 * s, C.black);
    fillBlock(ctx, bx + w * 0.35, by + h * 0.35 + 4 * s, 10 * s, 2 * s, C.black);
    fillBlock(ctx, bx + w * 0.55, by + h * 0.55, 8 * s, h * 0.45, C.door, "#A1887F", "#3E2723");
    var smokeT = t / 300;
    for (var p = 0; p < 3; p++) {
      var sy = by - roofH - p * 5 * s - (smokeT % 3) * 2 * s;
      var sx = bx + w * 0.5 + Math.sin(smokeT + p) * 3 * s;
      fillBlock(ctx, sx, sy, 4 * s, 4 * s, "rgba(200,200,200,0.75)");
    }
  }

  function drawLibrary(ctx, bx, by, w, h, s, t) {
    fillBlock(ctx, bx, by, w, h, "#CFD8DC", "#ECEFF1", "#78909C");
    for (var wx = 0; wx < 3; wx++) {
      var col = ["#42A5F5", "#66BB6A", "#FFEE58"][wx % 3];
      fillBlock(ctx, bx + 8 * s + wx * 16 * s, by + 10 * s, 10 * s, 12 * s, col, C.white, C.black);
    }
    var archW = 18 * s;
    fillBlock(ctx, bx + w / 2 - archW / 2, by + h - 22 * s, archW, 22 * s, "#37474F", "#546E7A", C.black);
    fillBlock(ctx, bx + w / 2 - archW / 2 + 3 * s, by + h - 19 * s, archW - 6 * s, 19 * s, "#263238");
    var flagWave = Math.sin(t / 250) * 4 * s;
    fillBlock(ctx, bx + w / 2 - 2 * s, by - 20 * s, 4 * s, 20 * s, C.woodDark);
    fillBlock(ctx, bx + w / 2 + 2 * s, by - 18 * s + flagWave, 14 * s, 10 * s, C.flagRed, "#E57373", "#B71C1C");
    function tree(tx) {
      fillBlock(ctx, tx, by + h - 28 * s, 6 * s, 28 * s, "#6D4C41");
      fillBlock(ctx, tx - 6 * s, by + h - 40 * s, 18 * s, 16 * s, "#43A047", "#66BB6A", "#2E7D32");
    }
    tree(bx - 8 * s);
    tree(bx + w - 10 * s);
  }

  function drawTraining(ctx, bx, by, w, h, s, t) {
    fillBlock(ctx, bx, by, w, h, "#757575", "#9E9E9E", "#424242");
    var flick = 0.6 + Math.abs(Math.sin(t / 120)) * 0.4;
    fillBlock(ctx, bx + w / 2 - 4 * s, by - 6 * s, 8 * s, 8 * s, "rgba(255,140,0," + flick + ")");
    fillBlock(ctx, bx + 8 * s, by + 12 * s, 8 * s, 18 * s, "#3E2723");
    fillBlock(ctx, bx + 10 * s, by + 8 * s, 4 * s, 6 * s, "#5D4037");
    for (var fx = bx - 4 * s; fx < bx + w; fx += 10 * s) {
      fillBlock(ctx, fx, by + h - 8 * s, 4 * s, 8 * s, C.woodDark, C.wood, "#5D4037");
      fillBlock(ctx, fx + 4 * s, by + h - 6 * s, 6 * s, 2 * s, C.wood);
    }
  }

  function drawClock(ctx, bx, by, w, h, s, t) {
    fillBlock(ctx, bx, by, w, h, C.stone, "#BDBDBD", C.stoneDark);
    var faceY = by + h * 0.35;
    var faceR = 14 * s;
    var cx = bx + w / 2;
    fillBlock(ctx, cx - faceR, faceY - faceR, faceR * 2, faceR * 2, C.white, "#EEE", C.black);
    var d = new Date();
    var angM = (d.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
    var angH = (((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    var cx0 = cx;
    var cy0 = faceY;
    for (var rh = 2 * s; rh < faceR * 0.55; rh += 2 * s) {
      fillBlock(
        ctx,
        cx0 + Math.cos(angH) * rh - 1.5 * s,
        cy0 + Math.sin(angH) * rh - 1.5 * s,
        3 * s,
        3 * s,
        "#424242"
      );
    }
    for (var r = 2 * s; r < faceR - 1 * s; r += 2 * s) {
      fillBlock(
        ctx,
        cx0 + Math.cos(angM) * r - 1.5 * s,
        cy0 + Math.sin(angM) * r - 1.5 * s,
        3 * s,
        3 * s,
        C.black
      );
    }
    var blink = Math.sin(t / 200) > 0;
    if (blink) {
      fillBlock(ctx, bx + 6 * s, by + 10 * s, 4 * s, 4 * s, "#FFF9C4");
      fillBlock(ctx, bx + w - 10 * s, by + 16 * s, 4 * s, 4 * s, "#FFF9C4");
    }
    fillBlock(ctx, bx + w / 2 - 4 * s, by - 16 * s, 8 * s, 16 * s, C.gold, "#FFECB3", "#F57F17");
  }

  function drawGarden(ctx, bx, by, w, h, s, t) {
    fillBlock(ctx, bx, by, w, h * 0.4, "#81C784", "#A5D6A7", "#2E7D32");
    fillBlock(ctx, bx + w * 0.25, by - 16 * s, w * 0.5, 16 * s, C.flagRed, "#EF5350", "#B71C1C");
    for (var i = 0; i < 4; i++) {
      fillBlock(ctx, bx + 4 * s + i * 8 * s, by - 14 * s, 3 * s, 14 * s, C.white, "#EEE", C.black);
    }
    var cols = ["#E53935", "#FDD835", "#8E24AA"];
    for (var fl = 0; fl < 12; fl++) {
      var fx = bx + (fl * 17) % (w - 8);
      var fy = by + h * 0.5 + (fl % 2) * 4 * s;
      fillBlock(ctx, bx + fx, fy, 4 * s, 4 * s, cols[fl % 3]);
    }
    var bf = Math.floor(t / 400) % 2;
    var bx2 = bx + w * 0.6 + Math.sin(t / 500) * 10 * s;
    var by2 = by + h * 0.35 + Math.cos(t / 400) * 6 * s;
    fillBlock(ctx, bx2, by2, 6 * s, 4 * s, bf ? "#AB47BC" : "#CE93D8");
    var fq = (t / 200) % 3;
    fillBlock(ctx, bx + w / 2 - 4 * s, by + h * 0.55 - fq * 4 * s, 8 * s, 4 * s, C.water, "#81D4FA", "#0277BD");
  }

  function drawHall(ctx, bx, by, w, h, s, t, night) {
    fillBlock(ctx, bx, by, w, h, C.brick, "#D7CCC8", "#5D4037");
    fillBlock(ctx, bx + 4 * s, by + h - 28 * s, w - 8 * s, 4 * s, C.gold, "#FFF8E1", "#F57F17");
    for (var c = 0; c < 4; c++) {
      fillBlock(ctx, bx + 10 * s + c * 22 * s, by + h - 26 * s, 10 * s, 26 * s, "#D7CCC8", "#EFEBE9", "#795548");
    }
    var fw = Math.sin(t / 280) * 5 * s;
    fillBlock(ctx, bx + w / 2 - 3 * s, by - 22 * s, 6 * s, 22 * s, "#5D4037");
    fillBlock(ctx, bx + w / 2 + 3 * s, by - 20 * s + fw, 18 * s, 12 * s, C.flagRed);
    for (var wy = 0; wy < 2; wy++) {
      for (var wx = 0; wx < 3; wx++) {
        var lit = night ? "#FFEB3B" : "#B0BEC5";
        fillBlock(ctx, bx + 14 * s + wx * 20 * s, by + 8 * s + wy * 16 * s, 10 * s, 10 * s, lit, "#FFFDE7", C.black);
      }
    }
  }

  function CityScene(wrapEl, options) {
    this.wrapEl = wrapEl;
    this.canvas = wrapEl.querySelector("canvas");
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      wrapEl.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.preview = !!(options && options.preview);
    this.completed = null;
    this.particles = [];
    this.walkers = [
      { x: 0, f: 0, spd: 0.15 },
      { x: 80, f: 1, spd: 0.12 },
    ];
    this._raf = null;
    this._boundResize = this.resize.bind(this);
    this._start = performance.now();
    window.addEventListener("resize", this._boundResize);
    this.resize();
    this.loop = this.loop.bind(this);
    this._raf = requestAnimationFrame(this.loop);
    this.initClouds();
  }

  CityScene.prototype.initClouds = function () {
    var layer = this.wrapEl.querySelector(".city-cloud-layer");
    if (!layer) return;
    layer.innerHTML = "";
    var n = this.preview ? 3 : 5;
    for (var i = 0; i < n; i++) {
      var cloud = document.createElement("div");
      cloud.className = "pixel-cloud";
      cloud.style.left = Math.random() * 55 + "%";
      cloud.style.top = 6 + Math.random() * 28 + "%";
      cloud.style.animationDuration = 35 + Math.random() * 25 + "s";
      cloud.style.animationDelay = -Math.random() * 30 + "s";
      var blocks = 3 + Math.floor(Math.random() * 3);
      for (var b = 0; b < blocks; b++) {
        var d = document.createElement("span");
        d.className = "pixel-cloud__block";
        d.style.width = 10 + Math.random() * 14 + "px";
        d.style.height = 8 + Math.random() * 10 + "px";
        d.style.left = b * 12 + "px";
        d.style.top = (Math.random() * 6) + "px";
        cloud.appendChild(d);
      }
      layer.appendChild(cloud);
    }
  };

  CityScene.prototype.resize = function () {
    var rect = this.wrapEl.getBoundingClientRect();
    var w = Math.max(200, Math.floor(rect.width));
    var h = Math.floor(w * (REF_H / REF_W));
    if (this.preview) h = Math.max(100, Math.floor(rect.height) || h);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
    this.s = w / REF_W;
  };

  CityScene.prototype.destroy = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._boundResize);
  };

  CityScene.prototype.spawnUnlockStars = function (sx, sy) {
    for (var i = 0; i < 20; i++) {
      var a = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * (1 + Math.random()),
        vy: Math.sin(a) * (1 + Math.random()) - 1.5,
        life: 45 + Math.random() * 20,
        c: i % 2 ? C.gold : "#FFF59D",
        sz: 3 + Math.random() * 2,
      });
    }
  };

  CityScene.prototype.spawnRiseBurst = function () {
    for (var i = 0; i < 18; i++) {
      this.particles.push({
        x: Math.random() * this.W,
        y: this.H + 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -2 - Math.random() * 2,
        life: 50 + Math.random() * 30,
        c: ["#E91E63", "#9C27B0", "#00BCD4", "#FFEB3B", "#4CAF50"][i % 5],
        sz: 4,
      });
    }
  };

  CityScene.prototype.setCompletedCount = function (n) {
    var num = Number(n) || 0;
    if (this.completed === null) {
      this.completed = num;
      return;
    }
    var prevT = tierIdx(this.completed);
    var nextT = tierIdx(num);
    if (nextT > prevT && !this.preview) {
      this.spawnUnlockStars(this.W * 0.55, this.H * 0.38);
    }
    this.completed = num;
  };

  CityScene.prototype.loop = function (now) {
    this._raf = requestAnimationFrame(this.loop);
    var t = now - this._start;
    var ctx = this.ctx;
    var W = this.W;
    var H = this.H;
    var s = this.s;
    var ox = 0;
    var oy = 0;

    var g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.55, "#87CEEB");
    g.addColorStop(1, C.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawSun(ctx, ox, oy, s, t);

    drawGround(ctx, ox, oy, W, H, s);
    var roadY = oy + H * 0.52 + 32 * s;
    drawRoad(ctx, ox, oy, W, H, s, roadY);

    var done = this.completed == null ? 0 : this.completed;
    var buildings = [];
    if (done >= 0) buildings.push({ type: "cabin", min: 0 });
    if (done >= 5) buildings.push({ type: "library", min: 5 });
    if (done >= 10) buildings.push({ type: "training", min: 10 });
    if (done >= 20) buildings.push({ type: "clock", min: 20 });
    if (done >= 35) buildings.push({ type: "garden", min: 35 });
    if (done >= 50) buildings.push({ type: "hall", min: 50 });

    var night = (function () {
      var h = new Date().getHours();
      return h >= 19 || h < 6;
    })();

    var baseY = roadY - 4 * s;
    var totalSlots = buildings.length || 1;
    var spacing = W / (totalSlots + 1);

    for (var i = 0; i < buildings.length; i++) {
      var pers = 0.72 + (i / Math.max(1, totalSlots - 1)) * 0.33;
      var bw = (40 + i * 4) * s * pers;
      var bh = (38 + i * 3) * s * pers;
      if (buildings[i].type === "clock") bh *= 1.9;
      if (buildings[i].type === "hall") {
        bw *= 1.35;
        bh *= 1.25;
      }
      var bx = spacing * (i + 1) - bw / 2;
      var by = baseY - bh;

      switch (buildings[i].type) {
        case "cabin":
          drawCabin(ctx, bx, by, bw, bh, s, t);
          break;
        case "library":
          drawLibrary(ctx, bx, by, bw, bh, s, t);
          break;
        case "training":
          drawTraining(ctx, bx, by, bw, bh, s, t);
          break;
        case "clock":
          drawClock(ctx, bx, by, bw, bh, s, t);
          break;
        case "garden":
          drawGarden(ctx, bx, by, bw, bh, s, t);
          break;
        case "hall":
          drawHall(ctx, bx, by, bw, bh, s, t, night);
          break;
        default:
          break;
      }
    }

    var walkY = roadY + 2 * s;
    for (var wk = 0; wk < this.walkers.length; wk++) {
      var wv = this.walkers[wk];
      wv.x += wv.spd * s * 60 * (1 / 60);
      if (wv.x > W + 20) wv.x = -20;
      wv.f = Math.floor(t / 200 + wk) % 2;
      var wx = ox + wv.x * s;
      fillBlock(ctx, wx, walkY, 4 * s, 10 * s, "#37474F");
      fillBlock(ctx, wx + (wv.f ? 1 : -1) * s, walkY - 5 * s, 4 * s, 4 * s, "#FFCC80");
    }

    for (var p = this.particles.length - 1; p >= 0; p--) {
      var pt = this.particles[p];
      pt.x += pt.vx * s * 2;
      pt.y += pt.vy * s * 2;
      pt.life -= 1;
      pt.vy += 0.04;
      if (pt.life <= 0) {
        this.particles.splice(p, 1);
        continue;
      }
      ctx.fillStyle = pt.c;
      ctx.fillRect(Math.floor(pt.x), Math.floor(pt.y), Math.floor(pt.sz * s), Math.floor(pt.sz * s));
    }
  };

  CityScene.prototype.getSnapshot = function (completed) {
    var prev = this.completed;
    this.completed = completed;
    var dpr = 2;
    var w = Math.floor(this.W * dpr);
    var h = Math.floor(this.H * dpr);
    var snap = document.createElement("canvas");
    snap.width = w;
    snap.height = h;
    var sctx = snap.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.scale(dpr, dpr);
    var ctx = sctx;
    var W = this.W;
    var H = this.H;
    var s = this.s;
    var t = performance.now() - this._start;
    var ox = 0;
    var oy = 0;
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.55, "#87CEEB");
    g.addColorStop(1, C.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawSun(ctx, ox, oy, s, t);
    drawGround(ctx, ox, oy, W, H, s);
    var roadY = oy + H * 0.52 + 32 * s;
    drawRoad(ctx, ox, oy, W, H, s, roadY);
    var buildings = [];
    if (completed >= 0) buildings.push({ type: "cabin" });
    if (completed >= 5) buildings.push({ type: "library" });
    if (completed >= 10) buildings.push({ type: "training" });
    if (completed >= 20) buildings.push({ type: "clock" });
    if (completed >= 35) buildings.push({ type: "garden" });
    if (completed >= 50) buildings.push({ type: "hall" });
    var night = (function () {
      var h0 = new Date().getHours();
      return h0 >= 19 || h0 < 6;
    })();
    var baseY = roadY - 4 * s;
    var totalSlots = buildings.length || 1;
    var spacing = W / (totalSlots + 1);
    for (var i = 0; i < buildings.length; i++) {
      var pers = 0.72 + (i / Math.max(1, totalSlots - 1)) * 0.33;
      var bw = (40 + i * 4) * s * pers;
      var bh = (38 + i * 3) * s * pers;
      if (buildings[i].type === "clock") bh *= 1.9;
      if (buildings[i].type === "hall") {
        bw *= 1.35;
        bh *= 1.25;
      }
      var bx = spacing * (i + 1) - bw / 2;
      var by = baseY - bh;
      switch (buildings[i].type) {
        case "cabin":
          drawCabin(ctx, bx, by, bw, bh, s, t);
          break;
        case "library":
          drawLibrary(ctx, bx, by, bw, bh, s, t);
          break;
        case "training":
          drawTraining(ctx, bx, by, bw, bh, s, t);
          break;
        case "clock":
          drawClock(ctx, bx, by, bw, bh, s, t);
          break;
        case "garden":
          drawGarden(ctx, bx, by, bw, bh, s, t);
          break;
        case "hall":
          drawHall(ctx, bx, by, bw, bh, s, t, night);
          break;
        default:
          break;
      }
    }
    ctx.fillStyle = C.black;
    ctx.font = "12px sans-serif";
    ctx.fillText("学习城市建设者 · 已完成 " + completed + " 个任务", 8, 18);
    this.completed = prev;
    return snap;
  };


  global.CityScene = CityScene;
})(window);
