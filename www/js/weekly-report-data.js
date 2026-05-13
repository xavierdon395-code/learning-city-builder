/**
 * AI 周复盘 - 数据收集层
 * 负责从 Firebase 拉取本周学习数据，标准化为统计对象
 */
const WeeklyReportData = (function () {
  "use strict";

  var DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  /**
   * 获取指定日期所在周的起止
   * 周一作为周开始（00:00:00），周日作为周结束（23:59:59）
   * @param {Date} date - 任意日期，默认今天
   * @returns {{start: Date, end: Date, weekId: string}}
   */
  function getWeekRange(date) {
    var input = date instanceof Date ? date : new Date();
    var d = new Date(input);
    var day = d.getDay() || 7; // 周日变 7

    var monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    var weekId = getISOWeekId(monday);
    return { start: monday, end: sunday, weekId: weekId };
  }

  /**
   * 计算 ISO 周编号
   */
  function getISOWeekId(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + "-W" + String(weekNum).padStart(2, "0");
  }

  /**
   * 收集本周（或指定周）的统计数据
   * @param {string} uid - 用户 ID
   * @param {Date} forDate - 任意日期（默认今天）
   * @returns {Promise<object>} 统计对象
   */
  function collectWeekStats(uid, forDate) {
    if (!uid) {
      return Promise.reject(new Error("collectWeekStats: uid 不能为空"));
    }
    if (typeof AppData === "undefined") {
      return Promise.reject(new Error("collectWeekStats: AppData 未加载，请检查脚本顺序"));
    }

    var targetDate = forDate instanceof Date ? forDate : new Date();
    var weekRange = getWeekRange(targetDate);
    var start = weekRange.start;
    var end = weekRange.end;
    var weekId = weekRange.weekId;
    var weekStartStr = formatDate(start);
    var weekEndStr = formatDate(end);

    return Promise.all([AppData.loadAllTasks(uid), AppData.loadGoals(uid)]).then(function (res) {
      var allTasks = res[0] || {};
      var goals = res[1] || {};
      var weekDates = buildWeekDates(start);
      var weekDateMap = {};
      var dayRows = [];
      var tasksCompleted = 0;
      var tasksPlanned = 0;
      var streakDays = 0;
      var maxDone = -1;
      var minDone = Infinity;
      var bestDay = null;
      var worstDay = null;
      var hasAnyDone = false;
      var weekGoalIds = {};

      for (var i = 0; i < weekDates.length; i++) {
        weekDateMap[weekDates[i]] = true;
      }

      for (var j = 0; j < weekDates.length; j++) {
        var dateStr = weekDates[j];
        var dateObj = AppData.dateFromYMD ? AppData.dateFromYMD(dateStr) : new Date(dateStr);
        var dayName = DAY_NAMES[dateObj.getDay()];
        var dayTasks = allTasks[dateStr];
        var planned = 0;
        var completed = 0;

        if (dayTasks && typeof dayTasks === "object") {
          var taskIds = Object.keys(dayTasks);
          for (var t = 0; t < taskIds.length; t++) {
            var task = dayTasks[taskIds[t]];
            if (!task || typeof task !== "object") continue;
            planned += 1;
            if (task.completed) completed += 1;
            if (task.goalId) weekGoalIds[String(task.goalId)] = true;
          }
        }

        tasksPlanned += planned;
        tasksCompleted += completed;
        if (completed > 0) {
          streakDays += 1;
          hasAnyDone = true;
        }
        if (completed > maxDone) {
          maxDone = completed;
          bestDay = dayName;
        }
        if (completed < minDone) {
          minDone = completed;
          worstDay = dayName;
        }

        dayRows.push({
          date: dateStr,
          day_name: dayName,
          completed: completed,
          planned: planned,
        });
      }

      if (!hasAnyDone) {
        bestDay = null;
        worstDay = null;
      }

      var completionRate = tasksPlanned > 0 ? Number((tasksCompleted / tasksPlanned).toFixed(2)) : 0;
      var goalsProgress = buildGoalsProgress(goals, allTasks, weekDates, weekDateMap, weekGoalIds, weekStartStr, weekEndStr);

      return {
        week_id: weekId,
        week_start: weekStartStr,
        week_end: weekEndStr,
        tasks_completed: tasksCompleted,
        tasks_planned: tasksPlanned,
        completion_rate: completionRate,
        streak_days: streakDays,
        best_day: bestDay,
        worst_day: worstDay,
        goals_progress: goalsProgress,
        daily_breakdown: dayRows,
      };
    });
  }

  function buildWeekDates(start) {
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var ds = AppData.formatYMD ? AppData.formatYMD(d) : formatDate(d);
      dates.push(ds);
    }
    return dates;
  }

  function buildGoalsProgress(goals, allTasks, weekDates, weekDateMap, weekGoalIds, weekStartStr, weekEndStr) {
    var out = [];
    var goalIds = Object.keys(weekGoalIds || {});
    if (!goalIds.length) return out;

    var treeBefore = {};
    var treeThrough = {};
    var weekSliceTree = {};

    Object.keys(allTasks || {}).forEach(function (dateKey) {
      var day = allTasks[dateKey];
      if (!day || typeof day !== "object") return;
      if (dateKey < weekStartStr) treeBefore[dateKey] = day;
      if (dateKey <= weekEndStr) treeThrough[dateKey] = day;
      if (weekDateMap[dateKey]) weekSliceTree[dateKey] = day;
    });

    for (var i = 0; i < goalIds.length; i++) {
      var gid = goalIds[i];
      var doneThisWeek = 0;

      for (var d = 0; d < weekDates.length; d++) {
        var dateStr = weekDates[d];
        var dayTasks = allTasks[dateStr];
        if (!dayTasks || typeof dayTasks !== "object") continue;
        var taskIds = Object.keys(dayTasks);
        for (var t = 0; t < taskIds.length; t++) {
          var task = dayTasks[taskIds[t]];
          if (!task || String(task.goalId || "") !== gid) continue;
          if (task.completed) doneThisWeek += 1;
        }
      }

      var beforePct = 0;
      var afterPct = 0;
      if (AppData.goalProgressFromTasks) {
        beforePct = AppData.goalProgressFromTasks(treeBefore, gid).pct || 0;
        afterPct = AppData.goalProgressFromTasks(treeThrough, gid).pct || 0;
      } else {
        // TODO: 如果未来 AppData 移除 goalProgressFromTasks，这里需改为本地计算。
      }

      var goal = goals && goals[gid] ? goals[gid] : {};
      var weekProg = AppData.goalProgressFromTasks ? AppData.goalProgressFromTasks(weekSliceTree, gid) : { total: 0 };
      if (!weekProg || !weekProg.total) continue;

      out.push({
        goal_name: String(goal.name || ""),
        progress_before_week: beforePct,
        progress_after_week: afterPct,
        tasks_done_this_week: doneThisWeek,
      });
    }

    return out;
  }

  function formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  return {
    getWeekRange: getWeekRange,
    collectWeekStats: collectWeekStats,
  };
})();

if (typeof window !== "undefined") {
  window.WeeklyReportData = WeeklyReportData;

  // 仅用于开发调试，生产环境可忽略
  window.testWeeklyReport = async function () {
    var user = firebase.auth().currentUser;
    if (!user) {
      console.log("请先登录");
      return;
    }
    var stats = await WeeklyReportData.collectWeekStats(user.uid);
    console.log("本周统计:", stats);
    return stats;
  };
}
