/**
 * 开发者测试面板：连续点击右下角空白处 5 次打开。
 * ⚠️ 正式上线前请移除此脚本及 dev-panel.css 引用。
 */
(function () {
  "use strict";

  var HIT_RESET_MS = 2000;
  var HIT_NEED = 5;

  function userPath(uid) {
    return "users/" + uid;
  }

  function getUid() {
    initFirebase();
    var u = firebase.auth().currentUser;
    return u ? u.uid : null;
  }

  function flattenTasks(uid, tree) {
    var rows = [];
    if (!tree || typeof tree !== "object") return rows;
    Object.keys(tree).forEach(function (dateStr) {
      var day = tree[dateStr];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        var t = day[tid];
        rows.push({
          path: userPath(uid) + "/tasks/" + dateStr + "/" + tid,
          dateStr: dateStr,
          tid: tid,
          t: t,
        });
      });
    });
    return rows;
  }

  function setExactCompletedCount(uid, target) {
    var db = initFirebase().db;
    return AppData.loadAllTasks(uid).then(function (tree) {
      var rows = flattenTasks(uid, tree);
      var completed = rows.filter(function (r) {
        return r.t && r.t.completed;
      });
      var incomplete = rows.filter(function (r) {
        return r.t && !r.t.completed;
      });
      var c = completed.length;
      var updates = {};
      if (target < 0) target = 0;

      if (c < target) {
        var need = target - c;
        var i = 0;
        while (i < incomplete.length && need > 0) {
          var r = incomplete[i++];
          updates[r.path + "/completed"] = true;
          updates[r.path + "/completedAt"] = Date.now() - need * 1000;
          need--;
        }
        while (need > 0) {
          var d = new Date();
          d.setDate(d.getDate() - (need % 45));
          var ds = AppData.formatYMD(d);
          var tid = db.ref().push().key;
          var p = userPath(uid) + "/tasks/" + ds + "/" + tid;
          updates[p] = {
            goalId: "_dev_panel",
            goalName: "开发者",
            task: "测试任务",
            duration: "—",
            type: "学习",
            completed: true,
            completedAt: Date.now() - need * 1000,
          };
          need--;
        }
      } else if (c > target) {
        var drop = c - target;
        completed.sort(function (a, b) {
          return (b.t.completedAt || 0) - (a.t.completedAt || 0);
        });
        for (var j = 0; j < drop && j < completed.length; j++) {
          var rc = completed[j];
          updates[rc.path + "/completed"] = false;
          updates[rc.path + "/completedAt"] = null;
        }
      }

      if (!Object.keys(updates).length) return Promise.resolve();
      return db.ref().update(updates);
    }).then(function () {
      return AppData.syncStatsFromTasks(uid);
    });
  }

  function setStreakDays(uid, n) {
    var db = initFirebase().db;
    var todayY = AppData.todayYMD();
    var parts = todayY.split("-").map(Number);
    return AppData.loadAllTasks(uid).then(function (tree) {
      var updates = {};
      for (var i = 0; i < n; i++) {
        var d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() - i);
        var ds = AppData.formatYMD(d);
        var day = (tree && tree[ds]) || {};
        var ids = Object.keys(day);
        var picked = null;
        var j = 0;
        for (; j < ids.length; j++) {
          var t = day[ids[j]];
          if (t && !t.completed) {
            picked = ids[j];
            break;
          }
        }
        if (!picked && ids.length) picked = ids[0];
        if (picked) {
          var tt = day[picked];
          if (!tt.completed) {
            var path = userPath(uid) + "/tasks/" + ds + "/" + picked;
            updates[path + "/completed"] = true;
            updates[path + "/completedAt"] = Date.now() - i * 3600000;
          }
        } else {
          var tid = db.ref().push().key;
          updates[userPath(uid) + "/tasks/" + ds + "/" + tid] = {
            goalId: "_dev_panel",
            goalName: "开发者",
            task: "连续打卡占位",
            duration: "—",
            type: "学习",
            completed: true,
            completedAt: Date.now() - i * 3600000,
          };
        }
      }
      if (!Object.keys(updates).length) return Promise.resolve();
      return db.ref().update(updates);
    }).then(function () {
      return AppData.syncStatsFromTasks(uid);
    });
  }

  function unlockAllAchievements(uid) {
    var db = initFirebase().db;
    var list = (window.Achievements && Achievements.ACHIEVEMENTS) || [];
    var updates = {};
    for (var i = 0; i < list.length; i++) {
      var def = list[i];
      updates[userPath(uid) + "/achievements/" + def.id] = {
        unlockedAt: Date.now(),
        notified: true,
      };
    }
    return db.ref().update(updates);
  }

  function resetAchievements(uid) {
    var db = initFirebase().db;
    var u = {};
    u[userPath(uid) + "/achievements"] = null;
    u[userPath(uid) + "/profile/devPauseAchCheck"] = true;
    u[userPath(uid) + "/profile/devPauseAchCheckAt"] = firebase.database.ServerValue.TIMESTAMP;
    return db.ref().update(u);
  }

  function recheckAchievements(uid) {
    var db = initFirebase().db;
    return db
      .ref(userPath(uid) + "/profile/devPauseAchCheck")
      .set(false)
      .then(function () {
        if (!window.Achievements || !Achievements.checkAchievements) return Promise.resolve();
        return Achievements.checkAchievements(uid).then(function () {
          return Achievements.flushUnnotifiedCelebrations(uid, "ach-celebrate");
        });
      });
  }

  function unlockOneAchievement(uid, id) {
    if (!id) return Promise.reject(new Error("请选择徽章"));
    return initFirebase().db.ref(userPath(uid) + "/achievements/" + id).set({
      unlockedAt: Date.now(),
      notified: true,
    });
  }

  function completeFirstGoal(uid) {
    var db = initFirebase().db;
    return AppData.loadGoals(uid).then(function (goals) {
      var ids = Object.keys(goals || {});
      if (!ids.length) return Promise.reject(new Error("暂无目标"));
      var sorted = ids
        .map(function (id) {
          return { id: id, g: goals[id] };
        })
        .sort(function (a, b) {
          return (a.g.createdAt || 0) - (b.g.createdAt || 0);
        });
      var first = sorted[0];
      return AppData.loadAllTasks(uid).then(function (tree) {
        var updates = {};
        Object.keys(tree || {}).forEach(function (dateStr) {
          var day = tree[dateStr];
          if (!day) return;
          Object.keys(day).forEach(function (tid) {
            var t = day[tid];
            if (!t || t.goalId !== first.id) return;
            if (!t.completed) {
              var path = userPath(uid) + "/tasks/" + dateStr + "/" + tid;
              updates[path + "/completed"] = true;
              updates[path + "/completedAt"] = Date.now();
            }
          });
        });
        updates[userPath(uid) + "/goals/" + first.id + "/progress"] = 100;
        if (!Object.keys(updates).length) {
          updates[userPath(uid) + "/goals/" + first.id + "/progress"] = 100;
        }
        return db.ref().update(updates);
      });
    }).then(function () {
      return AppData.syncStatsFromTasks(uid);
    });
  }

  function clearAllGoalsData(uid) {
    var root = userPath(uid);
    var db = initFirebase().db;
    return db
      .ref()
      .update({
        [root + "/goals"]: null,
        [root + "/tasks"]: null,
        [root + "/stats"]: null,
      });
  }

  function simulateCompleteAtHour(uid, hour) {
    var db = initFirebase().db;
    var ymd = AppData.todayYMD();
    return AppData.loadTasksForDate(uid, ymd).then(function (day) {
      var ids = Object.keys(day || {});
      var d = new Date();
      d.setHours(hour, 0, 0, 0);
      var ts = d.getTime();
      if (ids.length) {
        var tid = ids[0];
        var path = userPath(uid) + "/tasks/" + ymd + "/" + tid;
        var u = {};
        u[path + "/completed"] = true;
        u[path + "/completedAt"] = ts;
        return db.ref().update(u);
      }
      var newId = db.ref().push().key;
      return db.ref(userPath(uid) + "/tasks/" + ymd + "/" + newId).set({
        goalId: "_dev_panel",
        goalName: "开发者",
        task: hour < 12 ? "清晨测试" : "夜间测试",
        duration: "—",
        type: "学习",
        completed: true,
        completedAt: ts,
      });
    }).then(function () {
      return AppData.syncStatsFromTasks(uid);
    });
  }

  function buildPanelHTML() {
    return (
      '<div class="dev-panel-overlay" id="dev-panel-overlay" hidden>' +
      '  <div class="dev-panel" id="dev-panel-box" role="dialog" aria-modal="true" aria-label="开发者面板">' +
      '    <button type="button" class="dev-panel__close" id="dev-panel-close" title="关闭">×</button>' +
      '    <p class="dev-panel__warn">⚠️ 开发者模式，正式上线前请移除</p>' +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">0. 帮助</h3>' +
      '      <p class="muted" style="margin:0 0 6px;font-size:12px;color:#888">手机号登录依赖 Firebase Authentication「电话」登录方式与 reCAPTCHA 配置；如收不到验证码请检查控制台设置、配额与账单状态。</p>' +
      '      <p class="muted" style="margin:0;font-size:12px;color:#888">部署到 GitHub Pages 时，请将当前域名加入 Firebase 控制台「Authentication → 设置 → 授权网域」。</p>' +
      "    </div>" +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">1. 任务数控制</h3>' +
      '      <p class="dev-panel__stat">当前累计完成：<strong id="dev-stat-tasks">—</strong></p>' +
      '      <div class="dev-panel__row">' +
      '        <label>设为 <input type="number" min="0" class="dev-panel__input" id="dev-input-tasks" value="0" /> 个</label>' +
      '        <button type="button" class="dev-btn dev-btn--primary" id="dev-apply-tasks">应用</button>' +
      "      </div>" +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn" data-dev-task="1">+1</button>' +
      '        <button type="button" class="dev-btn" data-dev-task="5">+5</button>' +
      '        <button type="button" class="dev-btn" data-dev-task="10">+10</button>' +
      '        <button type="button" class="dev-btn" data-dev-task="50">+50</button>' +
      '        <button type="button" class="dev-btn" data-dev-task="100">+100</button>' +
      '        <button type="button" class="dev-btn" data-dev-task="999">设为999</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">2. 连续打卡控制</h3>' +
      '      <p class="dev-panel__stat">当前连续天数：<strong id="dev-stat-streak">—</strong></p>' +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn" data-dev-streak="3">设为3天</button>' +
      '        <button type="button" class="dev-btn" data-dev-streak="7">设为7天</button>' +
      '        <button type="button" class="dev-btn" data-dev-streak="14">设为14天</button>' +
      '        <button type="button" class="dev-btn" data-dev-streak="30">设为30天</button>' +
      '        <button type="button" class="dev-btn" data-dev-streak="100">设为100天</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">3. 成就控制</h3>' +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn dev-btn--primary" id="dev-ach-all">一键解锁全部</button>' +
      '        <button type="button" class="dev-btn dev-btn--danger" id="dev-ach-reset">一键重置全部</button>' +
      "      </div>" +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn" id="dev-ach-recheck">手动重新检测成就</button>' +
      "      </div>" +
      '      <div class="dev-panel__row">' +
      '        <select class="dev-panel__select" id="dev-ach-select"><option value="">选择徽章…</option></select>' +
      '        <button type="button" class="dev-btn" id="dev-ach-one">解锁所选</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">4. 目标控制</h3>' +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn" id="dev-goal-complete">标记第一个目标已完成</button>' +
      '        <button type="button" class="dev-btn dev-btn--danger" id="dev-goal-clear">清除所有目标数据</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="dev-panel__section">' +
      '      <h3 class="dev-panel__title">5. 时间模拟</h3>' +
      '      <p class="muted" style="margin:0 0 8px;font-size:12px;color:#888">将今日一条完成记录的完成时间改为本地 6:00 或 22:00，用于触发成就检测。</p>' +
      '      <div class="dev-panel__row">' +
      '        <button type="button" class="dev-btn" id="dev-time-morning">模拟早晨6点</button>' +
      '        <button type="button" class="dev-btn" id="dev-time-night">模拟深夜22点</button>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div class="dev-panel-hit" id="dev-panel-hit" aria-hidden="true"></div>' +
      '<button type="button" class="dev-panel-fab" id="dev-panel-fab" title="开发者面板">DEV</button>'
    );
  }

  function fillAchievementSelect(selectEl) {
    var list = (window.Achievements && Achievements.ACHIEVEMENTS) || [];
    while (selectEl.options.length > 1) selectEl.remove(1);
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      var opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.icon + " " + d.name + " (" + d.id + ")";
      selectEl.appendChild(opt);
    }
  }

  function refreshDevStats(uid) {
    return Promise.all([AppData.loadAllTasks(uid), AppData.loadLeaves(uid)]).then(function (res) {
      var tree = res[0];
      var leaves = res[1];
      var n = AppData.countCompletedAll(tree);
      var st = AppData.computeStreaks(tree, leaves);
      var elT = document.getElementById("dev-stat-tasks");
      var elS = document.getElementById("dev-stat-streak");
      if (elT) elT.textContent = String(n);
      if (elS) elS.textContent = String(st.currentStreak);
      var inp = document.getElementById("dev-input-tasks");
      if (inp) inp.value = String(n);
    });
  }

  function runThenReload(promise) {
    promise
      .then(function () {
        window.location.reload();
      })
      .catch(function (e) {
        console.error(e);
        alert(e && e.message ? e.message : String(e));
      });
  }

  function runThenRefresh(uid, promise) {
    promise
      .then(function () {
        return refreshDevStats(uid);
      })
      .then(function () {
        if (window.Achievements && Achievements.renderWall) {
          return Achievements.renderWall(uid);
        }
      })
      .catch(function (e) {
        console.error(e);
        alert(e && e.message ? e.message : String(e));
      });
  }

  function openPanel() {
    var uid = getUid();
    if (!uid) {
      alert("请先登录后再使用开发者面板。");
      return;
    }
    var ov = document.getElementById("dev-panel-overlay");
    if (!ov) return;
    ov.hidden = false;
    fillAchievementSelect(document.getElementById("dev-ach-select"));
    refreshDevStats(uid).catch(function (e) {
      console.error(e);
    });
  }

  function closePanel() {
    var ov = document.getElementById("dev-panel-overlay");
    if (ov) ov.hidden = true;
  }

  function init() {
    if (document.getElementById("dev-panel-hit")) return;

    var wrap = document.createElement("div");
    wrap.innerHTML = buildPanelHTML();
    while (wrap.firstChild) {
      document.body.appendChild(wrap.firstChild);
    }

    var hit = document.getElementById("dev-panel-hit");
    var fab = document.getElementById("dev-panel-fab");
    var ov = document.getElementById("dev-panel-overlay");
    var hits = 0;
    var tmr = null;

    hit.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      hits += 1;
      if (tmr) clearTimeout(tmr);
      if (hits >= HIT_NEED) {
        hits = 0;
        openPanel();
        return;
      }
      tmr = setTimeout(function () {
        hits = 0;
      }, HIT_RESET_MS);
    });
    if (fab) {
      fab.addEventListener("click", function (e) {
        e.preventDefault();
        openPanel();
      });
    }

    document.getElementById("dev-panel-close").addEventListener("click", closePanel);

    document.getElementById("dev-apply-tasks").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      var v = parseInt(document.getElementById("dev-input-tasks").value, 10);
      if (isNaN(v) || v < 0) v = 0;
      runThenRefresh(uid, setExactCompletedCount(uid, v));
    });

    document.querySelectorAll("[data-dev-task]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var uid = getUid();
        if (!uid) return;
        var delta = btn.getAttribute("data-dev-task");
        if (delta === "999") {
          runThenRefresh(uid, setExactCompletedCount(uid, 999));
          return;
        }
        AppData.loadAllTasks(uid)
          .then(function (tree) {
            var c = AppData.countCompletedAll(tree);
            return setExactCompletedCount(uid, c + parseInt(delta, 10));
          })
          .then(function () {
            return refreshDevStats(uid);
          })
          .then(function () {
            if (window.Achievements && Achievements.renderWall) {
              return Achievements.renderWall(uid);
            }
          })
          .catch(function (e) {
            console.error(e);
            alert(e && e.message ? e.message : String(e));
          });
      });
    });

    document.querySelectorAll("[data-dev-streak]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var uid = getUid();
        if (!uid) return;
        var n = parseInt(btn.getAttribute("data-dev-streak"), 10);
        runThenRefresh(uid, setStreakDays(uid, n));
      });
    });

    document.getElementById("dev-ach-all").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      if (!window.Achievements || !Achievements.ACHIEVEMENTS || !Achievements.ACHIEVEMENTS.length) {
        alert("当前页面未加载 achievements.js，无法解锁成就列表。");
        return;
      }
      runThenReload(unlockAllAchievements(uid));
    });

    document.getElementById("dev-ach-reset").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      if (!confirm("确定重置所有成就？将暂停自动成就检测，需手动重新检测后才会回填。")) return;
      runThenReload(resetAchievements(uid));
    });

    document.getElementById("dev-ach-recheck").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      runThenReload(recheckAchievements(uid));
    });

    document.getElementById("dev-ach-one").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      var id = document.getElementById("dev-ach-select").value;
      runThenReload(unlockOneAchievement(uid, id));
    });

    document.getElementById("dev-goal-complete").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      runThenReload(completeFirstGoal(uid));
    });

    document.getElementById("dev-goal-clear").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      if (!confirm("将删除所有目标、任务与统计缓存，确定？")) return;
      runThenReload(clearAllGoalsData(uid));
    });

    document.getElementById("dev-time-morning").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      runThenReload(simulateCompleteAtHour(uid, 6));
    });

    document.getElementById("dev-time-night").addEventListener("click", function () {
      var uid = getUid();
      if (!uid) return;
      runThenReload(simulateCompleteAtHour(uid, 22));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
