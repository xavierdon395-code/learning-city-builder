/**
 * 全站深空动态背景：繁星、流星、星座连线、星云漂移
 */
(function () {
  "use strict";

  var ZODIAC_BY_MONTH = [
    { sym: "♑", name: "摩羯" },
    { sym: "♒", name: "水瓶" },
    { sym: "♓", name: "双鱼" },
    { sym: "♈", name: "白羊" },
    { sym: "♉", name: "金牛" },
    { sym: "♊", name: "双子" },
    { sym: "♋", name: "巨蟹" },
    { sym: "♌", name: "狮子" },
    { sym: "♍", name: "处女" },
    { sym: "♎", name: "天秤" },
    { sym: "♏", name: "天蝎" },
    { sym: "♐", name: "射手" },
  ];

  function currentZodiac() {
    var m = new Date().getMonth();
    return ZODIAC_BY_MONTH[m] || ZODIAC_BY_MONTH[0];
  }

  function hydrateZodiacElements() {
    var z = currentZodiac();
    document.querySelectorAll("[data-zodiac-slot]").forEach(function (el) {
      el.textContent = z.sym;
      el.setAttribute("title", "本月星座 · " + z.name);
      el.setAttribute("aria-label", z.name);
    });
  }

  function initCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var farStars = [];
    var midStars = [];
    var nearStars = [];
    var meteor = null;

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function createFarStars() {
      farStars = [];
      for (var i = 0; i < 80; i++) {
        farStars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: rand(0.2, 0.6),
          phase: Math.random() * Math.PI * 2,
          twinkle: rand(0.2, 0.5),
          alpha: rand(0.2, 0.5),
        });
      }
    }

    function createMidStars() {
      midStars = [];
      for (var i = 0; i < 35; i++) {
        midStars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: rand(0.6, 1.2),
          vx: Math.random() < 0.5 ? -0.05 : 0.05,
          phase: Math.random() * Math.PI * 2,
          twinkle: rand(0.5, 0.9),
          alpha: rand(0.3, 0.65),
        });
      }
    }

    function createNearStars() {
      nearStars = [];
      for (var i = 0; i < 8; i++) {
        var isGold = i < 4;
        nearStars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: rand(1.2, 2.7),
          isGold: isGold,
          color: isGold ? "#C9A84C" : "#ffffff",
          phase: Math.random() * Math.PI * 2,
          twinkle: rand(0.8, 1.3),
          alpha: rand(0.45, 0.9),
        });
      }
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = window.innerWidth;
      var h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createFarStars();
      createMidStars();
      createNearStars();
    }

    resize();
    window.addEventListener("resize", resize);

    function drawFarLayer(now) {
      for (var i = 0; i < farStars.length; i++) {
        var s = farStars[i];
        var tw = 0.55 + 0.45 * Math.sin(now * 0.001 * s.twinkle + s.phase);
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255," + s.alpha * tw + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawMidLayer(now, w) {
      for (var i = 0; i < midStars.length; i++) {
        var s = midStars[i];
        s.x += s.vx;
        if (s.x < -2) s.x = w + 2;
        if (s.x > w + 2) s.x = -2;
        var breathe = 0.6 + 0.4 * Math.sin(now * 0.0013 * s.twinkle + s.phase);
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255," + s.alpha * breathe + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawNearLayer(now) {
      for (var i = 0; i < nearStars.length; i++) {
        var s = nearStars[i];
        var pulse = 0.7 + 0.3 * Math.sin(now * 0.0016 * s.twinkle + s.phase);
        var coreAlpha = s.alpha * pulse;
        var glowR = s.r * 4;
        var gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        gradient.addColorStop(0, "rgba(" + (s.isGold ? "201,168,76" : "255,255,255") + "," + coreAlpha * 0.45 + ")");
        gradient.addColorStop(1, "rgba(" + (s.isGold ? "201,168,76" : "255,255,255") + ",0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "rgba(" + (s.isGold ? "201,168,76" : "255,255,255") + "," + coreAlpha + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function spawnMeteor(w, h) {
      var len = rand(60, 100);
      var speed = rand(8, 12);
      var dx = 1;
      var dy = 1;
      var norm = Math.sqrt(dx * dx + dy * dy);
      dx /= norm;
      dy /= norm;
      meteor = {
        x: rand(-30, w * 0.2),
        y: rand(-40, h * 0.18),
        dx: dx,
        dy: dy,
        speed: speed,
        len: len,
        life: 1,
        decay: rand(0.014, 0.02),
      };
    }

    function drawMeteor() {
      if (!meteor) return;
      meteor.x += meteor.dx * meteor.speed;
      meteor.y += meteor.dy * meteor.speed;
      meteor.life -= meteor.decay;
      if (meteor.life <= 0) {
        meteor = null;
        return;
      }
      var x = meteor.x;
      var y = meteor.y;
      var tx = x - meteor.dx * meteor.len;
      var ty = y - meteor.dy * meteor.len;
      ctx.save();
      var grd = ctx.createLinearGradient(x, y, tx, ty);
      grd.addColorStop(0, "rgba(255,255,255," + meteor.life + ")");
      grd.addColorStop(0.35, "rgba(201,168,76," + meteor.life * 0.65 + ")");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      ctx.fillStyle = "#08090d";
      ctx.fillRect(0, 0, w, h);
      drawFarLayer(now);
      drawMidLayer(now, w);
      drawNearLayer(now);
      if (!meteor && Math.random() < 0.003) spawnMeteor(w, h);
      drawMeteor();

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function boot() {
    hydrateZodiacElements();
    var canvas = document.getElementById("cosmos-bg");
    if (canvas) initCanvas(canvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function zodiacForMonthIndex(monthIndex0) {
    return ZODIAC_BY_MONTH[monthIndex0 % 12] || ZODIAC_BY_MONTH[0];
  }

  window.CosmosBackground = {
    currentZodiac: currentZodiac,
    hydrateZodiacElements: hydrateZodiacElements,
    zodiacForMonthIndex: zodiacForMonthIndex,
  };
})();
