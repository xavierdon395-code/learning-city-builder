(function () {
  "use strict";

  // 十二星座真实星图坐标（viewBox 0 0 100 100）
  var ARIES = [
    { x: 18, y: 42 },
    { x: 28, y: 38 },
    { x: 38, y: 35 },
    { x: 48, y: 38 },
    { x: 58, y: 45 },
    { x: 68, y: 50 },
    { x: 75, y: 55 },
    { x: 80, y: 62 },
    { x: 72, y: 48 },
    { x: 62, y: 42 },
    { x: 52, y: 42 },
    { x: 42, y: 45 },
    { x: 32, y: 48 },
  ];
  var ARIES_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [3, 9],
    [9, 10],
    [10, 11],
    [11, 12],
  ];

  var TAURUS = [
    { x: 50, y: 25 },
    { x: 45, y: 30 },
    { x: 55, y: 30 },
    { x: 40, y: 38 },
    { x: 50, y: 38 },
    { x: 60, y: 38 },
    { x: 35, y: 45 },
    { x: 45, y: 45 },
    { x: 55, y: 45 },
    { x: 65, y: 45 },
    { x: 30, y: 55 },
    { x: 42, y: 55 },
    { x: 58, y: 55 },
    { x: 70, y: 55 },
    { x: 25, y: 65 },
    { x: 38, y: 68 },
    { x: 50, y: 70 },
    { x: 62, y: 68 },
    { x: 75, y: 65 },
  ];
  var TAURUS_LINES = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 5],
    [3, 6],
    [5, 9],
    [6, 10],
    [9, 13],
    [10, 14],
    [13, 18],
    [14, 15],
    [15, 16],
    [16, 17],
    [17, 18],
  ];

  var GEMINI = [
    { x: 30, y: 20 },
    { x: 35, y: 30 },
    { x: 30, y: 42 },
    { x: 25, y: 55 },
    { x: 30, y: 68 },
    { x: 22, y: 80 },
    { x: 38, y: 80 },
    { x: 35, y: 42 },
    { x: 65, y: 22 },
    { x: 70, y: 32 },
    { x: 65, y: 44 },
    { x: 60, y: 57 },
    { x: 65, y: 70 },
    { x: 57, y: 82 },
    { x: 73, y: 82 },
    { x: 70, y: 44 },
    { x: 50, y: 50 },
  ];
  var GEMINI_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [4, 6],
    [2, 7],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [12, 14],
    [10, 15],
    [7, 16],
    [16, 15],
  ];

  var CANCER = [
    { x: 50, y: 25 },
    { x: 35, y: 35 },
    { x: 65, y: 35 },
    { x: 25, y: 50 },
    { x: 50, y: 48 },
    { x: 75, y: 50 },
    { x: 30, y: 65 },
    { x: 70, y: 65 },
    { x: 40, y: 75 },
    { x: 60, y: 75 },
  ];
  var CANCER_LINES = [
    [0, 4],
    [4, 1],
    [4, 2],
    [1, 3],
    [2, 5],
    [3, 6],
    [5, 7],
    [6, 8],
    [7, 9],
  ];

  var LEO = [
    { x: 15, y: 30 },
    { x: 22, y: 25 },
    { x: 30, y: 22 },
    { x: 38, y: 25 },
    { x: 42, y: 32 },
    { x: 38, y: 42 },
    { x: 30, y: 48 },
    { x: 40, y: 55 },
    { x: 52, y: 58 },
    { x: 65, y: 60 },
    { x: 78, y: 62 },
    { x: 85, y: 55 },
    { x: 75, y: 72 },
    { x: 60, y: 75 },
    { x: 50, y: 68 },
  ];
  var LEO_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [10, 12],
    [12, 13],
    [13, 14],
    [14, 8],
  ];

  var VIRGO = [
    { x: 15, y: 25 },
    { x: 25, y: 30 },
    { x: 35, y: 32 },
    { x: 45, y: 38 },
    { x: 55, y: 42 },
    { x: 50, y: 50 },
    { x: 42, y: 55 },
    { x: 38, y: 62 },
    { x: 30, y: 70 },
    { x: 25, y: 78 },
    { x: 65, y: 48 },
    { x: 75, y: 55 },
    { x: 80, y: 65 },
    { x: 72, y: 75 },
    { x: 60, y: 78 },
  ];
  var VIRGO_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [5, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 14],
  ];

  var LIBRA = [
    { x: 20, y: 30 },
    { x: 50, y: 22 },
    { x: 80, y: 30 },
    { x: 25, y: 45 },
    { x: 75, y: 45 },
    { x: 50, y: 50 },
    { x: 50, y: 62 },
    { x: 30, y: 72 },
    { x: 50, y: 78 },
    { x: 70, y: 72 },
  ];
  var LIBRA_LINES = [
    [0, 1],
    [1, 2],
    [0, 3],
    [2, 4],
    [3, 5],
    [5, 4],
    [5, 6],
    [6, 7],
    [6, 9],
    [7, 8],
    [8, 9],
  ];

  var SCORPIUS = [
    { x: 15, y: 25 },
    { x: 22, y: 30 },
    { x: 30, y: 32 },
    { x: 25, y: 40 },
    { x: 35, y: 42 },
    { x: 42, y: 45 },
    { x: 50, y: 50 },
    { x: 55, y: 58 },
    { x: 62, y: 62 },
    { x: 68, y: 65 },
    { x: 75, y: 62 },
    { x: 82, y: 55 },
    { x: 85, y: 45 },
    { x: 80, y: 38 },
    { x: 72, y: 42 },
    { x: 65, y: 50 },
    { x: 58, y: 55 },
    { x: 48, y: 62 },
  ];
  var SCORPIUS_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [16, 17],
  ];

  var SAGITTARIUS = [
    { x: 20, y: 25 },
    { x: 28, y: 30 },
    { x: 35, y: 38 },
    { x: 42, y: 45 },
    { x: 50, y: 48 },
    { x: 58, y: 50 },
    { x: 50, y: 55 },
    { x: 42, y: 60 },
    { x: 35, y: 68 },
    { x: 30, y: 75 },
    { x: 65, y: 42 },
    { x: 72, y: 38 },
    { x: 80, y: 32 },
    { x: 85, y: 25 },
    { x: 55, y: 62 },
    { x: 62, y: 70 },
    { x: 70, y: 78 },
  ];
  var SAGITTARIUS_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [4, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [4, 14],
    [14, 15],
    [15, 16],
  ];

  var CAPRICORNUS = [
    { x: 18, y: 35 },
    { x: 28, y: 30 },
    { x: 38, y: 32 },
    { x: 48, y: 38 },
    { x: 58, y: 42 },
    { x: 68, y: 42 },
    { x: 78, y: 38 },
    { x: 82, y: 48 },
    { x: 75, y: 58 },
    { x: 62, y: 62 },
    { x: 48, y: 62 },
    { x: 32, y: 55 },
    { x: 22, y: 48 },
  ];
  var CAPRICORNUS_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 0],
  ];

  var AQUARIUS = [
    { x: 25, y: 22 },
    { x: 35, y: 25 },
    { x: 45, y: 28 },
    { x: 55, y: 30 },
    { x: 65, y: 32 },
    { x: 75, y: 35 },
    { x: 50, y: 40 },
    { x: 45, y: 48 },
    { x: 55, y: 48 },
    { x: 40, y: 58 },
    { x: 50, y: 58 },
    { x: 60, y: 58 },
    { x: 35, y: 68 },
    { x: 50, y: 70 },
    { x: 65, y: 68 },
    { x: 45, y: 78 },
    { x: 55, y: 78 },
  ];
  var AQUARIUS_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [3, 6],
    [6, 7],
    [6, 8],
    [7, 9],
    [8, 11],
    [9, 10],
    [10, 11],
    [10, 13],
    [12, 13],
    [13, 14],
    [13, 15],
    [13, 16],
  ];

  var PISCES = [
    { x: 15, y: 30 },
    { x: 22, y: 25 },
    { x: 30, y: 22 },
    { x: 25, y: 32 },
    { x: 32, y: 38 },
    { x: 38, y: 42 },
    { x: 45, y: 48 },
    { x: 50, y: 55 },
    { x: 55, y: 62 },
    { x: 62, y: 68 },
    { x: 70, y: 72 },
    { x: 78, y: 75 },
    { x: 85, y: 72 },
    { x: 82, y: 65 },
    { x: 75, y: 58 },
    { x: 68, y: 55 },
    { x: 62, y: 50 },
    { x: 55, y: 50 },
  ];
  var PISCES_LINES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [16, 17],
    [17, 7],
  ];

  var ZODIACS = [
    { key: "aries", name: "白羊座", en: "Aries", symbol: "♈", stars: ARIES, lines: ARIES_LINES },
    { key: "taurus", name: "金牛座", en: "Taurus", symbol: "♉", stars: TAURUS, lines: TAURUS_LINES },
    { key: "gemini", name: "双子座", en: "Gemini", symbol: "♊", stars: GEMINI, lines: GEMINI_LINES },
    { key: "cancer", name: "巨蟹座", en: "Cancer", symbol: "♋", stars: CANCER, lines: CANCER_LINES },
    { key: "leo", name: "狮子座", en: "Leo", symbol: "♌", stars: LEO, lines: LEO_LINES },
    { key: "virgo", name: "处女座", en: "Virgo", symbol: "♍", stars: VIRGO, lines: VIRGO_LINES },
    { key: "libra", name: "天秤座", en: "Libra", symbol: "♎", stars: LIBRA, lines: LIBRA_LINES },
    { key: "scorpius", name: "天蝎座", en: "Scorpius", symbol: "♏", stars: SCORPIUS, lines: SCORPIUS_LINES },
    { key: "sagittarius", name: "射手座", en: "Sagittarius", symbol: "♐", stars: SAGITTARIUS, lines: SAGITTARIUS_LINES },
    { key: "capricornus", name: "摩羯座", en: "Capricornus", symbol: "♑", stars: CAPRICORNUS, lines: CAPRICORNUS_LINES },
    { key: "aquarius", name: "水瓶座", en: "Aquarius", symbol: "♒", stars: AQUARIUS, lines: AQUARIUS_LINES },
    { key: "pisces", name: "双鱼座", en: "Pisces", symbol: "♓", stars: PISCES, lines: PISCES_LINES },
  ];

  var TOTAL_ZODIAC_STARS = ZODIACS.reduce(function (sum, z) {
    return sum + z.stars.length;
  }, 0);
  var zodiacUiState = {
    currentPageIndex: null,
    didEnterAnim: false,
    lastUnlockedCount: 0,
    lastCurrent: null,
  };

  function animateNumber(el, target, duration) {
    if (!el) return;
    var end = Number(target) || 0;
    var start = 0;
    var t0 = null;
    function tick(now) {
      if (t0 == null) t0 = now;
      var p = Math.min(1, (now - t0) / (duration || 400));
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function runStatAnimations() {
    var grid = document.getElementById("st-stat-grid");
    if (!grid || grid.dataset.animated) return;
    grid.dataset.animated = "1";
    animateNumber(document.getElementById("st-total-days"), Number(grid.dataset.animDays || 0), 400);
    animateNumber(document.getElementById("st-total-tasks"), Number(grid.dataset.animTasks || 0), 400);
    animateNumber(document.getElementById("st-cur-streak"), Number(grid.dataset.animCur || 0), 400);
    animateNumber(document.getElementById("st-long-streak"), Number(grid.dataset.animLong || 0), 400);
  }

  function renderGoalRates(goalsRaw, allTasks, container) {
    container.innerHTML = "";
    var ids = Object.keys(goalsRaw || {});
    if (ids.length === 0) {
      container.innerHTML = '<p class="muted">暂无目标数据</p>';
      return;
    }
    ids
      .map(function (id) {
        return { id: id, g: goalsRaw[id] };
      })
      .sort(function (a, b) {
        return (b.g.createdAt || 0) - (a.g.createdAt || 0);
      })
      .forEach(function (row) {
        var prog = AppData.goalProgressFromTasks(allTasks, row.id);
        var pct = typeof row.g.progress === "number" ? row.g.progress : prog.pct;
        var wrap = document.createElement("div");
        wrap.className = "stats-goal-row";
        wrap.style.marginBottom = "12px";
        wrap.innerHTML =
          '<div class="stats-goal-row__head"><span class="stats-goal-ico" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg></span>' +
          '<div><div class="stats-goal-name"></div>' +
          '<div class="muted stats-goal-sub"></div></div></div>' +
          '<div class="pixel-progress pixel-progress--goal"></div>';
        wrap.querySelector(".stats-goal-name").textContent = row.g.name || "目标";
        wrap.querySelector(".stats-goal-sub").textContent =
          "完成 " + prog.done + " / " + prog.total + " · " + pct + "%";
        GoalUI.renderPixelBar(wrap.querySelector(".pixel-progress"), pct, 14);
        container.appendChild(wrap);
      });
  }

  function renderBarChart(rows, container) {
    container.innerHTML = "";
    var max = Math.max(
      1,
      rows.reduce(function (m, r) {
        return Math.max(m, r.count);
      }, 0)
    );
    rows.forEach(function (r) {
      var item = document.createElement("div");
      item.className = "bar-item";
      var hPct = Math.round((r.count / max) * 100);
      var stack = document.createElement("div");
      stack.className = "bar-stack-gradient";
      var fill = document.createElement("div");
      fill.className = "bar-stack-gradient__fill";
      fill.style.height = "0%";
      var lab = document.createElement("div");
      lab.className = "bar-label";
      lab.textContent = r.label;
      var c = document.createElement("div");
      c.className = "bar-label";
      c.textContent = String(r.count);
      stack.appendChild(fill);
      item.appendChild(lab);
      item.appendChild(c);
      item.appendChild(stack);
      container.appendChild(item);
      requestAnimationFrame(function () {
        fill.style.height = hPct + "%";
      });
    });
  }

  function renderTypeStack(dist, container, legend) {
    container.innerHTML = "";
    legend.innerHTML = "";
    var keys = ["学习", "练习", "测验"];
    var sum = 0;
    keys.forEach(function (k) {
      sum += dist[k] || 0;
    });
    if (sum === 0) {
      container.innerHTML = '<p class="muted">暂无已完成任务类型数据</p>';
      return;
    }
    var row = document.createElement("div");
    row.className = "type-stack-inner";
    var segClass = { 学习: "type-stack-seg type-stack-seg--study", 练习: "type-stack-seg type-stack-seg--practice", 测验: "type-stack-seg type-stack-seg--quiz" };
    keys.forEach(function (k) {
      var n = dist[k] || 0;
      if (n === 0) return;
      var seg = document.createElement("div");
      seg.className = segClass[k] || "type-stack-seg";
      seg.style.flex = String(n);
      seg.style.minWidth = n > 0 ? "8px" : "0";
      row.appendChild(seg);
    });
    container.appendChild(row);

    keys.forEach(function (k) {
      var n = dist[k] || 0;
      var pct = sum ? Math.round((n / sum) * 100) : 0;
      var line = document.createElement("div");
      line.className = "pie-swatch";
      var swatchClass =
        k === "学习" ? "swatch swatch--study" : k === "练习" ? "swatch swatch--practice" : "swatch swatch--quiz";
      line.innerHTML =
        '<span class="' + swatchClass + '"></span>' +
        "<span>" +
        k +
        " · " +
        n +
        "（" +
        pct +
        "%）</span>";
      legend.appendChild(line);
    });
  }

  function loadUnlockedCount(uid) {
    initFirebase();
    return firebase
      .database()
      .ref("users/" + uid + "/achievements")
      .once("value")
      .then(function (s) {
        var map = s.val() || {};
        var n = 0;
        Object.keys(map).forEach(function (id) {
          if (map[id] && map[id].unlockedAt) n++;
        });
        return n;
      })
      .catch(function () {
        return 0;
      });
  }

  function getCurrentZodiac(unlockedCount) {
    var litTotal = Math.max(0, Math.min(unlockedCount, TOTAL_ZODIAC_STARS));
    var acc = 0;
    for (var i = 0; i < ZODIACS.length; i++) {
      var total = ZODIACS[i].stars.length;
      if (litTotal <= acc + total) {
        return {
          index: i,
          zodiac: ZODIACS[i],
          litStars: Math.max(0, litTotal - acc),
          totalStars: total,
          allDone: litTotal >= TOTAL_ZODIAC_STARS,
        };
      }
      acc += total;
    }
    var last = ZODIACS[ZODIACS.length - 1];
    return {
      index: ZODIACS.length - 1,
      zodiac: last,
      litStars: last.stars.length,
      totalStars: last.stars.length,
      allDone: true,
    };
  }

  function buildZodiacProgress(unlockedCount) {
    var litTotal = Math.max(0, Math.min(unlockedCount, TOTAL_ZODIAC_STARS));
    var rest = litTotal;
    return ZODIACS.map(function (z) {
      var lit = Math.max(0, Math.min(rest, z.stars.length));
      rest -= lit;
      return {
        zodiac: z,
        lit: lit,
        total: z.stars.length,
        completed: lit >= z.stars.length,
      };
    });
  }

  function renderZodiacSvg(zodiac, litStars, animateEnter) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "zodiac-chart__svg");
    (zodiac.lines || []).forEach(function (lnPair) {
      var a = zodiac.stars[lnPair[0]];
      var b = zodiac.stars[lnPair[1]];
      if (!a || !b) return;
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      var lit = lnPair[0] < litStars && lnPair[1] < litStars;
      line.setAttribute("class", "zodiac-chart__line" + (lit ? " is-lit" : " is-dark"));
      if (lit && animateEnter) {
        line.classList.add("is-drawing");
        line.style.animationDelay = litStars * 80 + "ms";
      }
      svg.appendChild(line);
    });
    (zodiac.stars || []).forEach(function (p, idx) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", p.x);
      c.setAttribute("cy", p.y);
      var lit = idx < litStars;
      c.setAttribute("class", "zodiac-chart__star" + (lit ? " is-lit" : " is-dark"));
      c.setAttribute("r", lit ? "1.4" : "0.9");
      if (lit && animateEnter) {
        c.style.animation = "zodiac-star-enter 320ms var(--ease-out) both, twinkle 3s ease-in-out infinite";
        c.style.animationDelay = idx * 80 + "ms, " + (idx * 80 + 320) + "ms";
      } else if (lit) {
        c.style.animation = "twinkle 3s ease-in-out infinite";
        c.style.animationDelay = idx * 40 + "ms";
      }
      svg.appendChild(c);
    });
    return svg;
  }

  function renderStreakOrbit(unlockedCount, switching) {
    var host = document.getElementById("st-streak-orbit");
    if (!host) return;
    host.innerHTML = "";
    var totalLit = Math.max(0, Math.min(unlockedCount, TOTAL_ZODIAC_STARS));
    var current = getCurrentZodiac(totalLit);
    var progress = buildZodiacProgress(totalLit);

    if (zodiacUiState.currentPageIndex == null) zodiacUiState.currentPageIndex = current.index;
    if (zodiacUiState.currentPageIndex > current.index) zodiacUiState.currentPageIndex = current.index;
    var pageIndex = zodiacUiState.currentPageIndex;
    var page = progress[pageIndex] || progress[current.index];
    var pageZodiac = page.zodiac;
    var pageLit = page.lit;
    var pageTotal = page.total;
    var playEnterAnim = !zodiacUiState.didEnterAnim && pageIndex === current.index;

    var wrap = document.createElement("div");
    wrap.className = "zodiac-map";

    var canvas = document.createElement("div");
    canvas.className = "zodiac-map__canvas-wrap" + (switching ? " is-switch-in" : "");
    canvas.appendChild(renderZodiacSvg(pageZodiac, pageLit, playEnterAnim));
    wrap.appendChild(canvas);

    var info = document.createElement("div");
    info.className = "zodiac-map__info";
    var title = document.createElement("div");
    title.className = "zodiac-map__title";
    title.textContent = pageZodiac.name + " " + pageZodiac.en;
    var sub = document.createElement("div");
    sub.className = "zodiac-map__sub";
    sub.textContent = pageLit + " / " + pageTotal + " 颗星";
    var all = document.createElement("div");
    all.className = "zodiac-map__all";
    all.textContent = "已点亮 " + totalLit + " / " + TOTAL_ZODIAC_STARS + " 颗星 · 第" + (current.index + 1) + "座星图";
    var bar = document.createElement("div");
    bar.className = "zodiac-map__progress";
    var fill = document.createElement("div");
    fill.className = "zodiac-map__progress-fill";
    fill.style.width = Math.round((totalLit / TOTAL_ZODIAC_STARS) * 100) + "%";
    bar.appendChild(fill);
    var status = document.createElement("div");
    status.className = "zodiac-map__status";
    if (current.allDone) {
      status.textContent = "✦ 十二星座尽数点亮，你已成为传奇 ✦";
    } else if (current.litStars >= current.totalStars && current.index < ZODIACS.length - 1) {
      status.textContent = "✨ " + current.zodiac.name + "已点亮，下一站：" + ZODIACS[current.index + 1].name;
    } else {
      status.textContent = "再解锁 1 项成就点亮下一颗星";
    }
    info.appendChild(title);
    info.appendChild(sub);
    info.appendChild(all);
    info.appendChild(bar);
    info.appendChild(status);
    wrap.appendChild(info);

    var icons = document.createElement("div");
    icons.className = "zodiac-icons";
    progress.forEach(function (p, idx) {
      var dot = document.createElement("div");
      dot.className =
        "zodiac-icon" +
        (p.completed ? " is-complete" : "") +
        (idx === current.index && !p.completed ? " is-current" : "") +
        (!(p.lit > 0 || p.completed) ? " is-locked" : "");
      dot.title = p.zodiac.name + " " + p.zodiac.en + " · " + p.lit + "/" + p.total + " 颗星";
      dot.innerHTML = "<span>" + (p.lit > 0 || p.completed ? p.zodiac.symbol : "🔒") + "</span>";
      icons.appendChild(dot);
    });
    wrap.appendChild(icons);

    host.appendChild(wrap);
    zodiacUiState.lastUnlockedCount = totalLit;
    zodiacUiState.lastCurrent = current;
    zodiacUiState.didEnterAnim = true;

    var prev = document.getElementById("st-zodiac-prev");
    var next = document.getElementById("st-zodiac-next");
    if (prev) prev.disabled = pageIndex <= 0;
    if (next) next.disabled = pageIndex >= current.index;
  }

  function switchZodiacPage(delta) {
    if (!zodiacUiState.lastCurrent) return;
    var maxIndex = zodiacUiState.lastCurrent.index;
    var cur = zodiacUiState.currentPageIndex == null ? maxIndex : zodiacUiState.currentPageIndex;
    var target = Math.max(0, Math.min(maxIndex, cur + delta));
    if (target === cur) return;
    var host = document.getElementById("st-streak-orbit");
    var oldCanvas = host ? host.querySelector(".zodiac-map__canvas-wrap") : null;
    if (oldCanvas) oldCanvas.classList.add("is-switch-out");
    window.setTimeout(function () {
      zodiacUiState.currentPageIndex = target;
      renderStreakOrbit(zodiacUiState.lastUnlockedCount, true);
    }, 200);
  }

  var weeklyListenersBound = false;
  /** 当前自然周范围，供周复盘 meta 与 render 共用 */
  var weeklyReportRangeCache = null;

  function padWeeklyMeta2(n) {
    return String(n).padStart(2, "0");
  }

  /** Firebase RTDB 读出的 updatedAt：毫秒时间戳 */
  function weeklyMetaTimestampMs(ts) {
    if (ts == null) return NaN;
    if (typeof ts === "number" && isFinite(ts)) return ts;
    if (typeof ts === "object" && ts && typeof ts.toMillis === "function") return ts.toMillis();
    return NaN;
  }

  function formatWeeklyUpdatedHm(ms) {
    var d = new Date(ms);
    return (
      d.getFullYear() +
      "-" +
      padWeeklyMeta2(d.getMonth() + 1) +
      "-" +
      padWeeklyMeta2(d.getDate()) +
      " " +
      padWeeklyMeta2(d.getHours()) +
      ":" +
      padWeeklyMeta2(d.getMinutes())
    );
  }

  function buildWeeklyMetaLine(range, doc) {
    if (!range || !range.weekId) return "—";
    var ws = AppData.formatYMD(range.start);
    var we = AppData.formatYMD(range.end);
    var line = "本周 " + range.weekId + "（" + ws + " ~ " + we + "）";
    if (doc && doc.updatedAt != null) {
      var ms = weeklyMetaTimestampMs(doc.updatedAt);
      if (isFinite(ms)) {
        line += " · 上次更新：" + formatWeeklyUpdatedHm(ms);
      }
    }
    return line;
  }

  function applyWeeklyMetaLine(doc) {
    var metaEl = document.getElementById("st-weekly-meta");
    if (!metaEl || !weeklyReportRangeCache) return;
    metaEl.textContent = buildWeeklyMetaLine(weeklyReportRangeCache, doc || null);
  }

  /** 生成失败时避免重复叠提示语 */
  function appendWeeklyGenErrorHint(msg) {
    var m = String(msg || "").trim();
    if (!m) return "生成失败。可稍后再试或点击「重新生成」。";
    if (/重新生成|未配置 DeepSeek/.test(m)) return m;
    return m + " 可稍后再试或点击「重新生成」。";
  }

  function renderWeeklyHistory() {
    if (window.WeeklyReportModal && typeof WeeklyReportModal.renderHistory === "function") {
      return WeeklyReportModal.renderHistory("wr-history-section");
    }
    return Promise.resolve();
  }

  function clearWeeklyError() {
    var el = document.getElementById("st-weekly-error");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function setWeeklyError(msg) {
    var el = document.getElementById("st-weekly-error");
    if (!el) return;
    el.textContent = msg || "出错了";
    el.hidden = false;
  }

  function setWeeklyLoading(on) {
    var sec = document.getElementById("st-weekly-report");
    var load = document.getElementById("st-weekly-loading");
    var gen = document.getElementById("st-weekly-generate");
    var reg = document.getElementById("st-weekly-regenerate");
    if (sec) sec.setAttribute("aria-busy", on ? "true" : "false");
    if (load) load.hidden = !on;
    if (on) {
      if (gen) gen.disabled = true;
      if (reg) reg.disabled = true;
    } else {
      var hasCache = gen && gen.dataset.hasCache === "1";
      if (gen) gen.disabled = !!hasCache;
      if (reg) reg.disabled = !hasCache;
    }
  }

  function syncWeeklyButtons(hasCache) {
    var gen = document.getElementById("st-weekly-generate");
    var reg = document.getElementById("st-weekly-regenerate");
    if (gen) {
      gen.dataset.hasCache = hasCache ? "1" : "0";
      gen.disabled = !!hasCache;
    }
    if (reg) {
      reg.dataset.hasCache = hasCache ? "1" : "0";
      reg.disabled = !hasCache;
    }
  }

  function appendListSection(host, title, items) {
    var sub = document.createElement("p");
    sub.className = "muted weekly-report__label";
    sub.textContent = title;
    host.appendChild(sub);
    var ul = document.createElement("ul");
    ul.className = "weekly-report__list";
    for (var i = 0; i < items.length; i++) {
      var li = document.createElement("li");
      li.textContent = items[i];
      ul.appendChild(li);
    }
    host.appendChild(ul);
  }

  function renderWeeklyDoc(doc) {
    var body = document.getElementById("st-weekly-body");
    if (!body) return;
    body.innerHTML = "";
    clearWeeklyError();

    if (doc && doc.ai) {
      try {
        if (typeof WeeklyReportAI !== "undefined" && WeeklyReportAI.validateAi) {
          WeeklyReportAI.validateAi(doc.ai);
        }
      } catch (ve) {
        console.error(ve);
        setWeeklyError("本地保存的复盘数据不完整或已过期，请点击「重新生成」恢复。");
        var broken = document.createElement("p");
        broken.className = "muted";
        broken.textContent = "无法展示缓存内容时，请使用「重新生成」拉取新的复盘。";
        body.appendChild(broken);
        syncWeeklyButtons(false);
        applyWeeklyMetaLine(null);
        return;
      }
    }

    if (!doc || !doc.ai) {
      if (doc && !doc.ai) {
        setWeeklyError("本地保存的复盘数据不完整，请点击「重新生成」恢复。");
        var bad = document.createElement("p");
        bad.className = "muted";
        bad.textContent = "无法读取有效的复盘正文，请使用「重新生成」。";
        body.appendChild(bad);
      } else {
        var empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "本周尚未生成复盘，点击下方按钮生成。";
        body.appendChild(empty);
      }
      syncWeeklyButtons(false);
      applyWeeklyMetaLine(doc || null);
      return;
    }
    var ai = doc.ai;
    var snap = doc.stats_snapshot;
    if (snap && Number(snap.tasks_planned || 0) === 0) {
      var emptyWeek = document.createElement("p");
      emptyWeek.className = "muted";
      emptyWeek.style.marginBottom = "12px";
      emptyWeek.textContent = "本周尚无排期任务，以下为模型根据当前数据的简要参考。";
      body.appendChild(emptyWeek);
    }
    var headline = document.createElement("p");
    headline.className = "weekly-report__headline";
    headline.textContent = ai.headline || "";
    body.appendChild(headline);

    if (ai.highlights && ai.highlights.length) {
      appendListSection(body, "亮点", ai.highlights);
    }
    if (ai.watchouts && ai.watchouts.length) {
      appendListSection(body, "注意", ai.watchouts);
    }
    if (ai.next_week_focus && ai.next_week_focus.length) {
      appendListSection(body, "下周重点", ai.next_week_focus);
    }
    var rule = document.createElement("div");
    rule.className = "weekly-report__rule";
    body.appendChild(rule);
    var tone = document.createElement("p");
    tone.className = "weekly-report__tone muted";
    tone.textContent = ai.tone_note || "";
    body.appendChild(tone);
    syncWeeklyButtons(true);
    applyWeeklyMetaLine(doc);
  }

  function initWeeklyReport(uid) {
    if (typeof WeeklyReportData === "undefined" || typeof AppData === "undefined") {
      var m = document.getElementById("st-weekly-meta");
      if (m) m.textContent = "周复盘依赖未加载";
      return;
    }
    var metaEl = document.getElementById("st-weekly-meta");
    var range = WeeklyReportData.getWeekRange(new Date());
    weeklyReportRangeCache = range;
    if (metaEl) {
      metaEl.textContent = buildWeeklyMetaLine(range, null);
    }
    AppData.loadWeeklyReport(uid, range.weekId)
      .then(function (doc) {
        if (doc) {
          renderWeeklyDoc(doc);
        } else {
          var body = document.getElementById("st-weekly-body");
          if (body) body.innerHTML = "";
          var empty = document.createElement("p");
          empty.className = "muted";
          empty.textContent = "本周尚未生成复盘，点击下方按钮生成。";
          if (body) body.appendChild(empty);
          syncWeeklyButtons(false);
          applyWeeklyMetaLine(null);
        }
      })
      .catch(function (e) {
        console.error(e);
        setWeeklyError(appendWeeklyGenErrorHint(e.message || "加载周复盘失败"));
      });
  }

  function bindWeeklyReportListeners() {
    if (weeklyListenersBound) return;
    weeklyListenersBound = true;
    var gen = document.getElementById("st-weekly-generate");
    var reg = document.getElementById("st-weekly-regenerate");
    if (gen) {
      gen.addEventListener("click", function () {
        var u = firebase.auth().currentUser;
        if (!u || typeof WeeklyReportAI === "undefined") return;
        clearWeeklyError();
        setWeeklyLoading(true);
        WeeklyReportAI.generate(u.uid, { force: false })
          .then(function (res) {
            renderWeeklyDoc(res.doc);
            return renderWeeklyHistory();
          })
          .catch(function (e) {
            console.error(e);
            setWeeklyError(appendWeeklyGenErrorHint(e.message || "生成失败"));
          })
          .then(function () {
            setWeeklyLoading(false);
          });
      });
    }
    if (reg) {
      reg.addEventListener("click", function () {
        if (!confirm("将重新请求 AI 并覆盖本周已保存的复盘，确定？")) return;
        var u = firebase.auth().currentUser;
        if (!u || typeof WeeklyReportAI === "undefined") return;
        clearWeeklyError();
        setWeeklyLoading(true);
        WeeklyReportAI.generate(u.uid, { force: true })
          .then(function (res) {
            renderWeeklyDoc(res.doc);
            return renderWeeklyHistory();
          })
          .catch(function (e) {
            console.error(e);
            setWeeklyError(appendWeeklyGenErrorHint(e.message || "重新生成失败"));
          })
          .then(function () {
            setWeeklyLoading(false);
          });
      });
    }
  }

  function refresh(user) {
    var uid = user.uid;
    Promise.all([AppData.loadProfile(uid), AppData.loadAllTasks(uid), AppData.loadGoals(uid), AppData.loadLeaves(uid), loadUnlockedCount(uid)]).then(function (res) {
      var profile = res[0];
      var allTasks = res[1];
      var goalsRaw = res[2];
      var leavesMap = res[3];
      var unlockedCount = res[4];

      AppShared.hydrateUserChip(user, profile);

      var bioEl = document.getElementById("st-profile-bio");
      if (bioEl) {
        bioEl.value = (profile && (profile.bio || profile.intro)) || "";
      }

      var streaks = AppData.computeStreaks(allTasks, leavesMap);
      var completed = AppData.countCompletedAll(allTasks);

      var grid = document.getElementById("st-stat-grid");
      if (grid) {
        grid.dataset.animDays = String(streaks.totalDays);
        grid.dataset.animTasks = String(completed);
        grid.dataset.animCur = String(streaks.currentStreak);
        grid.dataset.animLong = String(streaks.longestStreak);
        grid.dataset.animated = "";
      }
      document.getElementById("st-total-days").textContent = "0";
      document.getElementById("st-total-tasks").textContent = "0";
      document.getElementById("st-cur-streak").textContent = "0";
      document.getElementById("st-long-streak").textContent = "0";

      renderGoalRates(goalsRaw, allTasks, document.getElementById("st-goals"));

      var week = AppData.lastNDaysCounts(allTasks, 7);
      renderBarChart(week, document.getElementById("st-bar-chart"));

      var dist = AppData.typeDistribution(allTasks);
      renderTypeStack(dist, document.getElementById("st-type-bar"), document.getElementById("st-type-legend"));

      renderStreakOrbit(unlockedCount);

      var gridObs = document.getElementById("st-stat-grid");
      if (gridObs) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) {
                runStatAnimations();
                io.disconnect();
              }
            });
          },
          { threshold: 0.15 }
        );
        io.observe(gridObs);
      }

      initWeeklyReport(uid);
      renderWeeklyHistory();
    });
  }

  function bindPdfExportButton(user) {
    var btnExport = document.getElementById("btn-export-pdf");
    if (!btnExport || !window.PDFExport) return;
    btnExport.addEventListener("click", function () {
      btnExport.disabled = true;
      btnExport.textContent = "生成中...";
      AppData.loadProfile(user.uid)
        .catch(function () {
          return null;
        })
        .then(function (profile) {
          var userName = "LEARNER";
          if (profile && profile.englishName && String(profile.englishName).trim()) {
            userName = String(profile.englishName).trim();
          } else if (
            profile &&
            profile.nickname &&
            /^[A-Za-z0-9_\s]+$/.test(String(profile.nickname).trim())
          ) {
            userName = String(profile.nickname).trim();
          }
          return PDFExport.exportPDF({
            uid: user.uid,
            userName: String(userName).trim().toUpperCase(),
          });
        })
        .catch(function (err) {
          console.error("PDF 导出失败", err);
          alert("PDF 导出失败，请重试");
        })
        .then(function () {
          btnExport.disabled = false;
          btnExport.textContent = "导出 PDF";
        });
    });
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("stats");
      AppShared.pageEnterTransition();
      var prevBtn = document.getElementById("st-zodiac-prev");
      var nextBtn = document.getElementById("st-zodiac-next");
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          switchZodiacPage(-1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          switchZodiacPage(1);
        });
      }
      refresh(user);
      bindWeeklyReportListeners();
      bindPdfExportButton(user);

      var saveBio = document.getElementById("st-save-bio");
      if (saveBio) {
        saveBio.addEventListener("click", function () {
          var v = (document.getElementById("st-profile-bio") || {}).value || "";
          initFirebase();
          firebase
            .database()
            .ref(AppData.userRoot(user.uid) + "/profile/bio")
            .set(v.trim())
            .then(function () {
              if (window.Achievements) {
                return Achievements.checkAchievements(user.uid);
              }
            })
            .then(function () {
              alert("已保存个人简介");
            })
            .catch(function (e) {
              console.error(e);
              alert(e.message || "保存失败");
            });
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
