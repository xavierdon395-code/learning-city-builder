(function () {
  "use strict";

  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playClickSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  function attachGlobalClickSound() {
    document.addEventListener(
      "click",
      function (e) {
        const el = e.target.closest(
          "button, .btn, .bottom-nav a, .link-pill, .task-complete-btn, .city-preview, .share-city"
        );
        if (el && !el.hasAttribute("data-no-sound")) playClickSound();
      },
      true
    );
  }

  function formatTodayChinese() {
    const d = new Date();
    const w = ["日", "一", "二", "三", "四", "五", "六"];
    return (
      d.getFullYear() +
      "年" +
      (d.getMonth() + 1) +
      "月" +
      d.getDate() +
      "日 星期" +
      w[d.getDay()]
    );
  }

  function initialFromName(name) {
    const s = (name || "学").trim();
    if (!s) return "学";
    const m = s.match(/^[a-zA-Z]+/);
    if (m) {
      const two = m[0].slice(0, 2).toUpperCase();
      return two.length === 1 ? two : two;
    }
    return s[0];
  }

  function requireAuth(onUser) {
    initFirebase();
    const { auth } = initFirebase();
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        window.location.href = "../index.html";
        return;
      }
      onUser(user);
    });
  }

  function setupLogout(btnId) {
    const btn = document.getElementById(btnId || "nav-logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      firebase
        .auth()
        .signOut()
        .then(function () {
          window.location.href = "../index.html";
        });
    });
  }

  function hydrateUserChip(user, profile) {
    const nameEl = document.getElementById("nav-user-name");
    const initialEl = document.getElementById("nav-user-initial");
    if (!nameEl || !initialEl) return;
    const name = (profile && profile.name) || defaultDisplayName(user);
    nameEl.textContent = name;
    initialEl.textContent = initialFromName(name);
  }

  function navIconSvg(key) {
    switch (key) {
      case "home":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></svg>';
      case "goals":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>';
      case "achievements":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M5 6H3a2 2 0 0 0 2 3m14-3h2a2 2 0 0 1-2 3" /><path d="M12 13v4M9 21h6" /></svg>';
      case "stats":
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16" /><rect x="6" y="11" width="3" height="7" rx="1" /><rect x="11" y="7" width="3" height="11" rx="1" /><rect x="16" y="4" width="3" height="14" rx="1" /></svg>';
      default:
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>';
    }
  }

  function hydrateBottomNavIcons() {
    document.querySelectorAll(".bottom-nav a").forEach(function (a) {
      var key = a.getAttribute("data-nav") || "";
      var label = a.getAttribute("data-label");
      if (!label) {
        var clone = a.cloneNode(true);
        var em = clone.querySelector(".emoji");
        if (em) em.remove();
        label = clone.textContent.trim();
        a.setAttribute("data-label", label);
      }
      a.innerHTML =
        '<span class="nav-ico" aria-hidden="true">' +
        navIconSvg(key) +
        '</span><span class="nav-label"></span>';
      var lb = a.querySelector(".nav-label");
      if (lb) lb.textContent = label;
    });
  }

  function setBottomNavActive(key) {
    hydrateBottomNavIcons();
    document.querySelectorAll(".bottom-nav a").forEach(function (a) {
      const k = a.getAttribute("data-nav");
      if (k === key) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function pageEnterTransition() {
    document.body.classList.add("page-enter");
    requestAnimationFrame(function () {
      document.body.classList.add("page-enter-active");
    });
  }

  window.AppShared = {
    playClickSound: playClickSound,
    attachGlobalClickSound: attachGlobalClickSound,
    formatTodayChinese: formatTodayChinese,
    initialFromName: initialFromName,
    requireAuth: requireAuth,
    setupLogout: setupLogout,
    hydrateUserChip: hydrateUserChip,
    setBottomNavActive: setBottomNavActive,
    pageEnterTransition: pageEnterTransition,
  };

  document.documentElement.classList.add("js-ready");
})();
