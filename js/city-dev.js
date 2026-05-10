/**
 * 城市页开发者调试工具（仅 city.html 引入）
 */
(function () {
  "use strict";

  var LOGO_CLICKS_NEEDED = 5;
  var logoClickCount = 0;
  var logoClickTimer = null;

  function userBase(uid) {
    return "users/" + uid;
  }

  function devTaskPayload() {
    return {
      goalId: "__dev__",
      goalName: "[调试]",
      task: "调试占位任务",
      duration: "0",
      type: "学习",
      completed: true,
      completedAt: firebase.database.ServerValue.TIMESTAMP,
    };
  }

  function chunkUpdate(uid, dateStr, count) {
    var db = initFirebase().db;
    var updates = {};
    var n = Math.min(count, 100);
    for (var i = 0; i < n; i++) {
      var key = db.ref().push().key;
      updates[userBase(uid) + "/tasks/" + dateStr + "/" + key] = devTaskPayload();
    }
    return db.ref().update(updates).then(function () {
      var rest = count - n;
      if (rest > 0) return chunkUpdate(uid, dateStr, rest);
      return Promise.resolve();
    });
  }

  /** 清空任务后写入恰好 n 条已完成任务 */
  function setCompletedCount(uid, n) {
    var db = initFirebase().db;
    var num = Math.max(0, Math.floor(Number(n) || 0));
    return db
      .ref(userBase(uid) + "/tasks")
      .remove()
      .then(function () {
        if (num === 0) return AppData.syncStatsFromTasks(uid);
        var dateStr = AppData.todayYMD();
        return chunkUpdate(uid, dateStr, num).then(function () {
          return AppData.syncStatsFromTasks(uid);
        });
      });
  }

  function addCompletedTasks(uid, delta) {
    var d = Math.max(0, Math.floor(Number(delta) || 0));
    if (d === 0) return Promise.resolve();
    var dateStr = AppData.todayYMD();
    return chunkUpdate(uid, dateStr, d).then(function () {
      return AppData.syncStatsFromTasks(uid);
    });
  }

  function unlockAllBuildings(uid) {
    return AppData.loadAllTasks(uid).then(function (tree) {
      var c = AppData.countCompletedAll(tree);
      var need = Math.max(0, 55 - c);
      if (need === 0) return AppData.syncStatsFromTasks(uid);
      return addCompletedTasks(uid, need);
    });
  }

  function clearAllUserAppData(uid) {
    var db = initFirebase().db;
    var base = userBase(uid);
    return Promise.all([
      db.ref(base + "/goals").remove(),
      db.ref(base + "/tasks").remove(),
      db.ref(base + "/stats").remove(),
    ]);
  }

  function setStatus(el, text, ok) {
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
    el.style.background = ok ? "#d5f5c8" : "#ffd5d5";
    el.style.border = "3px solid var(--card-edge)";
    el.style.padding = "8px";
    el.style.marginTop = "8px";
    el.style.fontSize = "0.8rem";
  }

  function runAndRefresh(uid, promise, msgEl, okText) {
    return promise
      .then(function () {
        setStatus(msgEl, okText || "已写入 Firebase", true);
        if (typeof window.__cityRefresh === "function") window.__cityRefresh();
      })
      .catch(function (e) {
        console.error(e);
        setStatus(msgEl, (e && e.message) || "操作失败", false);
      });
  }

  function initDevUI(uid) {
    var gear = document.getElementById("city-dev-gear");
    var panel = document.getElementById("city-dev-panel");
    var msgEl = document.getElementById("city-dev-msg");
    var input = document.getElementById("city-dev-input");

    if (!gear || !panel) return;

    gear.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !panel.hidden;
      panel.hidden = open;
      gear.setAttribute("aria-expanded", open ? "false" : "true");
    });

    document.addEventListener("click", function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      panel.hidden = true;
      gear.setAttribute("aria-expanded", "false");
    });

    document.getElementById("city-dev-apply").addEventListener("click", function () {
      var n = Math.max(0, Math.floor(Number(input.value) || 0));
      runAndRefresh(uid, setCompletedCount(uid, n), msgEl, "已设置已完成任务为 " + n);
    });

    document.getElementById("city-dev-add5").addEventListener("click", function () {
      runAndRefresh(uid, addCompletedTasks(uid, 5), msgEl, "已 +5 条已完成任务");
    });
    document.getElementById("city-dev-add10").addEventListener("click", function () {
      runAndRefresh(uid, addCompletedTasks(uid, 10), msgEl, "已 +10 条已完成任务");
    });
    document.getElementById("city-dev-add50").addEventListener("click", function () {
      runAndRefresh(uid, addCompletedTasks(uid, 50), msgEl, "已 +50 条已完成任务");
    });
    document.getElementById("city-dev-zero").addEventListener("click", function () {
      runAndRefresh(uid, setCompletedCount(uid, 0), msgEl, "已重置任务完成数为 0（仅任务数据中的完成记录）");
    });
    document.getElementById("city-dev-unlock").addEventListener("click", function () {
      runAndRefresh(uid, unlockAllBuildings(uid), msgEl, "已补足至解锁全部建筑（≥55 条完成）");
    });
    document.getElementById("city-dev-wipe").addEventListener("click", function () {
      if (!window.confirm("确定清除 goals / tasks / stats？此操作不可撤销。")) return;
      runAndRefresh(uid, clearAllUserAppData(uid), msgEl, "已清除 goals、tasks、stats");
    });
  }

  function bindLogoSecret() {
    var logo = document.getElementById("city-dev-logo-hit");
    var gear = document.getElementById("city-dev-gear");
    if (!logo || !gear) return;

    logo.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        logoClickCount += 1;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(function () {
          logoClickCount = 0;
        }, 2000);
        if (logoClickCount >= LOGO_CLICKS_NEEDED) {
          logoClickCount = 0;
          clearTimeout(logoClickTimer);
          gear.hidden = false;
          gear.setAttribute("aria-hidden", "false");
        }
      },
      true
    );
  }

  function init(uid) {
    bindLogoSecret();
    initDevUI(uid);
  }

  window.CityDev = { init: init };
})();
