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
      initTopBar(user);
      onUser(user);
    });
  }

  function currentZodiacMonthLabel(dateObj) {
    var month = dateObj.getMonth() + 1;
    var day = dateObj.getDate();
    var zodiacs = [
      [1, 20, "摩羯月"],
      [2, 19, "水瓶月"],
      [3, 21, "双鱼月"],
      [4, 20, "白羊月"],
      [5, 21, "金牛月"],
      [6, 22, "双子月"],
      [7, 23, "巨蟹月"],
      [8, 23, "狮子月"],
      [9, 23, "处女月"],
      [10, 24, "天秤月"],
      [11, 23, "天蝎月"],
      [12, 22, "射手月"],
      [12, 31, "摩羯月"],
    ];
    var current = "金牛月";
    for (var i = 0; i < zodiacs.length; i++) {
      var item = zodiacs[i];
      if (month < item[0] || (month === item[0] && day <= item[1])) {
        current = item[2];
        break;
      }
    }
    return current;
  }

  function initTopBar(userOverride) {
    var user = userOverride || firebase.auth().currentUser;
    var initialEl = document.getElementById("topbar-avatar-initial");
    if (initialEl) {
      var initial = "U";
      if (user) {
        if (user.displayName) {
          initial = user.displayName.slice(0, 1).toUpperCase();
        } else if (user.email) {
          initial = user.email.slice(0, 2).toUpperCase();
        } else if (user.phoneNumber) {
          initial = user.phoneNumber.slice(-2);
        }
      }
      initialEl.textContent = initial;
    }

    var zodiacEl = document.getElementById("topbar-zodiac");
    if (zodiacEl) {
      zodiacEl.textContent = currentZodiacMonthLabel(new Date());
    }
  }

  function logout() {
    firebase
      .auth()
      .signOut()
      .then(function () {
        window.location.href = "../index.html";
      });
  }

  function setupLogout(btnId) {
    const btn = document.getElementById(btnId || "nav-logout");
    if (!btn) return;
    btn.addEventListener("click", logout);
  }

  function hydrateUserChip(user, profile) {
    const nameEl = document.getElementById("nav-user-name");
    const initialEl = document.getElementById("nav-user-initial");
    if (!nameEl || !initialEl) return;
    const name = (profile && profile.name) || defaultDisplayName(user);
    nameEl.textContent = name;
    initialEl.textContent = initialFromName(name);
  }

  function setBottomNavActive(key) {
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
    initTopBar: initTopBar,
    setupLogout: setupLogout,
    hydrateUserChip: hydrateUserChip,
    setBottomNavActive: setBottomNavActive,
    pageEnterTransition: pageEnterTransition,
  };

  window.logout = logout;

  try {
    var sharedAuth = initFirebase().auth;
    sharedAuth.onAuthStateChanged(function (user) {
      if (user) initTopBar(user);
    });
  } catch (e) {
    console.error("Top bar auth init failed:", e);
  }

  document.documentElement.classList.add("js-ready");
})();
