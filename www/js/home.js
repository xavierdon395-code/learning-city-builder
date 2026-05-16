(function () {
  "use strict";

  var homeRefreshSeq = 0;

  function asObject(value) {
    return value && typeof value === "object" ? value : {};
  }

  function setHomeFallbackState(message) {
    var listEl = document.getElementById("home-goals-list");
    var emptyEl = document.getElementById("home-goals-empty");
    if (listEl) {
      listEl.innerHTML = "";
      listEl.hidden = true;
    }
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = message || "加载失败，请稍后重试";
    }

    var pendingEl = document.getElementById("home-pending-big");
    if (pendingEl) pendingEl.textContent = "0";

    var labelEl = document.getElementById("home-today-progress-label");
    if (labelEl) labelEl.textContent = "已完成 0 / 0 个任务";

    var barEl = document.getElementById("home-today-pixel-bar");
    if (barEl) GoalUI.renderPixelBar(barEl, 0, 12);
  }

  function refresh(user) {
    var uid = user.uid;
    var seq = ++homeRefreshSeq;
    Promise.all([
      AppData.loadProfile(uid),
      AppData.loadGoals(uid),
      AppData.loadTasksForDate(uid, AppData.todayYMD()),
      AppData.loadAllTasks(uid),
    ])
      .then(function (res) {
        if (seq !== homeRefreshSeq) return;
        res = res || [];
        var profile = asObject(res[0]);
        var goalsRaw = asObject(res[1]);
        var todayTasks = asObject(res[2]);
        var allTasks = asObject(res[3]);

        AppShared.hydrateUserChip(user, profile);

        var zMonthEl = document.getElementById("nav-zodiac-month");
        if (zMonthEl && window.CosmosBackground && CosmosBackground.currentZodiac) {
          zMonthEl.textContent = CosmosBackground.currentZodiac().name + "月";
        }

        var completedTotal = AppData.countCompletedAll(allTasks);

        var todayStr = AppShared.formatTodayChinese();
        document.getElementById("home-date").textContent = todayStr;

        var tids = Object.keys(todayTasks);
        var done = 0;
        var pending = 0;
        tids.forEach(function (id) {
          var t = todayTasks[id];
          if (!t) return;
          if (t.completed) done += 1;
          else pending += 1;
        });
        var totalToday = tids.length;
        document.getElementById("home-pending-big").textContent = String(pending);
        document.getElementById("home-today-progress-label").textContent =
          "已完成 " + done + " / " + totalToday + " 个任务";
        var pct = totalToday ? Math.round((done / totalToday) * 100) : 0;
        GoalUI.renderPixelBar(document.getElementById("home-today-pixel-bar"), pct, 12);

        var goalIds = Object.keys(goalsRaw);
        var listEl = document.getElementById("home-goals-list");
        var emptyEl = document.getElementById("home-goals-empty");
        listEl.innerHTML = "";

        if (goalIds.length === 0) {
          emptyEl.hidden = false;
          listEl.hidden = true;
        } else {
          emptyEl.hidden = true;
          listEl.hidden = false;
          goalIds
            .map(function (id) {
              return { id: id, g: goalsRaw[id] };
            })
            .sort(function (a, b) {
              return (b.g.createdAt || 0) - (a.g.createdAt || 0);
            })
            .forEach(function (row) {
              GoalUI.appendGoalCard(listEl, row, allTasks, {
                onOpenDetail: function (gid) {
                  window.location.href = "goal-detail.html?goalId=" + encodeURIComponent(gid);
                },
                onDeleteRequest: function (gid, name, createdAt) {
                  if (!window.CosmosDialog) return;
                  CosmosDialog.confirmDeleteGoal(name, createdAt, function () {
                    AppData.deleteGoalAndTasks(uid, gid)
                      .then(function () {
                        if (window.Achievements) {
                          return Achievements.checkAchievements(uid);
                        }
                      })
                      .then(function () {
                        refresh(user);
                      })
                      .catch(function (e) {
                        console.error(e);
                        alert(e.message || "删除失败");
                      });
                  });
                },
                onRollingReplan: function (gid, g) {
                  if (!window.CosmosDialog || !window.RollingPlan) return;
                  var sym =
                    window.CosmosBackground && CosmosBackground.zodiacForMonthIndex
                      ? CosmosBackground.zodiacForMonthIndex(new Date().getMonth()).sym
                      : "✦";
                  CosmosDialog.open({
                    zodiac: sym,
                    title: "周计划重排",
                    body:
                      "将根据最近任务完成率微调难度，并生成下一窗 " +
                      (g && g.horizonDays ? g.horizonDays : 10) +
                      " 天日任务（从已排期之后自动顺延）。确认执行？",
                    confirmText: "生成下一窗",
                    onConfirm: function () {
                      RollingPlan.runWeeklyReplan(uid, gid)
                        .then(function () {
                          if (window.Achievements) {
                            return Achievements.checkAchievements(uid);
                          }
                        })
                        .then(function () {
                          refresh(user);
                        })
                        .catch(function (e) {
                          console.error(e);
                          alert(e.message || "重排失败");
                        });
                    },
                  });
                },
                onRegeneratePhase: function (gid, phaseNum, g) {
                  if (!window.CosmosDialog || !window.RollingPlan) return;
                  var note = window.prompt("可选：输入对本阶段的新要求（如更轻松/更偏实战）", "");
                  if (note === null) return;
                  CosmosDialog.open({
                    zodiac: "♻️",
                    title: "重新生成阶段计划",
                    body:
                      "将覆盖当前阶段及后续阶段任务。当前操作：第 " +
                      phaseNum +
                      " 阶段（" +
                      ((g && g.name) || "目标") +
                      "）。确认继续？",
                    confirmText: "确认覆盖生成",
                    onConfirm: function () {
                      RollingPlan.regeneratePhase(uid, gid, phaseNum, note || "")
                        .then(function () {
                          refresh(user);
                        })
                        .catch(function (e) {
                          console.error(e);
                          alert(e.message || "重新生成失败");
                        });
                    },
                  });
                },
              });
            });
        }

        var hint = document.getElementById("home-ach-hint");
        if (hint) {
          hint.textContent =
            "累计完成 " + completedTotal + " 个任务 · 坚持打卡可解锁更多徽章";
        }

        var ach = window.Achievements;
        if (!ach) return;
        Promise.resolve()
          .then(function () {
            return ach.runCheckAndCelebrate(uid, "ach-celebrate-home");
          })
          .catch(function (e) {
            console.error(e);
          })
          .then(function () {
            return ach.renderHomeBadges(uid, document.getElementById("home-ach-badges"));
          })
          .catch(function (e) {
            console.error(e);
          });
      })
      .catch(function (e) {
        if (seq !== homeRefreshSeq) return;
        console.error(e);
        AppShared.hydrateUserChip(user, {});
        setHomeFallbackState("加载失败，请稍后重试");
      });
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("home");
      AppShared.pageEnterTransition();
      refresh(user);
      // 周一首次打开自动弹出本周复盘（静默，不阻塞首页渲染）
      if (window.WeeklyReportModal) {
        WeeklyReportModal.autoShowOnMonday();
      }

      document.getElementById("btn-today-study").addEventListener("click", function () {
        window.location.href = "tasks.html";
      });
      document.getElementById("btn-new-goal").addEventListener("click", function () {
        window.location.href = "create-goal.html";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
