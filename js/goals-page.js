(function () {
  "use strict";

  function refresh(user) {
    var uid = user.uid;
    Promise.all([AppData.loadProfile(uid), AppData.loadGoals(uid), AppData.loadAllTasks(uid)]).then(function (res) {
      var profile = res[0];
      var goalsRaw = res[1];
      var allTasks = res[2];
      AppShared.hydrateUserChip(user, profile);

      var goalIds = Object.keys(goalsRaw);
      var listEl = document.getElementById("goals-list");
      var emptyEl = document.getElementById("goals-empty");
      listEl.innerHTML = "";

      var hooks = {
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
              " 天日任务（从已排期之后自动顺延，不覆盖已完成记录）。确认执行？",
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
      };

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
            GoalUI.appendGoalCard(listEl, row, allTasks, hooks);
          });
      }
    });
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("goals");
      AppShared.pageEnterTransition();
      refresh(user);
      document.getElementById("btn-new-goal-top").addEventListener("click", function () {
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
