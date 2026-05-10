/**
 * 成就徽章 50 枚 · Firebase users/{uid}/achievements/{id}: { unlockedAt, notified }
 */
(function (global) {
  "use strict";

  var META_IDS = {
    collector20: "spec_collector_20",
    collector40: "spec_collector_40",
    all50: "spec_all_50",
  };

  var SERIES_ORDER = [
    "🌱 新手起步",
    "🔥 坚持打卡",
    "📚 任务里程碑",
    "📅 月份专属",
    "🎓 专业领域",
    "⏰ 时间特别",
    "🏅 年度成就",
    "💫 特殊成就",
  ];

  var SERIES_DESC = {
    "🌱 新手起步": "迈出学习星轨的第一步",
    "🔥 坚持打卡": "火焰不熄，打卡不息",
    "📚 任务里程碑": "每一枚任务都是一颗星",
    "📅 月份专属": "当月完成 20 个任务即可点亮",
    "🎓 专业领域": "深耕与跨界同样闪耀",
    "⏰ 时间特别": "时刻与节奏中的仪式感",
    "🏅 年度成就": "以年为尺度的坚持",
    "💫 特殊成就": "收藏与终极荣耀",
  };

  function hashCode(str) {
    var h = 2166136261;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0) || 1;
  }

  function achievementGlyphSvg(def, isOn) {
    var id = def && def.id ? def.id : "ach";
    var h = hashCode(id);
    var cls = isOn ? "ach-glyph ach-glyph--on" : "ach-glyph ach-glyph--off";
    var a = 6 + (h % 6);
    var b = 9 + ((h >> 3) % 6);
    var c = 12 + ((h >> 6) % 6);
    var d = 14 + ((h >> 9) % 6);
    var motif =
      '<path d="M4 ' +
      a +
      "L8 " +
      b +
      "L12 " +
      c +
      "L16 " +
      d +
      'L20 ' +
      (8 + ((h >> 12) % 7)) +
      '" />' +
      '<circle cx="4" cy="' +
      a +
      '" r="1.1" />' +
      '<circle cx="8" cy="' +
      b +
      '" r="1" />' +
      '<circle cx="12" cy="' +
      c +
      '" r="1.2" />' +
      '<circle cx="16" cy="' +
      d +
      '" r="1" />' +
      '<circle cx="20" cy="' +
      (8 + ((h >> 12) % 7)) +
      '" r="1.15" />';
    var ringType = h % 4;
    var ring = "";
    if (ringType === 0) ring = '<circle cx="12" cy="12" r="8.4" />';
    else if (ringType === 1) ring = '<rect x="4.5" y="4.5" width="15" height="15" rx="4.2" />';
    else if (ringType === 2) ring = '<path d="M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z" />';
    else ring = '<path d="M12 3.5L20.5 12L12 20.5L3.5 12Z" />';
    var accentType = (h >> 16) % 3;
    var accent = accentType === 0 ? '<path d="M12 6v12M6 12h12" />' : accentType === 1 ? '<path d="M7 7l10 10M17 7L7 17" />' : '<path d="M12 5l2.2 4.2L19 10l-3.5 3.2L16.2 18L12 15.8L7.8 18l.7-4.8L5 10l4.8-.8Z" />';
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + ring + motif + accent + "</svg>";
  }

  function def(
    id,
    series,
    icon,
    name,
    desc,
    check,
    progress
  ) {
    return { id: id, series: series, icon: icon, name: name, desc: desc, check: check, progress: progress };
  }

  var ACHIEVEMENTS = [
    def(
      "newbie_star_path",
      "🌱 新手起步",
      "🌱",
      "星途启程",
      "创建第一个学习目标",
      function (c) {
        return c.goalCount >= 1;
      },
      function (c) {
        return Math.min(1, c.goalCount);
      }
    ),
    def(
      "newbie_first_task",
      "🌱 新手起步",
      "✅",
      "初战告捷",
      "完成第一个任务",
      function (c) {
        return c.totalCompleted >= 1;
      },
      function (c) {
        return Math.min(1, c.totalCompleted);
      }
    ),
    def(
      "newbie_streak_3",
      "🌱 新手起步",
      "📅",
      "三日之约",
      "连续打卡3天",
      function (c) {
        return c.streakMax >= 3;
      },
      function (c) {
        return Math.min(1, c.streakMax / 3);
      }
    ),
    def(
      "newbie_goal_done",
      "🌱 新手起步",
      "🎯",
      "首战凯旋",
      "完成第一个完整目标",
      function (c) {
        return c.completedGoalCount >= 1;
      },
      function (c) {
        return Math.min(1, c.completedGoalCount);
      }
    ),
    def(
      "newbie_profile",
      "🌱 新手起步",
      "👤",
      "完善档案",
      "填写完整个人信息（昵称与简介各至少若干字）",
      function (c) {
        return c.profileComplete;
      },
      function (c) {
        return c.profileComplete ? 1 : c.profileProgress;
      }
    ),

    def("streak_7", "🔥 坚持打卡", "🔥", "七日之火", "连续打卡7天", function (c) {
      return c.streakMax >= 7;
    }, pctStreak(7)),
    def("streak_14", "🔥 坚持打卡", "💪", "半月勇士", "连续打卡14天", function (c) {
      return c.streakMax >= 14;
    }, pctStreak(14)),
    def("streak_30", "🔥 坚持打卡", "🌙", "一月行者", "连续打卡30天", function (c) {
      return c.streakMax >= 30;
    }, pctStreak(30)),
    def("streak_100", "🔥 坚持打卡", "⚡", "百日传奇", "连续打卡100天", function (c) {
      return c.streakMax >= 100;
    }, pctStreak(100)),
    def("streak_180", "🔥 坚持打卡", "👑", "半年王者", "连续打卡180天", function (c) {
      return c.streakMax >= 180;
    }, pctStreak(180)),
    def("streak_365", "🔥 坚持打卡", "🏅", "年度学神", "连续打卡365天", function (c) {
      return c.streakMax >= 365;
    }, pctStreak(365)),
    def(
      "streak_phoenix",
      "🔥 坚持打卡",
      "🌊",
      "浴火重生",
      "中断后重新连续打卡7天",
      function (c) {
        return !!c.hadBreakThenSeven;
      },
      function (c) {
        return c.hadBreakThenSeven ? 1 : c.currentStreak >= 7 ? 0.7 : c.currentStreak / 7;
      }
    ),
    def(
      "streak_total_200",
      "🔥 坚持打卡",
      "💫",
      "不破不立",
      "打卡总天数超过200天",
      function (c) {
        return c.totalDistinctDays > 200;
      },
      function (c) {
        return Math.min(1, c.totalDistinctDays / 200);
      }
    ),

    def("task_10", "📚 任务里程碑", "📖", "十步起航", "累计完成10个任务", function (c) {
      return c.totalCompleted >= 10;
    }, pctTask(10)),
    def("task_50", "📚 任务里程碑", "🌟", "五十突破", "累计完成50个任务", function (c) {
      return c.totalCompleted >= 50;
    }, pctTask(50)),
    def("task_100", "📚 任务里程碑", "💎", "百任学霸", "累计完成100个任务", function (c) {
      return c.totalCompleted >= 100;
    }, pctTask(100)),
    def("task_200", "📚 任务里程碑", "🚀", "双百精英", "累计完成200个任务", function (c) {
      return c.totalCompleted >= 200;
    }, pctTask(200)),
    def("task_500", "📚 任务里程碑", "🏆", "五百达人", "累计完成500个任务", function (c) {
      return c.totalCompleted >= 500;
    }, pctTask(500)),
    def("task_1000", "📚 任务里程碑", "👸", "千务传说", "累计完成1000个任务", function (c) {
      return c.totalCompleted >= 1000;
    }, pctTask(1000)),
    def(
      "task_day_10",
      "📚 任务里程碑",
      "⚔️",
      "单日闪耀",
      "单天完成10个以上任务",
      function (c) {
        return c.maxTasksOneDay >= 10;
      },
      function (c) {
        return Math.min(1, c.maxTasksOneDay / 10);
      }
    ),
    def(
      "task_5days_5",
      "📚 任务里程碑",
      "🎪",
      "高效战士",
      "连续5天每天完成5个以上任务",
      function (c) {
        return c.maxRunDaysGe5 >= 5;
      },
      function (c) {
        return Math.min(1, c.maxRunDaysGe5 / 5);
      }
    ),
  ];

  function pctStreak(n) {
    return function (c) {
      return Math.min(1, c.streakMax / n);
    };
  }
  function pctTask(n) {
    return function (c) {
      return Math.min(1, c.totalCompleted / n);
    };
  }

  var MONTH_ICONS = ["🎊", "❄️", "🌸", "🌷", "🌿", "☀️", "🌊", "🎋", "🍂", "🍁", "🌨️", "🎄"];
  var MONTH_NAMES = [
    "元旦启航",
    "冬日坚守",
    "春风化雨",
    "四月芬芳",
    "五月生长",
    "仲夏骄阳",
    "七月激浪",
    "八月丰收",
    "金秋收获",
    "十月远征",
    "冬临坚持",
    "岁末荣耀",
  ];
  for (var mi = 0; mi < 12; mi++) {
    (function (month, icon, label) {
      ACHIEVEMENTS.push(
        def(
          "month_" + month,
          "📅 月份专属",
          icon,
          label,
          month + "月份完成任意20个任务",
          function (c) {
            return (c.monthCompleted[month] || 0) >= 20;
          },
          function (c) {
            return Math.min(1, (c.monthCompleted[month] || 0) / 20);
          }
        )
      );
    })(mi + 1, MONTH_ICONS[mi], MONTH_NAMES[mi]);
  }

  ACHIEVEMENTS.push(
    def(
      "pro_lang_3",
      "🎓 专业领域",
      "🗣️",
      "语言征服者",
      "完成3个语言学习类目标",
      function (c) {
        return c.typeGoalDoneCount["语言学习"] >= 3;
      },
      function (c) {
        return Math.min(1, (c.typeGoalDoneCount["语言学习"] || 0) / 3);
      }
    ),
    def(
      "pro_code_3",
      "🎓 专业领域",
      "💻",
      "代码骑士",
      "完成3个编程开发类目标",
      function (c) {
        return c.typeGoalDoneCount["编程开发"] >= 3;
      },
      function (c) {
        return Math.min(1, (c.typeGoalDoneCount["编程开发"] || 0) / 3);
      }
    ),
    def(
      "pro_exam_3",
      "🎓 专业领域",
      "📝",
      "考场霸主",
      "完成3个考试备考类目标",
      function (c) {
        return c.typeGoalDoneCount["考试备考"] >= 3;
      },
      function (c) {
        return Math.min(1, (c.typeGoalDoneCount["考试备考"] || 0) / 3);
      }
    ),
    def(
      "pro_skill_3",
      "🎓 专业领域",
      "🎨",
      "技艺大师",
      "完成3个技能提升类目标",
      function (c) {
        return c.typeGoalDoneCount["技能提升"] >= 3;
      },
      function (c) {
        return Math.min(1, (c.typeGoalDoneCount["技能提升"] || 0) / 3);
      }
    ),
    def(
      "pro_four",
      "🎓 专业领域",
      "🌈",
      "全能学者",
      "完成4种不同类型的目标各至少1个",
      function (c) {
        var need = ["语言学习", "编程开发", "考试备考", "技能提升"];
        return need.every(function (t) {
          return (c.typeGoalDoneCount[t] || 0) >= 1;
        });
      },
      function (c) {
        var need = ["语言学习", "编程开发", "考试备考", "技能提升"];
        var ok = 0;
        need.forEach(function (t) {
          if ((c.typeGoalDoneCount[t] || 0) >= 1) ok++;
        });
        return ok / 4;
      }
    ),
    def(
      "pro_same_5",
      "🎓 专业领域",
      "🔬",
      "领域先锋",
      "在同一类型完成5个目标",
      function (c) {
        return c.maxSameTypeGoals >= 5;
      },
      function (c) {
        return Math.min(1, c.maxSameTypeGoals / 5);
      }
    ),

    def(
      "time_morning_10",
      "⏰ 时间特别",
      "🌅",
      "清晨战士",
      "在早上6-9点完成任务（累计10次）",
      function (c) {
        return c.morningCompleteCount >= 10;
      },
      function (c) {
        return Math.min(1, c.morningCompleteCount / 10);
      }
    ),
    def(
      "time_night_10",
      "⏰ 时间特别",
      "🌙",
      "夜猫学者",
      "在晚上22-24点完成任务（累计10次）",
      function (c) {
        return c.nightCompleteCount >= 10;
      },
      function (c) {
        return Math.min(1, c.nightCompleteCount / 10);
      }
    ),
    def(
      "time_weekend_50",
      "⏰ 时间特别",
      "🏖️",
      "周末学霸",
      "周末累计完成50个任务",
      function (c) {
        return c.weekendCompletedCount >= 50;
      },
      function (c) {
        return Math.min(1, c.weekendCompletedCount / 50);
      }
    ),
    def(
      "time_anniv_365",
      "⏰ 时间特别",
      "🎉",
      "周年纪念",
      "使用满365天",
      function (c) {
        return c.accountAgeDays >= 365;
      },
      function (c) {
        return Math.min(1, c.accountAgeDays / 365);
      }
    ),
    def(
      "time_early_done",
      "⏰ 时间特别",
      "⏱️",
      "极速完成",
      "目标提前7天以上完成",
      function (c) {
        return c.hasEarlyFinishGoal;
      },
      function (c) {
        return c.hasEarlyFinishGoal ? 1 : 0;
      }
    ),

    def(
      "year_tasks_300",
      "🏅 年度成就",
      "📆",
      "年度坚持者",
      "某一年内完成300个任务",
      function (c) {
        return c.maxYearTasks >= 300;
      },
      function (c) {
        return Math.min(1, c.maxYearTasks / 300);
      }
    ),
    def(
      "year_checkin_300",
      "🏅 年度成就",
      "🗓️",
      "全年无休",
      "某一年内打卡超过300天",
      function (c) {
        return c.maxYearActiveDays >= 300;
      },
      function (c) {
        return Math.min(1, c.maxYearActiveDays / 300);
      }
    ),
    def(
      "year_goals_10",
      "🏅 年度成就",
      "🌟",
      "年度之星",
      "某一年内完成10个目标",
      function (c) {
        return c.maxYearGoalsDone >= 10;
      },
      function (c) {
        return Math.min(1, c.maxYearGoalsDone / 10);
      }
    ),

    def(
      META_IDS.collector20,
      "💫 特殊成就",
      "🎭",
      "收藏家",
      "解锁20个以上徽章",
      function () {
        return false;
      },
      null
    ),
    def(
      META_IDS.collector40,
      "💫 特殊成就",
      "👑",
      "成就传说",
      "解锁40个以上徽章",
      function () {
        return false;
      },
      null
    ),
    def(
      META_IDS.all50,
      "💫 特殊成就",
      "🌌",
      "星辰大海",
      "解锁全部徽章",
      function () {
        return false;
      },
      null
    )
  );

  var TOTAL_COUNT = ACHIEVEMENTS.length;

  function defById(id) {
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].id === id) return ACHIEVEMENTS[i];
    }
    return null;
  }

  function toMs(ts) {
    if (ts == null) return null;
    if (typeof ts === "number" && isFinite(ts)) return ts;
    return null;
  }

  function earliestAccountMs(profile, goals, tasksTree) {
    var ms = toMs(profile && profile.createdAt);
    var gids = Object.keys(goals || {});
    for (var i = 0; i < gids.length; i++) {
      var t = toMs(goals[gids[i]].createdAt);
      if (t && (!ms || t < ms)) ms = t;
    }
    if (!ms && tasksTree && typeof tasksTree === "object") {
      var dates = Object.keys(tasksTree).sort();
      if (dates.length) {
        var p = dates[0].split("-").map(Number);
        ms = new Date(p[0], p[1] - 1, p[2]).getTime();
      }
    }
    return ms || Date.now();
  }

  function buildCheckContext(uid, tasksTree, goals, profile, leavesMap, unlockedKeys) {
    var totalCompleted = AppData.countCompletedAll(tasksTree);
    var streaks = AppData.computeStreaks(tasksTree, leavesMap || {});
    var streakMax = Math.max(streaks.currentStreak || 0, streaks.longestStreak || 0);

    var goalIds = Object.keys(goals || {});
    var goalCount = goalIds.length;
    var typeDone = {};
    var typeGoalDoneCount = { 语言学习: 0, 编程开发: 0, 考试备考: 0, 技能提升: 0, 其他: 0 };
    var completedGoalCount = 0;
    var hasEarlyFinishGoal = false;

    for (var gi = 0; gi < goalIds.length; gi++) {
      var gid = goalIds[gi];
      var g = goals[gid];
      var prog = AppData.goalProgressFromTasks(tasksTree, gid);
      var typ = (g && g.type) || "其他";
      if (!typeGoalDoneCount[typ]) typeGoalDoneCount[typ] = 0;
      if (prog.total > 0 && prog.done >= prog.total) {
        completedGoalCount++;
        typeDone[typ] = true;
        if (/语言/.test(typ)) typeGoalDoneCount["语言学习"]++;
        else if (/编程/.test(typ)) typeGoalDoneCount["编程开发"]++;
        else if (/考试/.test(typ)) typeGoalDoneCount["考试备考"]++;
        else if (/技能/.test(typ)) typeGoalDoneCount["技能提升"]++;
        else typeGoalDoneCount["其他"]++;

        var dl = g.deadline;
        if (dl) {
          var parts = String(dl).split("-").map(Number);
          var deadlineEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
          var lastMs = 0;
          Object.keys(tasksTree || {}).forEach(function (ds) {
            var day = tasksTree[ds];
            if (!day) return;
            Object.keys(day).forEach(function (tid) {
              var t = day[tid];
              if (!t || t.goalId !== gid || !t.completed) return;
              var m = toMs(t.completedAt);
              if (m && m > lastMs) lastMs = m;
            });
          });
          if (lastMs && deadlineEnd.getTime() - lastMs >= 7 * 86400000) {
            hasEarlyFinishGoal = true;
          }
        }
      }
    }

    var maxSameTypeGoals = 0;
    ["语言学习", "编程开发", "考试备考", "技能提升", "其他"].forEach(function (t) {
      var n = typeGoalDoneCount[t] || 0;
      if (n > maxSameTypeGoals) maxSameTypeGoals = n;
    });

    var morningCompleteCount = 0;
    var nightCompleteCount = 0;
    var weekendCompletedCount = 0;
    var monthCompleted = {};
    var perDay = {};
    var yearTaskCount = {};
    var yearActiveDays = {};
    var yearGoalsDone = {};
    var activeDates = {};

    Object.keys(tasksTree || {}).forEach(function (dateStr) {
      var dayNode = tasksTree[dateStr];
      if (!dayNode || typeof dayNode !== "object") return;
      var dayDone = 0;
      Object.keys(dayNode).forEach(function (tid) {
        var t = dayNode[tid];
        if (!t || !t.completed) return;
        dayDone++;
        var ms = toMs(t.completedAt);
        if (ms == null) return;
        var d = new Date(ms);
        var h = d.getHours();
        var mon = d.getMonth() + 1;
        var y = d.getFullYear();
        if (h >= 6 && h < 9) morningCompleteCount++;
        if (h >= 22) nightCompleteCount++;
        monthCompleted[mon] = (monthCompleted[mon] || 0) + 1;
        yearTaskCount[y] = (yearTaskCount[y] || 0) + 1;
      });
      if (dayDone > 0) {
        perDay[dateStr] = dayDone;
        activeDates[dateStr] = true;
        var p = dateStr.split("-").map(Number);
        var dt = new Date(p[0], p[1] - 1, p[2]);
        var yd = dt.getFullYear();
        yearActiveDays[yd] = yearActiveDays[yd] || {};
        yearActiveDays[yd][dateStr] = true;
        var wd = dt.getDay();
        if (wd === 0 || wd === 6) weekendCompletedCount += dayDone;
      }
    });

    var maxTasksOneDay = 0;
    var sortedDates = Object.keys(perDay).sort();
    sortedDates.forEach(function (k) {
      if (perDay[k] > maxTasksOneDay) maxTasksOneDay = perDay[k];
    });

    var maxRunDaysGe5 = 0;
    var run5 = 0;
    sortedDates.forEach(function (k) {
      if (perDay[k] >= 5) {
        run5++;
        if (run5 > maxRunDaysGe5) maxRunDaysGe5 = run5;
      } else {
        run5 = 0;
      }
    });

    var maxYearTasks = 0;
    Object.keys(yearTaskCount).forEach(function (y) {
      if (yearTaskCount[y] > maxYearTasks) maxYearTasks = yearTaskCount[y];
    });
    var maxYearActiveDays = 0;
    Object.keys(yearActiveDays).forEach(function (y) {
      var n = Object.keys(yearActiveDays[y]).length;
      if (n > maxYearActiveDays) maxYearActiveDays = n;
    });

    Object.keys(goals || {}).forEach(function (gid) {
      var g = goals[gid];
      var prog = AppData.goalProgressFromTasks(tasksTree, gid);
      if (prog.total <= 0 || prog.done < prog.total) return;
      var doneYear = null;
      Object.keys(tasksTree || {}).forEach(function (ds) {
        var day = tasksTree[ds];
        if (!day) return;
        Object.keys(day).forEach(function (tid) {
          var t = day[tid];
          if (!t || t.goalId !== gid || !t.completed) return;
          var m = toMs(t.completedAt);
          if (m) {
            var yy = new Date(m).getFullYear();
            if (doneYear == null || yy > doneYear) doneYear = yy;
          }
        });
      });
      if (doneYear != null) {
        yearGoalsDone[doneYear] = (yearGoalsDone[doneYear] || 0) + 1;
      }
    });
    var maxYearGoalsDone = 0;
    Object.keys(yearGoalsDone).forEach(function (y) {
      if (yearGoalsDone[y] > maxYearGoalsDone) maxYearGoalsDone = yearGoalsDone[y];
    });

    var startAcc = earliestAccountMs(profile, goals, tasksTree);
    var accountAgeDays = Math.floor((Date.now() - startAcc) / 86400000);
    var totalDistinctDays = Object.keys(activeDates).length;

    var nameOk = profile && String(profile.name || "").trim().length >= 1;
    var bioOk = profile && String(profile.bio || profile.intro || "").trim().length >= 8;
    var profileComplete = !!(nameOk && bioOk);
    var profileProgress = nameOk && bioOk ? 1 : nameOk ? 0.5 : 0.25;

    return {
      uid: uid,
      totalCompleted: totalCompleted,
      streaks: streaks,
      streakMax: streakMax,
      currentStreak: streaks.currentStreak || 0,
      hadBreakThenSeven: !!streaks.hadBreakThenSeven,
      goalCount: goalCount,
      goals: goals,
      tasksTree: tasksTree,
      profile: profile,
      completedGoalCount: completedGoalCount,
      typeDone: typeDone,
      typeGoalDoneCount: typeGoalDoneCount,
      maxSameTypeGoals: maxSameTypeGoals,
      morningCompleteCount: morningCompleteCount,
      nightCompleteCount: nightCompleteCount,
      weekendCompletedCount: weekendCompletedCount,
      monthCompleted: monthCompleted,
      maxTasksOneDay: maxTasksOneDay,
      maxRunDaysGe5: maxRunDaysGe5,
      accountAgeDays: accountAgeDays,
      totalDistinctDays: totalDistinctDays,
      hasEarlyFinishGoal: hasEarlyFinishGoal,
      maxYearTasks: maxYearTasks,
      maxYearActiveDays: maxYearActiveDays,
      maxYearGoalsDone: maxYearGoalsDone,
      profileComplete: profileComplete,
      profileProgress: profileProgress,
      unlockedKeys: unlockedKeys,
    };
  }

  function loadUnlocked(uid) {
    var db = initFirebase().db;
    return db
      .ref("users/" + uid + "/achievements")
      .once("value")
      .then(function (s) {
        return s.val() || {};
      });
  }

  function checkAchievements(uid) {
    initFirebase();
    var db = initFirebase().db;
    return Promise.all([
      AppData.loadAllTasks(uid),
      AppData.loadGoals(uid),
      AppData.loadProfile(uid),
      loadUnlocked(uid),
      AppData.loadLeaves(uid),
    ]).then(function (res) {
      var tasksTree = res[0];
      var goals = res[1];
      var profile = res[2];
      var unlockedMap = res[3];
      var leavesMap = res[4];
      if (profile && profile.devPauseAchCheck) return [];
      var unlockedKeys = Object.keys(unlockedMap);
      var willHave = {};
      unlockedKeys.forEach(function (k) {
        willHave[k] = true;
      });

      var ctx = buildCheckContext(uid, tasksTree, goals, profile, leavesMap, unlockedKeys);
      var updates = {};
      var newList = [];

      for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        var def = ACHIEVEMENTS[i];
        if (def.id === META_IDS.collector20 || def.id === META_IDS.collector40 || def.id === META_IDS.all50) {
          continue;
        }
        if (willHave[def.id]) continue;
        if (!def.check(ctx)) continue;
        updates["users/" + uid + "/achievements/" + def.id] = {
          unlockedAt: firebase.database.ServerValue.TIMESTAMP,
          notified: false,
        };
        newList.push(def);
        willHave[def.id] = true;
      }

      var mergedUnlock = Object.assign({}, unlockedMap);
      Object.keys(updates).forEach(function (path) {
        var id = path.split("/").pop();
        mergedUnlock[id] = { unlockedAt: true, notified: false };
      });
      var countNonMeta = function (m) {
        var n = 0;
        Object.keys(m).forEach(function (id) {
          if (id === META_IDS.collector20 || id === META_IDS.collector40 || id === META_IDS.all50) return;
          var v = m[id];
          if (v && v.unlockedAt) n++;
        });
        return n;
      };
      var nonMetaCount = countNonMeta(mergedUnlock);

      if (!willHave[META_IDS.collector20] && nonMetaCount >= 20) {
        updates["users/" + uid + "/achievements/" + META_IDS.collector20] = {
          unlockedAt: firebase.database.ServerValue.TIMESTAMP,
          notified: false,
        };
        willHave[META_IDS.collector20] = true;
        mergedUnlock[META_IDS.collector20] = { unlockedAt: true, notified: false };
        newList.push(defById(META_IDS.collector20));
      }
      nonMetaCount = countNonMeta(mergedUnlock);
      if (!willHave[META_IDS.collector40] && nonMetaCount >= 40) {
        updates["users/" + uid + "/achievements/" + META_IDS.collector40] = {
          unlockedAt: firebase.database.ServerValue.TIMESTAMP,
          notified: false,
        };
        willHave[META_IDS.collector40] = true;
        mergedUnlock[META_IDS.collector40] = { unlockedAt: true, notified: false };
        newList.push(defById(META_IDS.collector40));
      }

      var allOthers = true;
      for (var j = 0; j < ACHIEVEMENTS.length; j++) {
        var did = ACHIEVEMENTS[j].id;
        if (did === META_IDS.all50) continue;
        var u = mergedUnlock[did];
        if (!u || !u.unlockedAt) {
          allOthers = false;
          break;
        }
      }
      if (!willHave[META_IDS.all50] && allOthers) {
        updates["users/" + uid + "/achievements/" + META_IDS.all50] = {
          unlockedAt: firebase.database.ServerValue.TIMESTAMP,
          notified: false,
        };
        newList.push(defById(META_IDS.all50));
      }

      if (Object.keys(updates).length === 0) return [];

      return db.ref().update(updates).then(function () {
        return newList;
      });
    });
  }

  function markNotified(uid, ids) {
    if (!ids || !ids.length) return Promise.resolve();
    var db = initFirebase().db;
    var u = {};
    for (var i = 0; i < ids.length; i++) {
      u["users/" + uid + "/achievements/" + ids[i] + "/notified"] = true;
    }
    return db.ref().update(u);
  }

  function showCelebration(badgeDefs, onClose, containerId) {
    var ov = document.getElementById(containerId || "ach-celebrate");
    if (!ov) {
      if (onClose) onClose();
      return;
    }
    var titleEl = ov.querySelector(".ach-celebrate__title");
    var subEl = ov.querySelector(".ach-celebrate__sub");
    var iconEl = ov.querySelector(".ach-celebrate__icon");
    var stars = ov.querySelector(".ach-celebrate__stars");
    if (stars) {
      stars.innerHTML = "";
      var cx = window.innerWidth * 0.5;
      var cy = window.innerHeight * 0.5;
      for (var s = 0; s < 36; s++) {
        var sp = document.createElement("span");
        sp.style.left = Math.random() * 100 + "%";
        sp.style.top = Math.random() * 100 + "%";
        sp.style.animationDelay = Math.random() * 0.35 + "s";
        stars.appendChild(sp);
      }
      requestAnimationFrame(function () {
        var ch = stars.children;
        for (var i = 0; i < ch.length; i++) {
          var sp2 = ch[i];
          var r = sp2.getBoundingClientRect();
          var sx = r.left + r.width / 2;
          var sy = r.top + r.height / 2;
          sp2.style.setProperty("--tx", cx - sx + "px");
          sp2.style.setProperty("--ty", cy - sy + "px");
        }
      });
    }
    var first = badgeDefs[0];
    var names = badgeDefs
      .map(function (b) {
        return b.name;
      })
      .join(" · ");
    if (titleEl) titleEl.textContent = names;
    if (subEl) subEl.textContent = badgeDefs.length > 1 ? "恭喜解锁 " + badgeDefs.length + " 个徽章！" : "解锁条件：" + (first.desc || "");
    if (iconEl) iconEl.innerHTML = achievementGlyphSvg(first, true);

    ov.classList.add("is-on");
    ov.setAttribute("aria-hidden", "false");

    window.setTimeout(function () {
      ov.classList.remove("is-on");
      ov.setAttribute("aria-hidden", "true");
      if (onClose) onClose();
    }, 3000);
  }

  function processNewBadges(uid, newBadges, celebrateRootId) {
    if (!newBadges || !newBadges.length) return Promise.resolve();
    return new Promise(function (resolve) {
      showCelebration(
        newBadges,
        function () {
          markNotified(
            uid,
            newBadges.map(function (b) {
              return b.id;
            })
          ).then(resolve, resolve);
        },
        celebrateRootId
      );
    });
  }

  function flushUnnotifiedCelebrations(uid, celebrateRootId) {
    return loadUnlocked(uid).then(function (map) {
      var pending = [];
      Object.keys(map).forEach(function (id) {
        var v = map[id];
        if (v && v.unlockedAt && v.notified === false) {
          var d = defById(id);
          if (d) pending.push(d);
        }
      });
      if (!pending.length) return Promise.resolve();
      return processNewBadges(uid, pending, celebrateRootId);
    });
  }

  function getRecentUnlocked(uid, limit) {
    return loadUnlocked(uid).then(function (map) {
      var rows = Object.keys(map).map(function (id) {
        var v = map[id];
        var d = defById(id);
        if (!d) return null;
        return { id: id, def: d, unlockedAt: toMs(v.unlockedAt) || 0 };
      });
      rows = rows.filter(Boolean);
      rows.sort(function (a, b) {
        return b.unlockedAt - a.unlockedAt;
      });
      return rows.slice(0, limit || 3);
    });
  }

  function renderHomeBadges(uid, container) {
    if (!container) return;
    getRecentUnlocked(uid, 3).then(function (rows) {
      container.innerHTML = "";
      if (!rows.length) {
        container.innerHTML = '<p class="muted">暂无已解锁徽章，去完成任务吧！</p>';
        return;
      }
      rows.forEach(function (r) {
        var d = r.def;
        var a = document.createElement("a");
        a.className = "ach-home-chip";
        a.href = "city.html";
        a.innerHTML =
          '<span class="ach-home-chip__ico"></span><div><div class="ach-home-chip__name"></div><div class="ach-home-chip__meta muted">已解锁 · 查看成就墙</div></div>';
        a.querySelector(".ach-home-chip__ico").innerHTML = achievementGlyphSvg(d, true);
        a.querySelector(".ach-home-chip__name").textContent = d.name;
        container.appendChild(a);
      });
    });
  }

  function renderWall(uid) {
    return Promise.all([
      loadUnlocked(uid),
      AppData.loadAllTasks(uid),
      AppData.loadGoals(uid),
      AppData.loadProfile(uid),
      AppData.loadLeaves(uid),
    ]).then(function (res) {
      var unlockedMap = res[0];
      var tasksTree = res[1];
      var goals = res[2];
      var profile = res[3];
      var leavesMap = res[4];
      var unlockedKeys = Object.keys(unlockedMap);
      var ctx = buildCheckContext(uid, tasksTree, goals, profile, leavesMap, unlockedKeys);

      var unlocked = 0;
      var lastUnlocked = null;
      var lastMs = 0;
      Object.keys(unlockedMap).forEach(function (id) {
        var v = unlockedMap[id];
        if (v && v.unlockedAt) {
          unlocked++;
          var ms = toMs(v.unlockedAt) || 0;
          if (ms >= lastMs) {
            lastMs = ms;
            var def = defById(id);
            if (def) lastUnlocked = def;
          }
        }
      });

      var pct = Math.round((unlocked / TOTAL_COUNT) * 100);
      var elUn = document.getElementById("ach-stat-unlocked");
      var elBar = document.getElementById("ach-stat-bar");
      var elRecent = document.getElementById("ach-stat-recent");
      if (elUn) elUn.textContent = unlocked + " / " + TOTAL_COUNT;
      if (elBar) elBar.style.width = pct + "%";
      if (elRecent) {
        elRecent.textContent = lastUnlocked ? "最近：" + lastUnlocked.name : "最近：—";
      }

      var host = document.getElementById("ach-wall");
      if (!host) return;
      host.innerHTML = "";

      var bySeries = {};
      SERIES_ORDER.forEach(function (s) {
        bySeries[s] = [];
      });
      ACHIEVEMENTS.forEach(function (d) {
        if (bySeries[d.series]) bySeries[d.series].push(d);
      });

      SERIES_ORDER.forEach(function (series) {
        var list = bySeries[series];
        if (!list || !list.length) return;
        var sec = document.createElement("section");
        sec.className = "ach-series card";
        var h = document.createElement("h2");
        h.className = "card__title";
        h.textContent = series;
        sec.appendChild(h);
        var sub = document.createElement("p");
        sub.className = "ach-series__desc muted";
        sub.textContent = SERIES_DESC[series] || "";
        sec.appendChild(sub);
        var grid = document.createElement("div");
        grid.className = "ach-grid";

        list.forEach(function (def) {
          var rec = unlockedMap[def.id];
          var isOn = !!(rec && rec.unlockedAt);
          var card = document.createElement("div");
          card.className = "ach-card" + (isOn ? " ach-card--on" : " ach-card--off");
          if (isOn && sessionStorage.getItem("ach_glow_" + def.id)) {
            card.classList.add("ach-card--glow");
          }
          var ico = document.createElement("div");
          ico.className = "ach-card__icon";
          ico.innerHTML = achievementGlyphSvg(def, isOn);
          var body = document.createElement("div");
          body.className = "ach-card__body";
          var nm = document.createElement("div");
          nm.className = "ach-card__name";
          nm.textContent = def.name;
          var meta = document.createElement("div");
          meta.className = "ach-card__meta";
          if (isOn) {
            meta.textContent = new Date(toMs(rec.unlockedAt) || Date.now()).toLocaleString();
            var dsc = document.createElement("div");
            dsc.className = "ach-card__desc";
            dsc.textContent = def.desc;
            body.appendChild(nm);
            body.appendChild(dsc);
            body.appendChild(meta);
          } else {
            var prog = def.progress ? def.progress(ctx) : 0;
            if (prog == null || isNaN(prog)) prog = 0;
            meta.textContent = "?? " + Math.round(Math.min(100, Math.max(0, prog * 100))) + "% 进度";
            var dsc2 = document.createElement("div");
            dsc2.className = "ach-card__desc ach-card__desc--secret";
            dsc2.textContent = def.desc;
            body.appendChild(nm);
            body.appendChild(meta);
            body.appendChild(dsc2);
          }
          card.appendChild(ico);
          card.appendChild(body);
          grid.appendChild(card);
        });
        sec.appendChild(grid);
        host.appendChild(sec);
      });
    });
  }

  function initWallPage(uid) {
    var rootId = "ach-celebrate";
    AppData.loadProfile(uid)
      .then(function (profile) {
        if (profile && profile.devPauseAchCheck) {
          return renderWall(uid).then(function () {
            var recent = document.getElementById("ach-stat-recent");
            if (recent) recent.textContent = "最近：开发者模式已暂停自动检测（请在 DEV 面板手动重检）";
          });
        }
        return checkAchievements(uid)
          .then(function (newBadges) {
            if (newBadges && newBadges.length) {
              newBadges.forEach(function (b) {
                sessionStorage.setItem("ach_glow_" + b.id, "1");
              });
              return processNewBadges(uid, newBadges, rootId);
            }
            return flushUnnotifiedCelebrations(uid, rootId);
          })
          .then(function () {
            return renderWall(uid);
          });
      })
      .catch(function (e) {
        console.error(e);
      });
  }

  function runCheckAndCelebrate(uid, celebrateRootId) {
    return checkAchievements(uid).then(function (newBadges) {
      if (newBadges && newBadges.length) {
        newBadges.forEach(function (b) {
          sessionStorage.setItem("ach_glow_" + b.id, "1");
        });
        return processNewBadges(uid, newBadges, celebrateRootId);
      }
      return flushUnnotifiedCelebrations(uid, celebrateRootId);
    });
  }

  global.Achievements = {
    ACHIEVEMENTS: ACHIEVEMENTS,
    TOTAL_COUNT: TOTAL_COUNT,
    checkAchievements: checkAchievements,
    runCheckAndCelebrate: runCheckAndCelebrate,
    flushUnnotifiedCelebrations: flushUnnotifiedCelebrations,
    renderWall: renderWall,
    renderHomeBadges: renderHomeBadges,
    initWallPage: initWallPage,
    markNotified: markNotified,
    getRecentUnlocked: getRecentUnlocked,
  };
})(window);
