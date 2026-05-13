/**
 * 任务完成：金色星光粒子自按钮处散开（非像素块）
 */
(function (global) {
  "use strict";

  function runEffect(canvas, clientX, clientY) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var gold = "rgba(232, 201, 122,";
    var parts = [];
    var i;
    for (i = 0; i < 32; i++) {
      var a = (i / 32) * Math.PI * 2;
      var sp = 2.5 + Math.random() * 4;
      parts.push({
        x: clientX,
        y: clientY,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 38 + Math.random() * 28,
        r: 2 + Math.random() * 3,
        hue: 38 + Math.random() * 18,
      });
    }
    for (i = 0; i < 18; i++) {
      parts.push({
        x: clientX + (Math.random() - 0.5) * 24,
        y: clientY + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 50 + Math.random() * 30,
        r: 1.5 + Math.random() * 2,
        hue: 45,
      });
    }

    var start = performance.now();
    function frame(now) {
      var elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      var alive = false;
      for (var p = parts.length - 1; p >= 0; p--) {
        var pt = parts[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.04;
        pt.vx *= 0.985;
        pt.life -= 1;
        if (pt.life <= 0) {
          parts.splice(p, 1);
          continue;
        }
        alive = true;
        var alpha = Math.min(1, pt.life / 40);
        var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 2);
        g.addColorStop(0, "hsla(" + pt.hue + ", 85%, 72%, " + alpha + ")");
        g.addColorStop(1, "hsla(" + pt.hue + ", 70%, 50%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (alive && elapsed < 1800) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    }
    requestAnimationFrame(frame);
  }

  global.TaskFX = { run: runEffect };
})(window);
