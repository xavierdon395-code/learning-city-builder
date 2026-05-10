(function () {
  "use strict";

  function getGoalIdFromQuery() {
    var qs = new URLSearchParams(window.location.search || "");
    return qs.get("goalId") || "";
  }

  function collectGoalTasks(allTasks, goalId) {
    var rows = [];
    Object.keys(allTasks || {}).forEach(function (dateStr) {
      var day = allTasks[dateStr];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (taskId) {
        var t = day[taskId];
        if (!t || t.goalId !== goalId) return;
        rows.push({
          id: taskId,
          dateStr: dateStr,
          planDay: t.planDay != null && isFinite(Number(t.planDay)) ? Math.round(Number(t.planDay)) : null,
          t: t,
        });
      });
    });
    rows.sort(function (a, b) {
      var pa = a.planDay == null ? 999999 : a.planDay;
      var pb = b.planDay == null ? 999999 : b.planDay;
      if (pa !== pb) return pa - pb;
      if (a.dateStr !== b.dateStr) return a.dateStr < b.dateStr ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    return rows;
  }

  function makeMeta(goal, rows) {
    var total = rows.length;
    var done = rows.filter(function (x) {
      return !!(x.t && x.t.completed);
    }).length;
    return (goal.type || "目标") + " · 截止 " + (goal.deadline || "—") + " · 已完成 " + done + " / " + total;
  }

  function getFutureWindowRows(rows, days) {
    var today = AppData.todayYMD();
    var ahead = rows.filter(function (r) {
      return r.dateStr >= today;
    });
    return ahead.slice(0, Math.max(1, Math.round(Number(days) || 7)));
  }

  function createEditorCard(uid, row, onSaved) {
    var t = row.t || {};
    var wrap = document.createElement("div");
    wrap.className = "task-card";
    wrap.innerHTML =
      '<div class="task-card__body">' +
      '<div class="task-card__title"></div>' +
      '<div class="task-meta"></div>' +
      '<div class="task-edit" hidden>' +
      '<input class="gd-input gd-task" type="text" />' +
      '<div style="display:flex; gap:8px; margin-top:8px;">' +
      '<input class="gd-input gd-duration" type="text" placeholder="时长" style="flex:1" />' +
      '<input class="gd-input gd-type" type="text" placeholder="类型" style="flex:1" />' +
      "</div>" +
      '<textarea class="gd-input gd-tips" placeholder="备注/贴士" style="margin-top:8px; min-height:60px;"></textarea>' +
      "</div>" +
      "</div>" +
      '<div class="task-complete-wrap" style="display:flex; align-items:center; gap:8px;"></div>';

    var title = wrap.querySelector(".task-card__title");
    var meta = wrap.querySelector(".task-meta");
    var editBox = wrap.querySelector(".task-edit");
    var taskInput = wrap.querySelector(".gd-task");
    var durationInput = wrap.querySelector(".gd-duration");
    var typeInput = wrap.querySelector(".gd-type");
    var tipsInput = wrap.querySelector(".gd-tips");
    var action = wrap.querySelector(".task-complete-wrap");

    function renderView() {
      title.textContent = t.task || "任务";
      var tagText = (row.planDay != null ? "第 " + row.planDay + " 天" : row.dateStr) + (t.completed ? " · 已完成" : " · 未完成");
      meta.innerHTML = "";
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagText;
      meta.appendChild(tag);
      meta.appendChild(document.createTextNode(" 预计：" + (t.duration || "—") + " · 类型：" + (t.type || "学习")));
      if (t.tips) {
        var tip = document.createElement("div");
        tip.className = "muted";
        tip.style.marginTop = "6px";
        tip.textContent = "备注：" + t.tips;
        meta.appendChild(tip);
      }
    }

    function enterEdit() {
      taskInput.value = t.task || "";
      durationInput.value = t.duration || "";
      typeInput.value = t.type || "";
      tipsInput.value = t.tips || "";
      editBox.hidden = false;
      btnEdit.hidden = true;
      btnSave.hidden = false;
      btnCancel.hidden = false;
    }

    function exitEdit() {
      editBox.hidden = true;
      btnEdit.hidden = false;
      btnSave.hidden = true;
      btnCancel.hidden = true;
    }

    var btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "btn btn--secondary btn--small";
    btnEdit.textContent = "编辑任务";
    btnEdit.addEventListener("click", enterEdit);

    var btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "btn btn--primary btn--small";
    btnSave.textContent = "保存";
    btnSave.hidden = true;
    btnSave.addEventListener("click", function () {
      var patch = {
        task: taskInput.value.trim(),
        duration: durationInput.value.trim(),
        type: typeInput.value.trim(),
        tips: tipsInput.value.trim(),
      };
      if (!patch.task) {
        alert("任务内容不能为空");
        return;
      }
      btnSave.disabled = true;
      AppData.updateTaskFields(uid, row.dateStr, row.id, patch)
        .then(function () {
          t.task = patch.task;
          t.duration = patch.duration;
          t.type = patch.type;
          t.tips = patch.tips;
          renderView();
          exitEdit();
          if (typeof onSaved === "function") onSaved();
        })
        .catch(function (e) {
          console.error(e);
          alert(e.message || "保存失败");
        })
        .finally(function () {
          btnSave.disabled = false;
        });
    });

    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "btn btn--ghost btn--small";
    btnCancel.textContent = "取消";
    btnCancel.hidden = true;
    btnCancel.addEventListener("click", exitEdit);

    var btnToggleDone = document.createElement("button");
    btnToggleDone.type = "button";
    btnToggleDone.className = "btn btn--secondary btn--small";
    btnToggleDone.textContent = t.completed ? "标记未完成" : "标记完成";
    btnToggleDone.addEventListener("click", function () {
      btnToggleDone.disabled = true;
      var target = !t.completed;
      AppData.setTaskCompleted(uid, row.dateStr, row.id, t.goalId, target)
        .then(function () {
          t.completed = target;
          btnToggleDone.textContent = t.completed ? "标记未完成" : "标记完成";
          renderView();
          if (typeof onSaved === "function") onSaved();
        })
        .catch(function (e) {
          console.error(e);
          alert(e.message || "更新完成状态失败");
        })
        .finally(function () {
          btnToggleDone.disabled = false;
        });
    });

    action.appendChild(btnEdit);
    action.appendChild(btnSave);
    action.appendChild(btnCancel);
    action.appendChild(btnToggleDone);

    renderView();
    return wrap;
  }

  function refresh(user, goalId) {
    var uid = user.uid;
    return Promise.all([AppData.loadProfile(uid), AppData.loadGoals(uid), AppData.loadAllTasks(uid)]).then(function (res) {
      var profile = res[0] || {};
      var goals = res[1] || {};
      var allTasks = res[2] || {};
      AppShared.hydrateUserChip(user, profile);

      var goal = goals[goalId];
      if (!goal) {
        alert("目标不存在或已被删除");
        window.location.href = "goals.html";
        return;
      }

      var rows = collectGoalTasks(allTasks, goalId);
      var listEl = document.getElementById("gd-list");
      var emptyEl = document.getElementById("gd-empty");
      document.getElementById("gd-title").textContent = goal.name || "目标任务详情";
      document.getElementById("gd-meta").textContent = makeMeta(goal, rows);
      listEl.innerHTML = "";
      if (!rows.length) {
        emptyEl.hidden = false;
        return;
      }
      emptyEl.hidden = true;
      rows.forEach(function (row) {
        listEl.appendChild(
          createEditorCard(uid, row, function () {
            refresh(user, goalId).catch(function (e) {
              console.error(e);
            });
          })
        );
      });

      var batchToggle = document.getElementById("gd-batch-toggle");
      var batchPanel = document.getElementById("gd-batch-panel");
      var batchList = document.getElementById("gd-batch-list");
      var batchSave = document.getElementById("gd-batch-save");
      var batchCancel = document.getElementById("gd-batch-cancel");
      var futureRows = getFutureWindowRows(rows, 7);

      function renderBatch() {
        batchList.innerHTML = "";
        if (!futureRows.length) {
          var p = document.createElement("p");
          p.className = "muted";
          p.textContent = "从今天开始没有可批量编辑的任务。";
          batchList.appendChild(p);
          return;
        }
        futureRows.forEach(function (row) {
          var t = row.t || {};
          var box = document.createElement("div");
          box.className = "gd-batch-item";
          box.setAttribute("data-task-id", row.id);
          box.setAttribute("data-date", row.dateStr);
          box.innerHTML =
            '<div class="muted" style="margin-bottom:8px;">' +
            (row.planDay != null ? "第 " + row.planDay + " 天 · " : "") +
            row.dateStr +
            "</div>" +
            '<input class="gd-input b-task" type="text" />' +
            '<div class="gd-row" style="margin-top:8px;">' +
            '<input class="gd-input b-duration" type="text" placeholder="时长" style="flex:1" />' +
            '<input class="gd-input b-type" type="text" placeholder="类型" style="flex:1" />' +
            "</div>" +
            '<textarea class="gd-input b-tips" placeholder="备注/贴士" style="margin-top:8px; min-height:50px;"></textarea>';
          box.querySelector(".b-task").value = t.task || "";
          box.querySelector(".b-duration").value = t.duration || "";
          box.querySelector(".b-type").value = t.type || "";
          box.querySelector(".b-tips").value = t.tips || "";
          batchList.appendChild(box);
        });
      }

      if (batchToggle) {
        batchToggle.onclick = function () {
          batchPanel.hidden = !batchPanel.hidden;
          if (!batchPanel.hidden) renderBatch();
        };
      }
      if (batchCancel) {
        batchCancel.onclick = function () {
          batchPanel.hidden = true;
        };
      }
      if (batchSave) {
        batchSave.onclick = function () {
          var cards = Array.prototype.slice.call(batchList.querySelectorAll(".gd-batch-item"));
          if (!cards.length) {
            batchPanel.hidden = true;
            return;
          }
          var jobs = [];
          try {
            jobs = cards.map(function (card) {
              var taskId = card.getAttribute("data-task-id");
              var dateStr = card.getAttribute("data-date");
              var patch = {
                task: (card.querySelector(".b-task").value || "").trim(),
                duration: (card.querySelector(".b-duration").value || "").trim(),
                type: (card.querySelector(".b-type").value || "").trim(),
                tips: (card.querySelector(".b-tips").value || "").trim(),
              };
              if (!patch.task) {
                throw new Error("批量保存失败：任务内容不能为空");
              }
              return AppData.updateTaskFields(uid, dateStr, taskId, patch);
            });
          } catch (err) {
            alert(err.message || "批量保存失败");
            return;
          }
          batchSave.disabled = true;
          Promise.all(jobs)
            .then(function () {
              batchPanel.hidden = true;
              return refresh(user, goalId);
            })
            .catch(function (e) {
              console.error(e);
              alert(e.message || "批量保存失败");
            })
            .finally(function () {
              batchSave.disabled = false;
            });
        };
      }
    });
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("goals");
      AppShared.pageEnterTransition();
      var goalId = getGoalIdFromQuery();
      if (!goalId) {
        alert("缺少目标参数");
        window.location.href = "goals.html";
        return;
      }
      refresh(user, goalId).catch(function (e) {
        console.error(e);
      });
      document.getElementById("gd-back").addEventListener("click", function () {
        window.location.href = "goals.html";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
