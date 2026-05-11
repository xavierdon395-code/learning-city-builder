(function (global) {
  "use strict";

  function userRoot(uid) {
    return "users/" + uid;
  }

  function formatYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function todayYMD() {
    return formatYMD(new Date());
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function loadProfile(uid) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/profile")
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function loadGoals(uid) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/goals")
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function loadTasksForDate(uid, dateStr) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/tasks/" + dateStr)
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function loadAllTasks(uid) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/tasks")
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function loadStats(uid) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/stats")
      .once("value")
      .then(function (s) {
        return s.val() || null;
      });
  }

  function loadLeaves(uid) {
    const { db } = initFirebase();
    return db
      .ref(userRoot(uid) + "/leaves")
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function setLeaveDay(uid, dateStr, on) {
    const { db } = initFirebase();
    const p = userRoot(uid) + "/leaves/" + dateStr;
    if (on) {
      return db.ref(p).set(true);
    }
    return db.ref(p).remove();
  }

  function countCompletedAll(tasksTree) {
    let n = 0;
    if (!tasksTree || typeof tasksTree !== "object") return 0;
    Object.keys(tasksTree).forEach(function (dateKey) {
      const day = tasksTree[dateKey];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        const t = day[tid];
        if (t && t.completed) n += 1;
      });
    });
    return n;
  }

  function goalProgressFromTasks(tasksTree, goalId) {
    let total = 0;
    let done = 0;
    if (!tasksTree || typeof tasksTree !== "object") return { done: 0, total: 0, pct: 0 };
    Object.keys(tasksTree).forEach(function (dateKey) {
      const day = tasksTree[dateKey];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        const t = day[tid];
        if (!t || t.goalId !== goalId) return;
        total += 1;
        if (t.completed) done += 1;
      });
    });
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done: done, total: total, pct: pct };
  }

  function normalizeTaskType(type) {
    const s = String(type || "");
    if (/测/.test(s)) return "测验";
    if (/练|习/.test(s) && !/学习/.test(s)) return "练习";
    return "学习";
  }

  function taskTypeIcon(type) {
    const n = normalizeTaskType(type);
    if (n === "测验") return "📝";
    if (n === "练习") return "⚔️";
    return "📖";
  }

  function isLeaveDay(leavesMap, dateStr) {
    return !!(leavesMap && leavesMap[dateStr]);
  }

  function computeStreaks(tasksTree, leavesMap) {
    leavesMap = leavesMap || {};
    const activeDays = {};
    if (tasksTree && typeof tasksTree === "object") {
      Object.keys(tasksTree).forEach(function (dateKey) {
        if (isLeaveDay(leavesMap, dateKey)) return;
        const day = tasksTree[dateKey];
        if (!day || typeof day !== "object") return;
        for (const tid in day) {
          const t = day[tid];
          if (t && t.completed) {
            activeDays[dateKey] = true;
            break;
          }
        }
      });
    }
    const sorted = Object.keys(activeDays).sort();
    const totalDays = sorted.length;
    if (totalDays === 0) {
      return { totalDays: 0, currentStreak: 0, longestStreak: 0, hadBreakThenSeven: false };
    }

    function parseYmd(s) {
      const p = s.split("-").map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    }

    function ymdFromDate(d) {
      return formatYMD(d);
    }

    /** 请假日不计入打卡、也不打断连续（日历回退时跳过请假日） */
    function streakFromAnchor(anchorStr) {
      if (!activeDays[anchorStr]) return 0;
      let count = 0;
      const d = parseYmd(anchorStr);
      while (true) {
        const key = ymdFromDate(d);
        if (activeDays[key]) {
          count += 1;
          d.setDate(d.getDate() - 1);
        } else if (isLeaveDay(leavesMap, key)) {
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return count;
    }

    const today = todayYMD();
    const yObj = new Date();
    yObj.setDate(yObj.getDate() - 1);
    const yesterday = formatYMD(yObj);

    let currentStreak = 0;
    if (activeDays[today]) currentStreak = streakFromAnchor(today);
    else if (activeDays[yesterday]) currentStreak = streakFromAnchor(yesterday);

    const endScan = new Date();
    endScan.setHours(0, 0, 0, 0);
    const first = parseYmd(sorted[0]);
    let scan = new Date(first);
    scan.setHours(0, 0, 0, 0);
    let curRun = 0;
    let longest = 0;
    let prevActiveDay = null;
    let hadEmptyGapBetweenActives = false;
    while (scan <= endScan) {
      const key = ymdFromDate(scan);
      if (activeDays[key]) {
        if (prevActiveDay != null) {
          const mid = new Date(prevActiveDay);
          mid.setDate(mid.getDate() + 1);
          while (mid < scan) {
            const mk = ymdFromDate(mid);
            if (!activeDays[mk] && !isLeaveDay(leavesMap, mk)) {
              hadEmptyGapBetweenActives = true;
              break;
            }
            mid.setDate(mid.getDate() + 1);
          }
        }
        prevActiveDay = new Date(scan);
        curRun += 1;
        if (curRun > longest) longest = curRun;
      } else if (isLeaveDay(leavesMap, key)) {
        /* 请假：不增不减、不断裂 */
      } else {
        curRun = 0;
      }
      scan.setDate(scan.getDate() + 1);
    }

    const hadBreakThenSeven = hadEmptyGapBetweenActives && currentStreak >= 7;

    return {
      totalDays: totalDays,
      currentStreak: currentStreak,
      longestStreak: longest,
      hadBreakThenSeven: hadBreakThenSeven,
    };
  }

  function lastNDaysCounts(tasksTree, n) {
    const out = [];
    const start = startOfToday();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const key = formatYMD(d);
      let c = 0;
      const day = tasksTree && tasksTree[key];
      if (day && typeof day === "object") {
        Object.keys(day).forEach(function (tid) {
          const t = day[tid];
          if (t && t.completed) c += 1;
        });
      }
      out.push({ date: key, label: String(d.getMonth() + 1) + "/" + d.getDate(), count: c });
    }
    return out;
  }

  function typeDistribution(tasksTree) {
    const m = { 学习: 0, 练习: 0, 测验: 0 };
    if (!tasksTree || typeof tasksTree !== "object") return m;
    Object.keys(tasksTree).forEach(function (dateKey) {
      const day = tasksTree[dateKey];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        const t = day[tid];
        if (!t || !t.completed) return;
        const k = normalizeTaskType(t.type);
        if (m[k] == null) m[k] = 0;
        m[k] += 1;
      });
    });
    return m;
  }

  function cityTier(completedCount) {
    const tiers = [
      { min: 0, max: 4, level: 1, next: 5 - completedCount, buildings: 1 },
      { min: 5, max: 9, level: 2, next: 10 - completedCount, buildings: 2 },
      { min: 10, max: 19, level: 3, next: 20 - completedCount, buildings: 3 },
      { min: 20, max: 34, level: 4, next: 35 - completedCount, buildings: 4 },
      { min: 35, max: 49, level: 5, next: 50 - completedCount, buildings: 5 },
      { min: 50, max: Infinity, level: 6, next: 0, buildings: 6 },
    ];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (completedCount >= t.min && completedCount <= t.max) {
        const need = Math.max(0, t.next);
        return { level: t.level, nextBuildingIn: need, buildings: t.buildings };
      }
    }
    return { level: 6, nextBuildingIn: 0, buildings: 6 };
  }

  function completeTask(uid, dateStr, taskId, goalId) {
    const { db } = initFirebase();
    const path = userRoot(uid) + "/tasks/" + dateStr + "/" + taskId;
    const taskRef = db.ref(path);
    return taskRef
      .once("value")
      .then(function (snap) {
        const val = snap.val();
        if (!val || val.completed) return Promise.resolve({ already: true, val: val });
        const updates = {};
        updates[path + "/completed"] = true;
        updates[path + "/completedAt"] = firebase.database.ServerValue.TIMESTAMP;
        return db.ref().update(updates).then(function () {
          return { already: false, val: val };
        });
      })
      .then(function (res) {
        if (res.already) return res;
        return recalcAfterComplete(uid, goalId).then(function () {
          return res;
        });
      });
  }

  function updateTaskFields(uid, dateStr, taskId, patch) {
    const { db } = initFirebase();
    const safePatch = patch && typeof patch === "object" ? patch : {};
    const updates = {};
    const base = userRoot(uid) + "/tasks/" + dateStr + "/" + taskId + "/";
    if (safePatch.task != null) updates[base + "task"] = String(safePatch.task || "").trim();
    if (safePatch.duration != null) updates[base + "duration"] = String(safePatch.duration || "").trim();
    if (safePatch.type != null) updates[base + "type"] = String(safePatch.type || "").trim();
    if (safePatch.priority != null) updates[base + "priority"] = String(safePatch.priority || "").trim();
    if (safePatch.tips != null) updates[base + "tips"] = String(safePatch.tips || "").trim();
    if (safePatch.reviewOf != null) updates[base + "reviewOf"] = String(safePatch.reviewOf || "").trim();
    if (Object.keys(updates).length === 0) return Promise.resolve();
    return db.ref().update(updates);
  }

  function setTaskCompleted(uid, dateStr, taskId, goalId, completed) {
    const { db } = initFirebase();
    const base = userRoot(uid) + "/tasks/" + dateStr + "/" + taskId + "/";
    const updates = {};
    updates[base + "completed"] = !!completed;
    updates[base + "completedAt"] = completed ? firebase.database.ServerValue.TIMESTAMP : null;
    return db
      .ref()
      .update(updates)
      .then(function () {
        return recalcAfterComplete(uid, goalId);
      });
  }

  function getGoalTaskDates(tasksTree, goalId) {
    const dates = {};
    if (!tasksTree || !goalId) return dates;
    Object.keys(tasksTree).forEach(function (dateKey) {
      const day = tasksTree[dateKey];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        const t = day[tid];
        if (t && t.goalId === goalId) {
          dates[dateKey] = true;
        }
      });
    });
    return dates;
  }

  function countLeavesOnGoalTaskDays(leavesMap, goalTaskDates) {
    let n = 0;
    if (!leavesMap || !goalTaskDates) return 0;
    Object.keys(goalTaskDates).forEach(function (d) {
      if (leavesMap[d]) n += 1;
    });
    return n;
  }

  function recalcOverLeaveFlags(uid, tasksTree, leavesMap, goals) {
    const { db } = initFirebase();
    leavesMap = leavesMap || {};
    goals = goals || {};
    const updates = {};
    Object.keys(goals).forEach(function (gid) {
      const g = goals[gid];
      const taskDates = getGoalTaskDates(tasksTree, gid);
      const totalDays = Object.keys(taskDates).length;
      if (totalDays === 0) {
        updates[userRoot(uid) + "/goals/" + gid + "/overLeave"] = false;
        return;
      }
      const leaveOnGoal = countLeavesOnGoalTaskDays(leavesMap, taskDates);
      const over = leaveOnGoal > totalDays * 0.2;
      if (g.overLeave !== over) {
        updates[userRoot(uid) + "/goals/" + gid + "/overLeave"] = over;
      }
    });
    if (Object.keys(updates).length === 0) return Promise.resolve();
    return db.ref().update(updates);
  }

  function recalcAfterComplete(uid, goalId) {
    const { db } = initFirebase();
    return Promise.all([loadAllTasks(uid), loadLeaves(uid), loadGoals(uid)]).then(function (res) {
      const tree = res[0];
      const leavesMap = res[1];
      const goals = res[2];
      const completedTotal = countCompletedAll(tree);
      const streaks = computeStreaks(tree, leavesMap);
      const gprog = goalId ? goalProgressFromTasks(tree, goalId) : { pct: 0 };
      const statsPayload = {
        totalTasks: completedTotal,
        totalDays: streaks.totalDays,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };
      const updates = {};
      updates[userRoot(uid) + "/stats"] = statsPayload;
      if (goalId) {
        updates[userRoot(uid) + "/goals/" + goalId + "/progress"] = gprog.pct;
      }
      return db.ref().update(updates).then(function () {
        return recalcOverLeaveFlags(uid, tree, leavesMap, goals);
      });
    });
  }

  /** 将 YYYY-MM-DD 转为本地 0 点 Date */
  function dateFromYMD(ymd) {
    var p = String(ymd || "").split("-").map(Number);
    if (p.length < 3 || !isFinite(p[0])) return null;
    var d = new Date(p[0], p[1] - 1, p[2]);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** 在给定日开始连续写入多日任务（滚动规划续窗） */
  function appendTaskDaysForGoal(uid, goalId, goalName, startYmd, taskRows) {
    const { db } = initFirebase();
    const start = dateFromYMD(startYmd);
    if (!start || !Array.isArray(taskRows) || taskRows.length === 0) {
      return Promise.reject(new Error("appendTaskDaysForGoal：参数无效"));
    }
    const updates = {};
    for (let i = 0; i < taskRows.length; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = formatYMD(d);
      const item = taskRows[i] || {};
      const taskId = db.ref().push().key;
      const taskPayload = {
        goalId: goalId,
        goalName: goalName,
        task: item.task || item.title || "学习",
        duration: item.duration || "1小时",
        type: item.type || "学习",
        completed: false,
        completedAt: null,
      };
      if (item.planDay != null && isFinite(Number(item.planDay))) {
        taskPayload.planDay = Math.round(Number(item.planDay));
      }
      if (item.priority) taskPayload.priority = item.priority;
      if (item.tips) taskPayload.tips = item.tips;
      if (item.reviewOf != null && item.reviewOf !== "") taskPayload.reviewOf = item.reviewOf;
      updates[userRoot(uid) + "/tasks/" + dateStr + "/" + taskId] = taskPayload;
    }
    return db.ref().update(updates).then(function () {
      return Promise.all([loadAllTasks(uid), loadLeaves(uid), loadGoals(uid)]).then(function (r) {
        return recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
      });
    });
  }

  function deleteGoalAndTasks(uid, goalId) {
    const { db } = initFirebase();
    return loadAllTasks(uid).then(function (tree) {
      const updates = {};
      updates[userRoot(uid) + "/goals/" + goalId] = null;
      Object.keys(tree || {}).forEach(function (dateKey) {
        const day = tree[dateKey];
        if (!day || typeof day !== "object") return;
        Object.keys(day).forEach(function (tid) {
          const t = day[tid];
          if (t && t.goalId === goalId) {
            updates[userRoot(uid) + "/tasks/" + dateKey + "/" + tid] = null;
          }
        });
      });
      return db.ref().update(updates).then(function () {
        return Promise.all([loadAllTasks(uid), loadLeaves(uid), loadGoals(uid)]).then(function (r) {
          return recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
        });
      });
    });
  }

  /** AI 周复盘缓存：读取某周已存文档（不存在则 null） */
  function loadWeeklyReport(uid, weekId) {
    const { db } = initFirebase();
    const path = userRoot(uid) + "/weeklyReports/" + weekId;
    return db
      .ref(path)
      .once("value")
      .then(function (snap) {
        return snap.exists() ? snap.val() : null;
      });
  }

  /** 读取全部周复盘（按 week_id 倒序，最新在前） */
  function loadAllWeeklyReports(uid) {
    const { db } = initFirebase();
    const path = userRoot(uid) + "/weeklyReports";
    return db
      .ref(path)
      .once("value")
      .then(function (snap) {
        if (!snap.exists()) return [];
        const all = [];
        snap.forEach(function (child) {
          all.push(child.val() || {});
        });
        return all.sort(function (a, b) {
          return String((b && b.week_id) || "").localeCompare(String((a && a.week_id) || ""));
        });
      });
  }

  /**
   * 写入周复盘文档（整节点 set）
   * payload 须含 week_id、stats_snapshot、ai、updatedAt 等；写入前 console.log 旧值
   */
  function saveWeeklyReport(uid, weekId, payload) {
    const { db } = initFirebase();
    const path = userRoot(uid) + "/weeklyReports/" + weekId;
    return db
      .ref(path)
      .once("value")
      .then(function (snap) {
        const before = snap.val();
        console.log("[AppData.saveWeeklyReport] 写入前:", before);
        console.log("[AppData.saveWeeklyReport] 即将写入:", payload);
        return db.ref(path).set(payload);
      });
  }

  /** 根据当前任务树重写 stats（不修改目标进度，供批量调试等场景使用） */
  function syncStatsFromTasks(uid) {
    const { db } = initFirebase();
    return Promise.all([loadAllTasks(uid), loadLeaves(uid)]).then(function (res) {
      const tree = res[0];
      const leavesMap = res[1];
      const completedTotal = countCompletedAll(tree);
      const streaks = computeStreaks(tree, leavesMap);
      return db.ref(userRoot(uid) + "/stats").set({
        totalTasks: completedTotal,
        totalDays: streaks.totalDays,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      });
    });
  }

  global.AppData = {
    formatYMD: formatYMD,
    dateFromYMD: dateFromYMD,
    appendTaskDaysForGoal: appendTaskDaysForGoal,
    todayYMD: todayYMD,
    startOfToday: startOfToday,
    loadProfile: loadProfile,
    loadGoals: loadGoals,
    loadTasksForDate: loadTasksForDate,
    loadAllTasks: loadAllTasks,
    loadStats: loadStats,
    loadLeaves: loadLeaves,
    setLeaveDay: setLeaveDay,
    isLeaveDay: isLeaveDay,
    countCompletedAll: countCompletedAll,
    goalProgressFromTasks: goalProgressFromTasks,
    normalizeTaskType: normalizeTaskType,
    taskTypeIcon: taskTypeIcon,
    computeStreaks: computeStreaks,
    recalcOverLeaveFlags: recalcOverLeaveFlags,
    deleteGoalAndTasks: deleteGoalAndTasks,
    lastNDaysCounts: lastNDaysCounts,
    typeDistribution: typeDistribution,
    cityTier: cityTier,
    completeTask: completeTask,
    updateTaskFields: updateTaskFields,
    setTaskCompleted: setTaskCompleted,
    syncStatsFromTasks: syncStatsFromTasks,
    loadWeeklyReport: loadWeeklyReport,
    loadAllWeeklyReports: loadAllWeeklyReports,
    saveWeeklyReport: saveWeeklyReport,
    userRoot: userRoot,
  };
})(typeof window !== "undefined" ? window : this);
