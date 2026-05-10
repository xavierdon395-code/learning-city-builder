(function () {
  "use strict";

  function spawnConfetti(container) {
    container.innerHTML = "";
    var colors = ["#ffd54f", "#ff7043", "#66bb6a", "#42a5f5", "#ab47bc"];
    for (var i = 0; i < 28; i++) {
      var s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 1.2 + "s";
      s.style.background = colors[i % colors.length];
      s.style.transform = "rotate(" + Math.random() * 180 + "deg)";
      container.appendChild(s);
    }
  }

  function showTasksPrefetchHint(text) {
    var el = document.getElementById("tasks-prefetch-hint");
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = text;
  }

  function showPlusOne(clientX, clientY) {
    var el = document.createElement("div");
    el.className = "float-plus";
    el.textContent = "+1";
    el.style.left = clientX + "px";
    el.style.top = clientY + "px";
    document.body.appendChild(el);
    window.setTimeout(function () {
      el.remove();
    }, 950);
  }

  function showCelebrate() {
    var ov = document.getElementById("celebrate");
    var conf = document.getElementById("confetti");
    spawnConfetti(conf);
    ov.classList.add("is-on");
    ov.setAttribute("aria-hidden", "false");
  }

  function hideCelebrate() {
    var ov = document.getElementById("celebrate");
    ov.classList.remove("is-on");
    ov.setAttribute("aria-hidden", "true");
  }

  function maybeCelebrateAchievements(uid, goalId, dateStr) {
    if (!window.Achievements) return Promise.resolve();
    return Promise.all([AppData.loadAllTasks(uid), AppData.loadGoals(uid)]).then(function (res) {
      var tree = res[0];
      var goals = res[1];
      var g = goals && goalId ? goals[goalId] : null;
      var prog = goalId ? AppData.goalProgressFromTasks(tree, goalId) : { pct: 0 };
      if (g && g.overLeave && prog.pct >= 100) {
        return Promise.resolve();
      }
      return Achievements.runCheckAndCelebrate(uid, "ach-celebrate-tasks");
    });
  }

  var phaseModalState = {
    open: false,
    uid: "",
    goalId: "",
    payload: null,
    dateStr: "",
    reloadList: null,
  };

  function closePhaseModal() {
    var modal = document.getElementById("phase-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    phaseModalState.open = false;
    phaseModalState.payload = null;
  }

  function bindPhaseModalActions() {
    var later = document.getElementById("phase-modal-later");
    var bg = document.getElementById("phase-modal-close-bg");
    var autoBtn = document.getElementById("phase-modal-auto");
    var customBtn = document.getElementById("phase-modal-custom");
    if (later) later.addEventListener("click", closePhaseModal);
    if (bg) bg.addEventListener("click", closePhaseModal);
    if (autoBtn) {
      autoBtn.addEventListener("click", function () {
        if (!window.RollingPlan || !phaseModalState.goalId || !phaseModalState.uid) return;
        autoBtn.disabled = true;
        RollingPlan.generateNextPhase(phaseModalState.uid, phaseModalState.goalId, "auto", "")
          .then(function () {
            closePhaseModal();
            if (typeof phaseModalState.reloadList === "function") {
              return AppData.loadLeaves(phaseModalState.uid).then(function (lm) {
                phaseModalState.reloadList(lm);
              });
            }
          })
          .catch(function (e) {
            console.error(e);
            alert(e.message || "生成下一阶段失败");
          })
          .finally(function () {
            autoBtn.disabled = false;
          });
      });
    }
    if (customBtn) {
      customBtn.addEventListener("click", function () {
        if (!window.RollingPlan || !phaseModalState.goalId || !phaseModalState.uid) return;
        var notes = window.prompt("请输入下一阶段希望重点关注或避免的内容：", "");
        if (notes === null) return;
        customBtn.disabled = true;
        RollingPlan.generateNextPhase(phaseModalState.uid, phaseModalState.goalId, "custom", notes || "")
          .then(function () {
            closePhaseModal();
            if (typeof phaseModalState.reloadList === "function") {
              return AppData.loadLeaves(phaseModalState.uid).then(function (lm) {
                phaseModalState.reloadList(lm);
              });
            }
          })
          .catch(function (e) {
            console.error(e);
            alert(e.message || "生成下一阶段失败");
          })
          .finally(function () {
            customBtn.disabled = false;
          });
      });
    }
  }

  function showPhaseCompleteModal(uid, goalId, payload, dateStr, reloadList) {
    var modal = document.getElementById("phase-modal");
    if (!modal || !payload) return;
    if (
      phaseModalState.open &&
      phaseModalState.goalId === goalId &&
      phaseModalState.payload &&
      Number(phaseModalState.payload.phaseNum) === Number(payload.phaseNum)
    ) {
      return;
    }
    var goal = payload.goal || {};
    document.getElementById("phase-modal-celebration").textContent =
      "✨ 第" + payload.phaseNum + "阶段完成 ✨";
    document.getElementById("phase-modal-title").textContent =
      (payload.phaseName || ("第" + payload.phaseNum + "阶段")) + " 已圆满";
    document.getElementById("phase-modal-rate").textContent =
      "本阶段完成率：" + (payload.completionRate || 0) + "%";
    document.getElementById("phase-modal-days").textContent =
      "累计天数：" + (payload.daysCompleted || 0) + " / " + (payload.totalDays || goal.totalDays || 0);
    document.getElementById("phase-modal-next").textContent =
      "接下来将进入：第 " + (payload.nextPhaseNum || payload.phaseNum + 1) + " 阶段";
    phaseModalState.open = true;
    phaseModalState.uid = uid;
    phaseModalState.goalId = goalId;
    phaseModalState.payload = payload;
    phaseModalState.dateStr = dateStr;
    phaseModalState.reloadList = reloadList;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    try {
      if (typeof initFirebase === "function") {
        initFirebase()
          .db.ref("users/" + uid + "/goals/" + goalId + "/lastPhasePrompted")
          .set(payload.phaseNum);
      }
    } catch (e) {
      console.warn("更新阶段提示标记失败：", e);
    }
  }

  function renderList(uid, dateStr, tasksObj, onAllDoneAfterComplete, isLeaveToday) {
    var listEl = document.getElementById("task-list");
    var emptyEl = document.getElementById("tasks-empty");
    listEl.innerHTML = "";

    var ids = Object.keys(tasksObj || {});
    if (ids.length === 0) {
      emptyEl.hidden = false;
      document.getElementById("tasks-summary").textContent = "今日共 0 个任务";
      return;
    }
    emptyEl.hidden = true;

    var rows = ids.map(function (id) {
      return { id: id, t: tasksObj[id] };
    });
    rows.sort(function (a, b) {
      var da = a.t.completed ? 1 : 0;
      var db = b.t.completed ? 1 : 0;
      if (da !== db) return da - db;
      return a.id.localeCompare(b.id);
    });

    var total = 0;
    var done = 0;
    rows.forEach(function (row) {
      var t = row.t;
      total += 1;
      if (t.completed) done += 1;
    });
    var sumEl = document.getElementById("tasks-summary");
    sumEl.textContent = "今日共 " + total + " 个任务 · 已完成 " + done;
    if (isLeaveToday) {
      sumEl.textContent += " · 今日已请假（完成记录不计入连续打卡）";
    }

    rows.forEach(function (row) {
      var t = row.t;
      var normType = AppData.normalizeTaskType(t.type);
      var typeClass =
        normType === "测验" ? "task-card--type-quiz" : normType === "练习" ? "task-card--type-practice" : "task-card--type-study";
      var card = document.createElement("div");
      card.className = "task-card " + typeClass + (t.completed ? " is-done" : "");
      var icon = AppData.taskTypeIcon(t.type);
      card.innerHTML =
        '<div class="task-card__icon task-card__icon--emoji" aria-hidden="true"></div>' +
        '<div class="task-card__body">' +
        '<div class="task-card__title"></div>' +
        '<div class="task-meta"></div>' +
        "</div>";
      card.querySelector(".task-card__icon").textContent = icon;
      card.querySelector(".task-card__title").textContent = t.task || "任务";
      var meta = card.querySelector(".task-meta");
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = t.goalName || "目标";
      meta.appendChild(tag);
      meta.appendChild(document.createTextNode(" 预计：" + (t.duration || "—")));
      if (!t.completed && !isLeaveToday) {
        var wrap = document.createElement("div");
        wrap.className = "task-complete-wrap";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "task-complete-btn";
        btn.setAttribute("aria-label", "标记完成");
        btn.innerHTML = '<span class="task-complete-btn__ring" aria-hidden="true"></span>';
        btn.addEventListener("click", function () {
          var rect = btn.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 2;
          var gid = t.goalId;
          AppData.completeTask(uid, dateStr, row.id, gid)
            .then(function (res) {
              if (res && res.already) return;
              btn.classList.add("task-complete-btn--pop");
              window.setTimeout(function () {
                btn.classList.remove("task-complete-btn--pop");
              }, 360);
              if (window.TaskFX) {
                TaskFX.run(document.getElementById("task-fx-canvas"), cx, cy);
              }
              showPlusOne(cx, cy);
              return AppData.loadTasksForDate(uid, dateStr).then(function (fresh) {
                var pend = 0;
                var tot = 0;
                Object.keys(fresh).forEach(function (k) {
                  var x = fresh[k];
                  tot += 1;
                  if (!x.completed) pend += 1;
                });
                renderList(uid, dateStr, fresh, onAllDoneAfterComplete, isLeaveToday);
                if (tot > 0 && pend === 0) onAllDoneAfterComplete();
                return maybeCelebrateAchievements(uid, gid, dateStr).then(function () {
                  if (!window.RollingPlan || !gid || isLeaveToday) return;
                  return RollingPlan.checkPhaseCompletion(uid, gid, dateStr).then(function (phasePayload) {
                    if (phasePayload) {
                      showPhaseCompleteModal(uid, gid, phasePayload, dateStr, window.__tasksReloadList__);
                    }
                    RollingPlan.maybePrefetchNextWindow(uid, gid, {
                      onStart: function () {
                        console.log("🌙 AI 正在准备未来几天的任务...");
                        showTasksPrefetchHint("🌙 AI 正在为你准备未来几天的任务（自动）");
                      },
                      onDone: function (daily) {
                        if (daily && daily.length) {
                          console.log("✨ 新任务已就位");
                          showTasksPrefetchHint("✨ 新任务已就位");
                          window.setTimeout(function () {
                            showTasksPrefetchHint("");
                          }, 4000);
                        } else {
                          showTasksPrefetchHint("");
                        }
                      },
                      onFail: function (e) {
                        console.warn("预生成失败:", e);
                        showTasksPrefetchHint("");
                      },
                    }).catch(function (e) {
                      console.warn("预生成失败:", e);
                      showTasksPrefetchHint("");
                    });
                  });
                });
              });
            })
            .catch(function (e) {
              console.error(e);
            });
        });
        wrap.appendChild(btn);
        card.appendChild(wrap);
      } else if (!t.completed && isLeaveToday) {
        var note = document.createElement("div");
        note.className = "muted";
        note.style.fontSize = "0.75rem";
        note.style.alignSelf = "center";
        note.textContent = "请假中";
        card.appendChild(note);
      } else {
        var doneBox = document.createElement("div");
        doneBox.className = "task-complete-static";
        doneBox.setAttribute("aria-label", "已完成");
        card.appendChild(doneBox);
      }
      listEl.appendChild(card);
    });
  }

  function syncLeaveButton(uid, dateStr, leavesMap, reloadList) {
    var btn = document.getElementById("btn-today-leave");
    var hint = document.getElementById("tasks-leave-hint");
    if (!btn) return;
    var onLeave = !!(leavesMap && leavesMap[dateStr]);
    if (hint) {
      hint.textContent = onLeave ? "今日已标记请假，连续打卡将跳过今日。" : "";
      hint.hidden = !onLeave;
    }
    btn.textContent = onLeave ? "已请假" : "今日请假";
    btn.disabled = onLeave;
    btn.onclick = function () {
      if (onLeave) return;
      if (!window.CosmosDialog) return;
      CosmosDialog.confirmLeave(
        function () {
          AppData.setLeaveDay(uid, dateStr, true)
            .then(function () {
              return Promise.all([AppData.loadLeaves(uid), AppData.loadAllTasks(uid), AppData.loadGoals(uid)]);
            })
            .then(function (res) {
              return AppData.recalcOverLeaveFlags(uid, res[1], res[0], res[2]);
            })
            .then(function () {
              return AppData.syncStatsFromTasks(uid);
            })
            .then(function () {
              return AppData.loadLeaves(uid);
            })
            .then(function (lm) {
              syncLeaveButton(uid, dateStr, lm, reloadList);
              reloadList(lm);
            })
            .catch(function (e) {
              console.error(e);
              alert(e.message || "操作失败");
            });
        },
        function () {}
      );
    };
  }

  function init() {
    AppShared.attachGlobalClickSound();
    bindPhaseModalActions();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.pageEnterTransition();
      AppData.loadProfile(user.uid).then(function (p) {
        AppShared.hydrateUserChip(user, p);
      });

      document.getElementById("tasks-date").textContent = AppShared.formatTodayChinese();

      var uid = user.uid;
      var dateStr = AppData.todayYMD();

      function reloadList(leavesMap) {
        AppData.loadTasksForDate(uid, dateStr).then(function (tasksObj) {
          var isLeave = AppData.isLeaveDay(leavesMap, dateStr);
          renderList(uid, dateStr, tasksObj, onAllDoneAfterComplete, isLeave);
        });
      }
      window.__tasksReloadList__ = reloadList;

      Promise.all([AppData.loadAllTasks(uid), AppData.loadLeaves(uid)]).then(function (res) {
        var tree = res[0];
        var leavesMap = res[1];
        var st = AppData.computeStreaks(tree, leavesMap);
        document.getElementById("tasks-streak-num").textContent = st.currentStreak + " 天";
        syncLeaveButton(uid, dateStr, leavesMap, reloadList);
      });

      if (window.Achievements) {
        Achievements.runCheckAndCelebrate(uid, "ach-celebrate-tasks").catch(function (e) {
          console.error(e);
        });
      }

      var celebrated = false;
      function onAllDoneAfterComplete() {
        if (celebrated) return;
        celebrated = true;
        showCelebrate();
      }

      document.getElementById("celebrate-close").addEventListener("click", function () {
        hideCelebrate();
        window.location.href = "city.html";
      });

      AppData.loadLeaves(uid).then(function (lm) {
        syncLeaveButton(uid, dateStr, lm, reloadList);
        reloadList(lm);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.closePhaseModal = closePhaseModal;
  window.showPhaseCustomize = function () {
    var btn = document.getElementById("phase-modal-custom");
    if (btn) btn.click();
  };
  window.generateNextPhase = function (mode) {
    var btn = mode === "custom" ? document.getElementById("phase-modal-custom") : document.getElementById("phase-modal-auto");
    if (btn) btn.click();
  };
})();
