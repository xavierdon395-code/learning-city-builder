(function () {
  "use strict";

  var lastPlan = null;

  function showMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
    el.style.border = "1px solid rgba(255,255,255,0.15)";
    el.style.padding = "8px";
    el.style.marginTop = "10px";
    el.style.background = ok ? "#d5f5c8" : "#ffd5d5";
  }

  function showLoading(text) {
    var loader = document.getElementById("cg-loader");
    if (!loader) return;
    var t = loader.querySelector(".muted");
    if (t && text) t.textContent = text;
    loader.classList.add("is-visible");
  }

  function hideLoading() {
    var loader = document.getElementById("cg-loader");
    if (!loader) return;
    loader.classList.remove("is-visible");
  }

  var GLYPHS = ["✦", "✧", "◆", "◇", "✶", "✴", "☆", "★"];
  var TYPE_LABELS = {
    language: "语言学习",
    programming: "编程技术",
    exam: "应试备考",
    fitness: "健身运动",
    reading: "阅读积累",
    creative: "创作技能",
    habit: "习惯养成",
    career: "职业发展",
    other: "其他",
  };

  function autoDetectGoalType(goalName) {
    var text = String(goalName || "").toLowerCase();
    var rules = {
      language: ["日语", "英语", "韩语", "法语", "德语", "西班牙", "雅思", "托福", "n1", "n2", "n3", "n4", "n5", "四级", "六级", "toeic", "cet", "口语", "听力", "发音", "单词"],
      programming: ["python", "java", "javascript", "前端", "后端", "算法", "刷题", "leetcode", "机器学习", "ai", "深度学习", "react", "vue", "编程", "代码", "开发", "web", "app", "flutter", "swift"],
      exam: ["考研", "高考", "公考", "公务员", "教资", "教师资格", "cpa", "司法", "注册会计", "医师", "药师", "建造师", "法考", "考试", "备考"],
      fitness: ["减肥", "减脂", "增肌", "瘦身", "跑步", "马拉松", "健身", "瑜伽", "游泳", "力量训练", "腹肌", "马甲线", "体重"],
      reading: ["读书", "阅读", "看完", "本书", "读完", "名著", "文学", "看课", "学完"],
      creative: ["写作", "小说", "文章", "绘画", "画画", "插画", "视频", "剪辑", "摄影", "音乐", "作曲", "吉他", "钢琴", "舞蹈"],
      habit: ["早起", "早睡", "冥想", "戒烟", "戒酒", "日记", "打卡", "坚持", "养成"],
      career: ["升职", "加薪", "跳槽", "副业", "涨粉", "创业", "面试", "求职", "简历", "人脉", "晋升"],
    };
    var keys = Object.keys(rules);
    for (var i = 0; i < keys.length; i++) {
      var type = keys[i];
      var keywords = rules[type];
      for (var j = 0; j < keywords.length; j++) {
        if (text.indexOf(String(keywords[j]).toLowerCase()) >= 0) return type;
      }
    }
    return null;
  }

  function setActiveByData(selector, keyAttr, value) {
    var all = document.querySelectorAll(selector);
    all.forEach(function (el) {
      var v = el.getAttribute(keyAttr);
      if (v === value) el.classList.add("active");
      else el.classList.remove("active");
    });
  }

  function calcTotalDays(deadline) {
    if (!deadline) return 30;
    var p = String(deadline).split("-").map(Number);
    if (p.length < 3) return 30;
    var dl = new Date(p[0], p[1] - 1, p[2]);
    dl.setHours(0, 0, 0, 0);
    var td = new Date();
    td.setHours(0, 0, 0, 0);
    var diff = Math.round((dl.getTime() - td.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }

  function readWeeklyHours() {
    var arr = [];
    for (var i = 0; i < 7; i++) {
      var el = document.getElementById("cg-wd-" + i);
      var v = el ? parseFloat(el.value) : 1;
      if (isNaN(v) || v < 0) v = 0;
      if (v > 12) v = 12;
      arr.push(v);
    }
    return arr;
  }

  function weeklyAvg(arr) {
    var s = 0;
    arr.forEach(function (x) {
      s += x;
    });
    return Math.round((s / 7) * 10) / 10;
  }

  function getTimeInfoForPrompt(selectedFlex) {
    var modeEl = document.querySelector('input[name="cg-time-mode"]:checked');
    var mode = modeEl ? modeEl.value : "uniform";
    var flexText =
      selectedFlex === "fixed"
        ? "时间规律：每天固定。"
        : selectedFlex === "irregular"
          ? "时间规律：不太规律，任务可拆分。"
          : "时间规律：工作日少周末多。";
    if (mode === "weekly") {
      var wh = readWeeklyHours();
      var labels = ["一", "二", "三", "四", "五", "六", "日"];
      var parts = [];
      for (var i = 0; i < 7; i++) parts.push("周" + labels[i] + wh[i] + "h");
      return "分天：" + parts.join("、") + "；均" + weeklyAvg(wh) + "h/天。" + flexText;
    }
    var h = Number(document.getElementById("cg-hours").value);
    return "每天约" + h + "小时。" + flexText;
  }

  function normalizeOutline(o) {
    o = o || {};
    var pd = Math.round(Number(o.phaseDays) || 37);
    o.phaseDays = Math.max(30, Math.min(60, pd));
    if (!Array.isArray(o.milestones)) o.milestones = [];
    if (!Array.isArray(o.risks)) o.risks = [];
    return o;
  }

  function topLevelKeySummary(payload) {
    if (!payload || typeof payload !== "object") return "非对象";
    var keys = Object.keys(payload);
    if (!keys.length) return "空对象";
    return keys.slice(0, 8).join(", ");
  }

  function tryParseJsonString(maybeText) {
    if (typeof maybeText !== "string") return null;
    var s = maybeText.trim();
    if (!s) return null;
    if (!(s[0] === "{" || s[0] === "[")) return null;
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  function makeLocalTypedError(errorType, message, meta) {
    var err = new Error(message || "生成失败");
    err.errorType = errorType || "unknown_error";
    err.meta = meta || {};
    return err;
  }

  function waitMs(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, Math.max(0, Math.round(Number(ms) || 0)));
    });
  }

  function mapCreateGoalErrorMessage(err) {
    var t = err && err.errorType ? String(err.errorType) : "";
    if (t === "response_parse_error") {
      return "服务响应不完整，请稍后重试（系统已记录诊断信息）。";
    }
    if (t === "model_payload_error") {
      return "AI 返回结构异常，已自动重试仍失败，请重试一次。";
    }
    if (t === "http_error") {
      return err && err.message ? err.message : "服务暂时不可用，请稍后重试。";
    }
    if (t === "transport_error") {
      return "网络连接异常，请检查网络后重试。";
    }
    return (err && err.message) || "生成失败，请稍后重试。";
  }

  function normalizeSingleTaskRow(row, expectedDay) {
    row = row && typeof row === "object" ? row : {};
    var dayNum = row.day != null ? Math.round(Number(row.day)) : expectedDay;
    if (!isFinite(dayNum)) dayNum = expectedDay;
    return {
      day: expectedDay,
      task: row.task || row.title || "学习任务",
      duration: row.duration || "25分钟",
      type: row.type || "学习",
      priority: row.priority || "中",
      tips: row.tips || "",
      reviewOf: row.reviewOf != null ? String(row.reviewOf) : "",
      _dayFromModel: dayNum,
    };
  }

  function normalizeDailyTasksPayload(payload, expectedDays) {
    expectedDays = Math.max(1, Math.round(Number(expectedDays) || 7));
    var daily = [];
    var sourceKey = "";
    var parsedNested = null;
    if (payload && Array.isArray(payload.dailyTasks)) {
      daily = payload.dailyTasks;
      sourceKey = "dailyTasks";
    } else if (payload && typeof payload.dailyTasks === "string") {
      parsedNested = tryParseJsonString(payload.dailyTasks);
      if (Array.isArray(parsedNested)) {
        daily = parsedNested;
        sourceKey = "dailyTasks(string)";
      }
    } else if (payload && payload.data && Array.isArray(payload.data.dailyTasks)) {
      daily = payload.data.dailyTasks;
      sourceKey = "data.dailyTasks";
    } else if (payload && payload.data && typeof payload.data.dailyTasks === "string") {
      parsedNested = tryParseJsonString(payload.data.dailyTasks);
      if (Array.isArray(parsedNested)) {
        daily = parsedNested;
        sourceKey = "data.dailyTasks(string)";
      }
    } else if (payload && payload.plan && Array.isArray(payload.plan.dailyTasks)) {
      daily = payload.plan.dailyTasks;
      sourceKey = "plan.dailyTasks";
    } else if (payload && payload.plan && typeof payload.plan.dailyTasks === "string") {
      parsedNested = tryParseJsonString(payload.plan.dailyTasks);
      if (Array.isArray(parsedNested)) {
        daily = parsedNested;
        sourceKey = "plan.dailyTasks(string)";
      }
    } else if (payload && Array.isArray(payload.tasks)) {
      daily = payload.tasks;
      sourceKey = "tasks";
    } else if (payload && typeof payload.tasks === "string") {
      parsedNested = tryParseJsonString(payload.tasks);
      if (Array.isArray(parsedNested)) {
        daily = parsedNested;
        sourceKey = "tasks(string)";
      }
    } else if (Array.isArray(payload)) {
      daily = payload;
      sourceKey = "root(array)";
    } else if (payload && typeof payload === "string") {
      parsedNested = tryParseJsonString(payload);
      if (parsedNested && Array.isArray(parsedNested.dailyTasks)) {
        daily = parsedNested.dailyTasks;
        sourceKey = "root(string).dailyTasks";
      } else if (Array.isArray(parsedNested)) {
        daily = parsedNested;
        sourceKey = "root(string-array)";
      }
    }

    var normalized = [];
    for (var i = 0; i < Math.min(expectedDays, daily.length); i++) {
      normalized.push(normalizeSingleTaskRow(daily[i], i + 1));
    }
    return {
      dailyTasks: normalized,
      sourceKey: sourceKey || "unknown",
      keySummary: topLevelKeySummary(payload),
    };
  }

  function generateOutline(goalData) {
    var systemPrompt = "你是专业学习规划师。返回严格 JSON，不能有任何注释或省略。";
    var userPrompt =
      "目标：" +
      goalData.goalName +
      "\n总天数：" +
      goalData.totalDays +
      "\n用户基础：" +
      goalData.level +
      "\n每日时间：" +
      goalData.dailyHours +
      "小时\n当前水平：" +
      goalData.currentLevel +
      "\n请生成学习大纲（不要每日任务）。键：summary,phaseName,phaseGoal,phaseDays(30-60整数),weeklyRhythm,milestones[{day,description}]至少3条,risks字符串数组3条,encouragement。只返回JSON。";
    return window.RollingPlan.callDeepSeekJSON(systemPrompt, userPrompt, 2048);
  }

  function generateFirstWindow(goalData, outline) {
    var systemPrompt = "你是学习规划师。返回严格 JSON，禁止注释和省略。";
    var userPrompt =
      "目标：" +
      goalData.goalName +
      "\n首阶段：" +
      outline.phaseName +
      "（" +
      outline.phaseDays +
      "天）\n阶段目标：" +
      outline.phaseGoal +
      "\n基础：" +
      goalData.level +
      " 每日" +
      goalData.dailyHours +
      "h\n生成第1-7天dailyTasks，每项含day,task,duration,type,priority,tips,reviewOf。第7天小测验。任务需具体（页码/题型等）。必须恰好7条。只返回JSON。";
    var retryPrompt =
      "目标：" +
      goalData.goalName +
      "\n首阶段：" +
      outline.phaseName +
      "（" +
      outline.phaseDays +
      "天）\n阶段目标：" +
      outline.phaseGoal +
      "\n仅输出 JSON 对象：{\"dailyTasks\":[{\"day\":1,\"task\":\"...\",\"duration\":\"25分钟\",\"type\":\"学习\",\"priority\":\"高\",\"tips\":\"...\",\"reviewOf\":\"\"}]}\n要求：\n1) 必须恰好7项\n2) day 必须严格为1到7\n3) 第7天为测验/复习\n4) 禁止注释和省略\n5) 只返回JSON。";

    function requestAndNormalize(prompt) {
      return window.RollingPlan.callDeepSeekJSON(systemPrompt, prompt, 3000).then(function (plan) {
        var norm = normalizeDailyTasksPayload(plan, 7);
        if (norm.dailyTasks.length !== 7) {
          throw makeLocalTypedError(
            "model_payload_error",
            "首窗需 7 天任务，实际 " + norm.dailyTasks.length + " 条（返回键：" + norm.keySummary + "）。",
            { keySummary: norm.keySummary, sourceKey: norm.sourceKey, length: norm.dailyTasks.length }
          );
        }
        plan.dailyTasks = norm.dailyTasks;
        return { plan: plan, norm: norm };
      });
    }

    return requestAndNormalize(userPrompt).then(function (first) {
      return first.plan;
    }).catch(function (firstErr) {
      var retryWithSamePrompt = firstErr && firstErr.errorType === "response_parse_error";
      var secondPrompt = retryWithSamePrompt ? userPrompt : retryPrompt;
      console.warn(
        "[create-goal] 首窗首轮失败，准备重试。type=" +
          (firstErr && firstErr.errorType ? firstErr.errorType : "unknown") +
          ", retry_mode=" +
          (retryWithSamePrompt ? "same_prompt" : "strict_prompt")
      );
      return waitMs(400).then(function () {
        return requestAndNormalize(secondPrompt).then(function (second) {
          return second.plan;
        });
      }).catch(function (secondErr) {
        if (!secondErr.errorType && firstErr && firstErr.errorType) {
          secondErr.errorType = firstErr.errorType;
        }
        throw secondErr;
      });
    });
  }

  function renderPlanPreview(outline, dailyTasks, container) {
    container.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "plan-timeline";
    var gi = 0;
    function addItem(title, body) {
      var item = document.createElement("div");
      item.className = "plan-timeline__item";
      var g = document.createElement("div");
      g.className = "plan-timeline__glyph";
      g.textContent = GLYPHS[gi % GLYPHS.length];
      gi++;
      var t = document.createElement("div");
      t.className = "plan-timeline__title";
      t.textContent = title;
      var b = document.createElement("p");
      b.className = "plan-timeline__body";
      b.textContent = body;
      item.appendChild(g);
      item.appendChild(t);
      item.appendChild(b);
      wrap.appendChild(item);
    }
    if (outline.summary) addItem("路线总结", outline.summary);
    addItem(
      "首阶段",
      (outline.phaseName || "") + " · " + (outline.phaseGoal || "") + " · " + (outline.phaseDays || "") + " 天/阶段"
    );
    if (outline.weeklyRhythm) addItem("每周节奏", outline.weeklyRhythm);
    if (Array.isArray(outline.milestones) && outline.milestones.length) {
      outline.milestones.slice(0, 5).forEach(function (m) {
        addItem("第 " + (m.day || "—") + " 天里程碑", m.description || "");
      });
    }
    addItem("执行窗口", "已生成前 7 天详细任务；之后在你打卡时自动续上下一窗。");
    if (Array.isArray(dailyTasks)) {
      dailyTasks.forEach(function (dt) {
        addItem("第 " + (dt.day || "") + " 天", (dt.task || "") + " · " + (dt.duration || "") + " · " + (dt.type || ""));
      });
    }
    container.appendChild(wrap);
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("goals");
      AppShared.pageEnterTransition();
      AppData.loadProfile(user.uid).then(function (p) {
        AppShared.hydrateUserChip(user, p);
      });

      var range = document.getElementById("cg-hours");
      var rangeOut = document.getElementById("cg-hours-out");
      var wrapUniform = document.getElementById("cg-time-uniform-wrap");
      var wrapWeekly = document.getElementById("cg-time-weekly-wrap");
      var avgEl = document.getElementById("cg-weekly-avg");

      function syncRange() {
        if (rangeOut && range) rangeOut.textContent = range.value + " 小时";
      }
      if (range) {
        range.addEventListener("input", syncRange);
        syncRange();
      }

      function syncWeeklyAvg() {
        if (!avgEl) return;
        avgEl.textContent = "每周平均：" + weeklyAvg(readWeeklyHours()) + " 小时/天";
      }
      for (var wi = 0; wi < 7; wi++) {
        var inp = document.getElementById("cg-wd-" + wi);
        if (inp) inp.addEventListener("input", syncWeeklyAvg);
      }
      syncWeeklyAvg();

      function syncTimeModeUI() {
        var m = document.querySelector('input[name="cg-time-mode"]:checked');
        m = m ? m.value : "uniform";
        if (wrapUniform) wrapUniform.hidden = m !== "uniform";
        if (wrapWeekly) wrapWeekly.hidden = m !== "weekly";
      }
      document.querySelectorAll('input[name="cg-time-mode"]').forEach(function (r) {
        r.addEventListener("change", syncTimeModeUI);
      });
      syncTimeModeUI();

      var msgEl = document.getElementById("cg-msg");
      var preview = document.getElementById("cg-plan-preview");
      var btnAi = document.getElementById("cg-ai");
      var btnSave = document.getElementById("cg-save");
      var wrapPreview = document.getElementById("cg-plan-wrap");
      var nameInput = document.getElementById("cg-name");
      var selectedType = null;
      var selectedLevel = null;
      var selectedFlex = null;

      function activateType(type, byAuto) {
        selectedType = type || null;
        setActiveByData(".type-card", "data-type", selectedType);
        if (!byAuto && nameInput) nameInput.removeAttribute("data-auto-detected-type");
      }

      function activateLevel(level) {
        selectedLevel = level || null;
        setActiveByData(".level-options button", "data-level", selectedLevel);
      }

      function activateFlex(flex) {
        selectedFlex = flex || null;
        setActiveByData(".flex-options button", "data-flex", selectedFlex);
      }

      document.querySelectorAll(".type-card").forEach(function (card) {
        card.addEventListener("click", function () {
          activateType(card.getAttribute("data-type"), false);
        });
      });
      document.querySelectorAll(".level-options button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activateLevel(btn.getAttribute("data-level"));
        });
      });
      document.querySelectorAll(".flex-options button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activateFlex(btn.getAttribute("data-flex"));
        });
      });

      if (nameInput) {
        nameInput.addEventListener("input", function () {
          var t = autoDetectGoalType(nameInput.value);
          if (!t) return;
          if (!selectedType || nameInput.getAttribute("data-auto-detected-type")) {
            activateType(t, true);
            nameInput.setAttribute("data-auto-detected-type", "1");
          }
        });
      }

      btnSave.disabled = true;
      wrapPreview.hidden = true;

      function collectFormData(requireComplete) {
        var goalName = document.getElementById("cg-name").value.trim();
        var goalType = selectedType || "other";
        var level = selectedLevel || "beginner";
        var flexibility = selectedFlex || "flexible";
        var deadline = document.getElementById("cg-deadline").value;
        var modeEl = document.querySelector('input[name="cg-time-mode"]:checked');
        var timeMode = modeEl ? modeEl.value : "uniform";
        var dailyHours = timeMode === "uniform" ? Number(range.value) : weeklyAvg(readWeeklyHours());
        var currentLevel = document.getElementById("cg-level").value.trim();
        var formData = {
          goalName: goalName,
          goalType: goalType,
          level: level,
          flexibility: flexibility,
          deadline: deadline,
          timeMode: timeMode,
          currentLevel: currentLevel,
          dailyHours: dailyHours,
          totalDays: calcTotalDays(deadline),
          weeklyHours: timeMode === "weekly" ? readWeeklyHours() : null,
        };
        if (!requireComplete) return formData;
        if (!formData.goalName || !formData.deadline || !selectedType || !selectedLevel || !selectedFlex) {
          alert("请完整填写所有字段");
          return null;
        }
        return formData;
      }

      btnAi.addEventListener("click", function () {
        showMsg(msgEl, "", true);
        var formData = collectFormData(true);
        if (!formData) return;
        if (!window.RollingPlan || !RollingPlan.callDeepSeekJSON) {
          showMsg(msgEl, "滚动规划模块未加载。", false);
          return;
        }
        btnAi.disabled = true;
        var goalData = {
          goalName: formData.goalName,
          goalType: formData.goalType,
          level: formData.level,
          flexibility: formData.flexibility,
          deadline: formData.deadline,
          currentLevel: formData.currentLevel || "（未填写）",
          totalDays: formData.totalDays,
          dailyHours: formData.dailyHours,
        };

        showLoading("① 生成学习大纲…");
        Promise.resolve()
          .then(function () {
            return generateOutline(goalData);
          })
          .then(function (outlineRaw) {
            var outline = normalizeOutline(outlineRaw);
            showLoading("② 生成首周详细任务…");
            return generateFirstWindow(goalData, outline).then(function (first) {
              return { outline: outline, firstWindow: first };
            });
          })
          .then(function (bundle) {
            lastPlan = bundle;
            wrapPreview.hidden = false;
            renderPlanPreview(bundle.outline, bundle.firstWindow.dailyTasks, preview);
            btnSave.disabled = false;
            showMsg(msgEl, "计划已生成：大纲 + 前 7 天任务。确认后保存。", true);
          })
          .catch(function (e) {
            console.error(e);
            showMsg(msgEl, mapCreateGoalErrorMessage(e), false);
            lastPlan = null;
            btnSave.disabled = true;
            wrapPreview.hidden = true;
          })
          .finally(function () {
            hideLoading();
            btnAi.disabled = false;
          });
      });

      btnSave.addEventListener("click", function () {
        if (!lastPlan || !lastPlan.outline || !lastPlan.firstWindow) {
          showMsg(msgEl, "请先生成计划。", false);
          return;
        }
        if (!window.RollingPlan || !RollingPlan.saveOutlineWindowGoalToFirebase) {
          showMsg(msgEl, "滚动规划模块未加载。", false);
          return;
        }
        var formData = collectFormData(true);
        if (!formData) return;
        var typeLabel = TYPE_LABELS[formData.goalType] || TYPE_LABELS.other;
        btnSave.disabled = true;
        showLoading("③ 保存计划…");
        RollingPlan.saveOutlineWindowGoalToFirebase(
          user,
          {
            name: formData.goalName,
            type: typeLabel,
            typeKey: formData.goalType,
            goalType: formData.goalType,
            level: formData.level,
            flexibility: formData.flexibility,
            deadline: formData.deadline,
            timeMode: formData.timeMode,
            dailyHours: formData.dailyHours,
            totalDays: formData.totalDays,
            weeklyHours: formData.weeklyHours,
            levelText:
              "基础：" +
              formData.level +
              "；灵活性：" +
              formData.flexibility +
              "；" +
              (formData.currentLevel || ""),
          },
          lastPlan.outline,
          lastPlan.firstWindow
        )
          .then(function () {
            if (window.Achievements) {
              return Achievements.checkAchievements(user.uid);
            }
          })
          .then(function () {
            window.location.href = "index.html";
          })
          .catch(function (e) {
            console.error(e);
            showMsg(msgEl, e.message || "保存失败", false);
            btnSave.disabled = false;
          })
          .finally(function () {
            hideLoading();
          });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.CreateGoalPhases = {
    calculatePhases: function (totalDays) {
      return window.RollingPlan ? RollingPlan.calculatePhases(totalDays) : { count: 1, daysPerPhase: totalDays };
    },
    getCurrentPhaseInfo: function (goal) {
      return window.RollingPlan ? RollingPlan.getCurrentPhaseInfo(goal) : { phaseNum: 1, startDay: 1, endDay: 1, totalPhases: 1 };
    },
  };
})();
