/**
 * 7–14 天滚动规划：首窗生成 + 每周重排 + 难度自适应（DeepSeek）
 */
(function (global) {
  "use strict";

  var DEEPSEEK_API_KEY = window.SECRETS?.DEEPSEEK_API_KEY || "";
  var DEEPSEEK_MODEL = "deepseek-v4-pro";

  function extractBalancedJsonObject(str) {
    var s = String(str || "");
    var i = s.indexOf("{");
    if (i < 0) return null;
    var depth = 0;
    var inStr = false;
    var esc = false;
    for (var j = i; j < s.length; j++) {
      var c = s[j];
      if (esc) {
        esc = false;
        continue;
      }
      if (inStr) {
        if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') {
        inStr = true;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return s.slice(i, j + 1);
      }
    }
    return null;
  }

  function modelOutputHasIllegalComments(raw) {
    var s = String(raw || "");
    if (/\/\*|\*\//.test(s)) return true;
    if (/\}\s*\/\//.test(s) || /\]\s*\/\//.test(s)) return true;
    var lines = s.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (/^\/\//.test(t)) return true;
      if (/^#/.test(t)) return true;
    }
    return false;
  }

  function parsePlanFromModelContent(rawText, finishReason) {
    var t = String(rawText || "").trim();
    if (!t) {
      throw new Error(
        "模型返回为空（偶发）。请重试；若多次出现可换 deepseek-v4-flash 或稍后再试。"
      );
    }
    var attempts = [];
    function tryParse(label, chunk) {
      if (!chunk || !String(chunk).trim()) return null;
      try {
        return JSON.parse(String(chunk).trim());
      } catch (e) {
        attempts.push(label + ": " + (e && e.message ? e.message : String(e)));
        return null;
      }
    }
    var fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      var fromFence = tryParse("代码块内JSON", fence[1]);
      if (fromFence) return fromFence;
    }
    var whole = tryParse("全文", t);
    if (whole) return whole;
    var balanced = extractBalancedJsonObject(t);
    if (balanced) {
      var fromBal = tryParse("括号配对截取", balanced);
      if (fromBal) return fromBal;
    }
    var tail =
      finishReason === "length"
        ? "生成可能被截断（finish_reason=length），请重试或缩短描述。"
        : "";
    console.error("模型原文（前 2000 字）:", t.slice(0, 2000));
    throw new Error(
      "无法解析为 JSON。" +
        tail +
        " 详情：" +
        (attempts[0] || "无有效 JSON 片段")
    );
  }

  function addDaysYMD(ymd, n) {
    var d = global.AppData.dateFromYMD(ymd);
    if (!d) return ymd;
    d.setDate(d.getDate() + n);
    return global.AppData.formatYMD(d);
  }

  function getMaxTaskDateForGoal(tasksTree, goalId) {
    var max = null;
    if (!tasksTree || !goalId) return max;
    Object.keys(tasksTree).forEach(function (dateKey) {
      var day = tasksTree[dateKey];
      if (!day || typeof day !== "object") return;
      var has = false;
      Object.keys(day).forEach(function (tid) {
        var t = day[tid];
        if (t && t.goalId === goalId) has = true;
      });
      if (has && (!max || dateKey > max)) max = dateKey;
    });
    return max;
  }

  /** 下一窗起始日：紧接已排最后一天之后，但不早于今天 */
  function computeNextWindowStartYMD(tasksTree, goalId, todayYmd) {
    var maxD = getMaxTaskDateForGoal(tasksTree, goalId);
    if (!maxD) return todayYmd;
    var next = addDaysYMD(maxD, 1);
    return next < todayYmd ? todayYmd : next;
  }

  function collectGoalStatsInRange(tasksTree, goalId, startYMD, endYMD) {
    var total = 0;
    var done = 0;
    if (!tasksTree || !goalId || !startYMD || !endYMD) {
      return { total: 0, done: 0, rate: 1 };
    }
    if (endYMD < startYMD) return { total: 0, done: 0, rate: 1 };
    var d = global.AppData.dateFromYMD(startYMD);
    var end = global.AppData.dateFromYMD(endYMD);
    if (!d || !end) return { total: 0, done: 0, rate: 1 };
    while (d <= end) {
      var key = global.AppData.formatYMD(d);
      var day = tasksTree[key];
      if (day && typeof day === "object") {
        Object.keys(day).forEach(function (tid) {
          var t = day[tid];
          if (t && t.goalId === goalId) {
            total += 1;
            if (t.completed) done += 1;
          }
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return { total: total, done: done, rate: total ? done / total : 1 };
  }

  /** 根据上周完成率调整难度档位 1–3 */
  function nextDifficultyFromRate(completionRate, current) {
    var d = current;
    if (d == null || !isFinite(d)) d = 2;
    d = Math.max(1, Math.min(3, Math.round(d)));
    if (completionRate >= 0.82) d = Math.min(3, d + 1);
    else if (completionRate <= 0.42) d = Math.max(1, d - 1);
    return d;
  }

  function getTimeInfoFromGoal(g) {
    if (!g) return "（无）";
    if (g.timeMode === "weekly" && Array.isArray(g.weeklyHours) && g.weeklyHours.length === 7) {
      var labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
      var parts = [];
      for (var i = 0; i < 7; i++) {
        parts.push(labels[i] + g.weeklyHours[i] + "小时");
      }
      return "分天设置：" + parts.join("、");
    }
    return "统一设置：每天约 " + (g.dailyHours != null ? g.dailyHours : 1) + " 小时";
  }

  function buildDailyTasksFromPlan(plan, horizonDays) {
    var n = Math.max(1, Math.min(120, Math.round(Number(horizonDays) || 10)));
    var daily = Array.isArray(plan.dailyTasks) ? plan.dailyTasks.slice() : [];
    var out = [];
    for (var i = 1; i <= n; i++) {
      var row =
        daily.find(function (x) {
          return Number(x.day) === i;
        }) || daily[i - 1];
      if (!row && daily.length) row = daily[daily.length - 1];
      if (!row) {
        row = {
          task: "第" + i + "天：巩固与练习",
          duration: "45分钟",
          type: "学习",
        };
      }
      out.push({
        task: row.task || row.title || "学习",
        duration: row.duration || "1小时",
        type: row.type || "学习",
      });
    }
    return out;
  }

  function buildInitialRollingPrompt(payload) {
    var userPayload = {
      goalName: payload.goalName,
      goalType: payload.goalType,
      deadline: payload.deadline,
      timeInfo: payload.timeInfo,
      currentLevel: payload.currentLevel,
      horizonDays: payload.horizonDays,
      planningModel: "rolling_7_14",
    };
    var userJson = JSON.stringify(userPayload);
    var N = Math.max(7, Math.min(14, Math.round(Number(payload.horizonDays) || 10)));
    return (
      "以下为用户学习目标信息（整段为 JSON 字符串，请解析后理解内容）：\n" +
      userJson +
      "\n\n请生成「滚动学习规划」的首个执行窗口（仅覆盖未来 " +
      N +
      " 天，不要一次性排满到截止日）。必须输出一个合法 JSON 对象（不要 markdown、不要前后说明文字）。\n" +
      "规划理念：长周期目标拆成多层——longTermOutline 描述到截止日的总体路线；phases 为少数阶段里程碑；dailyTasks 只包含当前窗口 " +
      N +
      " 天、每天一条，day 从 1 到 " +
      N +
      "。\n" +
      "根据用户水平与可用时间，为 dailyTasks 设定合理强度；difficultySuggested 为 1（更轻松）到 3（更挑战）的整数。\n" +
      "每条 task 描述尽量在 80 字以内，避免输出过长被截断。\n" +
      "严格使用下列键名与结构：\n" +
      "{\n" +
      '  "summary": "本窗口总结一句话",\n' +
      '  "longTermOutline": "到截止日的长期路线与中短期节奏说明（2–4句）",\n' +
      '  "difficultySuggested": 2,\n' +
      '  "horizonDays": ' +
      N +
      ",\n" +
      '  "phases": [\n' +
      "    {\n" +
      '      "name": "阶段名称",\n' +
      '      "days": 天数,\n' +
      '      "description": "阶段描述",\n' +
      '      "tasks": ["任务1", "任务2"]\n' +
      "    }\n" +
      "  ],\n" +
      '  "dailyTasks": [\n' +
      "    {\n" +
      '      "day": 1,\n' +
      '      "task": "具体任务描述",\n' +
      '      "duration": "1小时",\n' +
      '      "type": "学习"\n' +
      "    }\n" +
      "  ]\n" +
      "}\n" +
      "要求：dailyTasks 数组长度必须等于 horizonDays（即 " +
      N +
      "）。"
    );
  }

  function buildReplanPrompt(goal, stats, startYmd, horizonDays, newDifficulty) {
    var g = goal || {};
    var plan = g.plan || {};
    var userPayload = {
      goalName: g.name,
      goalType: g.type,
      deadline: g.deadline,
      timeInfo: getTimeInfoFromGoal(g),
      currentLevel: g.level || "",
      longTermOutline: plan.longTermOutline || plan.summary || "",
      previousSummary: plan.summary || "",
      planWeekIndex: g.planWeekIndex || 1,
      lastWindowStats: {
        periodTasksTotal: stats.total,
        periodTasksDone: stats.done,
        completionRate: stats.rate,
      },
      nextWindowStartDate: startYmd,
      horizonDays: horizonDays,
      adaptedDifficulty: newDifficulty,
      note:
        "请根据完成率调整任务量与深度：完成率高则略加码；完成率低则减量、增加复习与脚手架。难度档位 1=更轻松 3=更挑战。",
    };
    var userJson = JSON.stringify(userPayload);
    var N = Math.max(7, Math.min(120, Math.round(Number(horizonDays) || 10)));
    return (
      "以下为滚动规划「周重排」上下文（JSON 字符串）：\n" +
      userJson +
      "\n\n请生成下一执行窗口（从 nextWindowStartDate 起连续 " +
      N +
      " 天）的日任务。必须输出单个合法 JSON 对象。\n" +
      "保留长期方向：呼应 longTermOutline，但 dailyTasks 只写本窗口 " +
      N +
      " 天。\n" +
      "difficultySuggested 应接近 adaptedDifficulty（可在 ±1 内微调并说明在 summary 中）。\n" +
      "键名与首窗相同：summary、longTermOutline（可精炼改写）、difficultySuggested、horizonDays、" +
      "phases（可略作调整）、dailyTasks（day 从 1 到 " +
      N +
      "，长度必须等于 horizonDays）。"
    );
  }

  function makeTypedError(errorType, message, meta) {
    var err = new Error(message || "请求失败");
    err.errorType = errorType || "unknown_error";
    err.meta = meta || {};
    return err;
  }

  function safeJsonParse(rawText) {
    var text = String(rawText || "");
    if (!text.trim()) {
      return { ok: false, data: null, parseError: new Error("empty_body") };
    }
    try {
      return { ok: true, data: JSON.parse(text), parseError: null };
    } catch (e) {
      return { ok: false, data: null, parseError: e };
    }
  }

  function callDeepSeekJSON(systemPrompt, userPrompt, maxTokens) {
    var cap = Math.min(4096, Math.max(256, Math.round(Number(maxTokens) || 4096)));
    var requestId = "ds_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
    return fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: cap,
        response_format: { type: "json_object" },
      }),
    })
      .then(function (response) {
        var status = response.status;
        var contentType = response.headers && response.headers.get ? response.headers.get("content-type") || "" : "";
        return response.text().then(function (raw) {
          var rawText = String(raw || "");
          var rawPreview = rawText.slice(0, 300);
          var parsed = safeJsonParse(rawText);
          console.log(
            "[DeepSeek] request_id=" +
              requestId +
              ", status=" +
              status +
              ", content_type=" +
              contentType +
              ", raw_length=" +
              rawText.length
          );

          if (!rawText.trim()) {
            throw makeTypedError("response_parse_error", "API 返回空响应体，请稍后重试。", {
              requestId: requestId,
              status: status,
              contentType: contentType,
            });
          }

          if (!response.ok) {
            var userMsg = rawPreview;
            if (parsed.ok && parsed.data && parsed.data.error) {
              if (typeof parsed.data.error === "string") userMsg = parsed.data.error;
              else if (parsed.data.error.message) userMsg = parsed.data.error.message;
              else userMsg = JSON.stringify(parsed.data.error);
            } else if (parsed.ok && parsed.data && parsed.data.message) {
              userMsg = parsed.data.message;
            } else if (!parsed.ok) {
              userMsg = "接口返回非标准JSON（可能网关截断或代理干扰）";
            }
            if (userMsg.length > 800) userMsg = userMsg.slice(0, 800) + "…";
            throw makeTypedError("http_error", "API请求失败 " + status + "：" + userMsg, {
              requestId: requestId,
              status: status,
              contentType: contentType,
              rawPreview: rawPreview,
            });
          }

          if (!parsed.ok) {
            console.warn(
              "[DeepSeek] request_id=" +
                requestId +
                " response parse failed, preview=" +
                rawPreview
            );
            throw makeTypedError("response_parse_error", "接口返回非标准JSON（可能网关截断或代理干扰）。", {
              requestId: requestId,
              status: status,
              contentType: contentType,
              rawPreview: rawPreview,
            });
          }
          return { data: parsed.data, requestId: requestId };
        });
      })
      .then(function (payload) {
        var data = payload.data;
        var requestIdFromPayload = payload.requestId || requestId;
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
          throw makeTypedError("model_payload_error", "API 返回数据格式异常，缺少 choices[0].message", {
            requestId: requestIdFromPayload,
          });
        }
        var choice = data.choices[0];
        var text = choice.message.content;
        var finishReason = choice.finish_reason || "";
        var contentLen = String(text || "").length;
        console.log(
          "[DeepSeek] request_id=" +
            requestIdFromPayload +
            ", finish_reason=" +
            finishReason +
            ", content_len=" +
            contentLen
        );
        if (finishReason === "length") {
          console.warn("DeepSeek 输出可能因长度截断，finish_reason=length");
        }
        if (modelOutputHasIllegalComments(text)) {
          throw makeTypedError("model_payload_error", "AI 输出包含注释或无效格式，请重试", {
            requestId: requestIdFromPayload,
          });
        }
        var parsed = parsePlanFromModelContent(text, finishReason);
        if (parsed && typeof parsed === "object") {
          var keys = Object.keys(parsed);
          console.log(
            "[DeepSeek] request_id=" +
              requestIdFromPayload +
              ", top_keys=" +
              (keys.length ? keys.slice(0, 8).join(",") : "(empty)")
          );
        } else {
          console.log("[DeepSeek] request_id=" + requestIdFromPayload + ", top_keys=(non-object)");
        }
        return parsed;
      })
      .catch(function (err) {
        if (err instanceof TypeError) {
          throw makeTypedError("transport_error", "网络异常：无法连接服务器。请检查网络或 CORS。", {
            requestId: requestId,
          });
        }
        throw err;
      });
  }

  function callDeepSeek(systemContent, userPrompt) {
    return fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (errorText) {
          console.error("API错误详情:", errorText);
          var userMsg = errorText;
          try {
            var ej = JSON.parse(errorText);
            if (ej && ej.error) {
              if (typeof ej.error === "string") userMsg = ej.error;
              else if (ej.error.message) userMsg = ej.error.message;
              else userMsg = JSON.stringify(ej.error);
            } else if (ej && ej.message) userMsg = ej.message;
          } catch (parseErr) {
            /* keep */
          }
          if (userMsg.length > 800) userMsg = userMsg.slice(0, 800) + "…";
          throw new Error("API请求失败 " + response.status + "：" + userMsg);
        });
      }
      return response.json();
    }).then(function (data) {
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("API 返回数据格式异常，缺少 choices[0].message");
      }
      var choice = data.choices[0];
      var text = choice.message.content;
      var finishReason = choice.finish_reason || "";
      if (finishReason === "length") {
        console.warn("DeepSeek 输出可能因长度截断，finish_reason=length");
      }
      return parsePlanFromModelContent(text, finishReason);
    })
      .catch(function (err) {
        if (err instanceof TypeError) {
          throw new Error("网络异常：无法连接服务器。请检查网络或 CORS。");
        }
        throw err;
      });
  }

  function callInitialPlan(prompt) {
    var sys =
      "你是专业学习规划师。用户采用滚动规划：每次只排 7–14 天日任务，长期路线写在 longTermOutline。输出必须是可 JSON.parse 的单个对象：" +
      "summary、longTermOutline、difficultySuggested(1-3)、horizonDays、dailyTasks、phases。不要 markdown。dailyTasks 长度必须等于 horizonDays。";
    return callDeepSeek(sys, prompt);
  }

  function callReplanPlan(prompt) {
    var sys =
      "你是专业学习规划师，负责滚动规划的每周重排。结合用户上周任务完成率与难度档位，生成下一窗口日任务。输出可 JSON.parse 的单个对象，键与首窗一致。不要 markdown。dailyTasks 长度必须等于 horizonDays。";
    return callDeepSeek(sys, prompt);
  }

  function rollingWindowEndYMD(startYmd, numDays) {
    return addDaysYMD(startYmd, Math.max(1, numDays) - 1);
  }

  function calculatePhases(totalDays) {
    totalDays = Math.max(1, Math.round(Number(totalDays) || 1));
    if (totalDays <= 60) return { count: 1, daysPerPhase: totalDays };
    if (totalDays <= 180) return { count: 3, daysPerPhase: Math.ceil(totalDays / 3) };
    if (totalDays <= 365) return { count: 6, daysPerPhase: Math.ceil(totalDays / 6) };
    return { count: 12, daysPerPhase: Math.ceil(totalDays / 12) };
  }

  function getPhaseLayoutMeta(goal) {
    var totalDays = Math.max(1, Math.round(Number((goal || {}).totalDays) || 1));
    if (goal && goal.rollingVariant === "outline_7d" && goal.outlinePhaseDays && goal.totalPhases) {
      return {
        count: Math.max(1, Math.round(Number(goal.totalPhases))),
        daysPerPhase: Math.max(1, Math.round(Number(goal.outlinePhaseDays))),
      };
    }
    return calculatePhases(totalDays);
  }

  function getCurrentPhaseInfo(goal) {
    var totalDays = Math.max(1, Math.round(Number((goal || {}).totalDays) || 1));
    var meta = getPhaseLayoutMeta(goal);
    var phaseNum = Math.max(1, Math.min(meta.count, Math.round(Number((goal || {}).currentPhase) || 1)));
    var startDay = (phaseNum - 1) * meta.daysPerPhase + 1;
    var endDay = Math.min(phaseNum * meta.daysPerPhase, totalDays);
    return { phaseNum: phaseNum, startDay: startDay, endDay: endDay, totalPhases: meta.count, daysPerPhase: meta.daysPerPhase };
  }

  function getGoalAnchorYMD(goal, tasksTree, goalId) {
    if (goal && goal.rollingAnchorYMD) return goal.rollingAnchorYMD;
    var minDate = null;
    Object.keys(tasksTree || {}).forEach(function (ds) {
      var day = tasksTree[ds];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        var t = day[tid];
        if (t && t.goalId === goalId) {
          if (!minDate || ds < minDate) minDate = ds;
        }
      });
    });
    return minDate || global.AppData.todayYMD();
  }

  function calcPhaseCompletionRate(tasksTree, goalId, startYmd, endYmd) {
    var total = 0;
    var done = 0;
    var d = global.AppData.dateFromYMD(startYmd);
    var end = global.AppData.dateFromYMD(endYmd);
    if (!d || !end) return 0;
    while (d <= end) {
      var key = global.AppData.formatYMD(d);
      var day = tasksTree[key];
      if (day && typeof day === "object") {
        Object.keys(day).forEach(function (tid) {
          var t = day[tid];
          if (!t || t.goalId !== goalId) return;
          total++;
          if (t.completed) done++;
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return total ? Math.round((done / total) * 100) : 0;
  }

  /**
   * 首窗：写入目标 + 任务
   */
  function saveRollingGoalToFirebase(user, form, plan, horizonDays) {
    var { db } = initFirebase();
    var uid = user.uid;
    var goalId = db.ref().push().key;
    var today = global.AppData.todayYMD();
    var diff =
      plan.difficultySuggested != null
        ? Math.max(1, Math.min(3, Math.round(Number(plan.difficultySuggested))))
        : 2;
    var totalDays = Math.max(1, Math.round(Number(form.totalDays) || Number((plan || {}).currentPhaseDays) || Number(horizonDays) || 10));
    var phaseMeta = calculatePhases(totalDays);
    var initialDays = Math.max(
      1,
      Math.min(120, Math.round(Number((plan || {}).currentPhaseDays) || phaseMeta.daysPerPhase || Number(horizonDays) || 10))
    );
    var firstPhaseDays = Math.min(initialDays, phaseMeta.daysPerPhase, totalDays);
    var rows = buildDailyTasksFromPlan(plan, firstPhaseDays);
    var endYmd = rollingWindowEndYMD(today, rows.length);
    var planNorm = plan && typeof plan === "object" ? Object.assign({}, plan) : {};
    planNorm.horizonDays = initialDays;
    var goalPayload = {
      name: form.name,
      type: form.type,
      goalType: form.goalType || form.typeKey || "other",
      deadline: form.deadline,
      timeMode: form.timeMode || "uniform",
      dailyHours: form.dailyHours,
      weeklyHours: form.weeklyHours || null,
      level: form.level || "beginner",
      flexibility: form.flexibility || "flexible",
      levelText: form.levelText || "",
      plan: planNorm,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      progress: 0,
      totalPlannedTasks: rows.length,
      overLeave: false,
      planningMode: "rolling",
      horizonDays: initialDays,
      difficultyLevel: diff,
      rollingAnchorYMD: today,
      rollingWindowEndYMD: endYmd,
      lastReplanYMD: today,
      nextReplanYMD: addDaysYMD(today, 7),
      planWeekIndex: 1,
      totalDays: totalDays,
      totalPhases: phaseMeta.count,
      currentPhase: 1,
      phases: [
        {
          phaseNum: 1,
          name: plan.phaseName || "第一阶段",
          startDay: 1,
          endDay: firstPhaseDays,
          goal: plan.phaseGoal || "",
          generatedAt: firebase.database.ServerValue.TIMESTAMP,
          completionRate: null,
          adjustments: null,
        },
      ],
      encouragement: plan.encouragement || "",
      risks: Array.isArray(plan.risks) ? plan.risks : [],
      milestones: Array.isArray(plan.milestones) ? plan.milestones : [],
    };

    var updates = {};
    updates["users/" + uid + "/goals/" + goalId] = goalPayload;

    for (var i = 0; i < rows.length; i++) {
      var d = global.AppData.dateFromYMD(today);
      d.setDate(d.getDate() + i);
      var dateStr = global.AppData.formatYMD(d);
      var taskId = db.ref().push().key;
      var item = rows[i];
      updates["users/" + uid + "/tasks/" + dateStr + "/" + taskId] = {
        goalId: goalId,
        goalName: form.name,
        task: item.task,
        duration: item.duration,
        type: item.type,
        completed: false,
        completedAt: null,
      };
    }

    return db.ref().update(updates).then(function () {
      return Promise.all([
        global.AppData.loadAllTasks(uid),
        global.AppData.loadLeaves(uid),
        global.AppData.loadGoals(uid),
      ]).then(function (r) {
        return global.AppData.recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
      });
    });
  }

  function isRollingGoal(g) {
    return g && g.planningMode === "rolling";
  }

  function isOutlineWindowGoal(g) {
    return isRollingGoal(g) && g.rollingVariant === "outline_7d";
  }

  function inferPlanDay(task, dateStr, anchorYmd) {
    if (task && task.planDay != null && isFinite(Number(task.planDay))) {
      return Math.round(Number(task.planDay));
    }
    var d0 = global.AppData.dateFromYMD(anchorYmd);
    var d1 = global.AppData.dateFromYMD(dateStr);
    if (!d0 || !d1) return 0;
    return Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1;
  }

  function collectPlanDayMap(tasksTree, goalId, anchorYmd) {
    var map = {};
    Object.keys(tasksTree || {}).forEach(function (ds) {
      var day = tasksTree[ds];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (tid) {
        var t = day[tid];
        if (!t || t.goalId !== goalId) return;
        var pd = inferPlanDay(t, ds, anchorYmd);
        if (pd < 1) return;
        map[pd] = { planDay: pd, task: t.task || "", completed: !!t.completed, dateStr: ds };
      });
    });
    return map;
  }

  function getMaxGeneratedPlanDay(tasksTree, goalId, anchorYmd) {
    var m = collectPlanDayMap(tasksTree, goalId, anchorYmd);
    var keys = Object.keys(m).map(Number);
    if (!keys.length) return 0;
    return Math.max.apply(null, keys);
  }

  function getTodayPlanDayNumber(goal) {
    var anchor = (goal && goal.rollingAnchorYMD) || global.AppData.todayYMD();
    var today = global.AppData.todayYMD();
    var d0 = global.AppData.dateFromYMD(anchor);
    var d1 = global.AppData.dateFromYMD(today);
    if (!d0 || !d1) return 1;
    var diff = Math.round((d1.getTime() - d0.getTime()) / 86400000);
    var n = diff + 1;
    var td = Math.max(1, Math.round(Number((goal || {}).totalDays) || 1));
    return Math.max(1, Math.min(td, n));
  }

  var nextWindowGenLocks = {};

  function generateNextWindow(uid, goalId) {
    var lockKey = uid + ":" + goalId;
    if (nextWindowGenLocks[lockKey]) {
      return nextWindowGenLocks[lockKey];
    }
    nextWindowGenLocks[lockKey] = generateNextWindowInner(uid, goalId).finally(function () {
      delete nextWindowGenLocks[lockKey];
    });
    return nextWindowGenLocks[lockKey];
  }

  function generateNextWindowInner(uid, goalId) {
    return global.AppData.loadGoals(uid).then(function (goals) {
      var goal = goals[goalId];
      if (!goal || !isOutlineWindowGoal(goal)) return null;
      return global.AppData.loadAllTasks(uid).then(function (tasksTree) {
        var anchor = getGoalAnchorYMD(goal, tasksTree, goalId);
        var maxDay = getMaxGeneratedPlanDay(tasksTree, goalId, anchor);
        var totalDays = Math.max(1, Math.round(Number(goal.totalDays) || 1));
        if (maxDay >= totalDays) return null;
        var startDay = maxDay + 1;
        var endDay = Math.min(startDay + 6, totalDays);
        var days = endDay - startDay + 1;
        if (collectPlanDayMap(tasksTree, goalId, anchor)[startDay]) {
          return null;
        }

        var recent = [];
        for (var d = maxDay - 2; d <= maxDay; d++) {
          if (d < 1) continue;
          var row = collectPlanDayMap(tasksTree, goalId, anchor)[d];
          if (row) recent.push(row);
        }
        recent.sort(function (a, b) {
          return a.planDay - b.planDay;
        });
        var recentCompleted = recent.filter(function (x) {
          return x.completed;
        }).length;
        var completionHint =
          recent.length > 0 ? Math.round((recentCompleted / recent.length) * 100) : 80;
        var adapt =
          completionHint >= 80 ? "可保持当前难度" : completionHint >= 60 ? "保持稳定" : "适当降低任务量";

        var recentLines = recent.length
          ? recent
              .map(function (t) {
                return "第" + t.planDay + "天：" + t.task + "（" + (t.completed ? "已完成" : "未完成") + "）";
              })
              .join("\n")
          : "（尚无最近记录，按首周节奏延续）";

        var systemPrompt = "你是学习规划师。返回严格 JSON，禁止注释。";
        var userPrompt =
          "目标：" +
          (goal.name || "") +
          "\n阶段：" +
          (goal.phaseName || "进行中") +
          "\n本次生成：第 " +
          startDay +
          " 至 " +
          endDay +
          " 天，共 " +
          days +
          " 天\n最近3天任务：\n" +
          recentLines +
          "\n最近完成率：" +
          completionHint +
          "%\n" +
          adapt +
          '\n返回严格 JSON：{"dailyTasks":[{"day":' +
          startDay +
          ',"task":"…","duration":"25分钟","type":"学习","priority":"高","tips":"…","reviewOf":""},…共' +
          days +
          "项，day从" +
          startDay +
          "到" +
          endDay +
          "]}\n要求：连贯不重复；每7天左右安排复习/测验；禁止省略；只返回JSON";

        return callDeepSeekJSON(systemPrompt, userPrompt, 3000).then(function (result) {
          var daily = result && Array.isArray(result.dailyTasks) ? result.dailyTasks : null;
          if (!daily || daily.length !== days) {
            throw new Error("续窗任务数量不符（需 " + days + " 天）");
          }
          var startYmd = addDaysYMD(anchor, startDay - 1);
          var rows = daily.map(function (dt, i) {
            var expectedDay = startDay + i;
            var dayNum = dt.day != null ? Math.round(Number(dt.day)) : expectedDay;
            if (dayNum !== expectedDay) {
              console.warn("[rolling-plan] day 序号修正", dayNum, "->", expectedDay);
            }
            return {
              task: dt.task || "学习",
              duration: dt.duration || "25分钟",
              type: dt.type || "学习",
              planDay: expectedDay,
              priority: dt.priority,
              tips: dt.tips,
              reviewOf: dt.reviewOf,
            };
          });
          return global.AppData.appendTaskDaysForGoal(uid, goalId, goal.name, startYmd, rows).then(function () {
            var { db } = initFirebase();
            var today = global.AppData.todayYMD();
            var endYmd = rollingWindowEndYMD(startYmd, rows.length);
            var updates = {};
            var base = "users/" + uid + "/goals/" + goalId + "/";
            updates[base + "rollingWindowEndYMD"] = endYmd;
            updates[base + "lastReplanYMD"] = today;
            updates[base + "maxGeneratedPlanDay"] = endDay;
            return db.ref().update(updates).then(function () {
              return Promise.all([
                global.AppData.loadAllTasks(uid),
                global.AppData.loadLeaves(uid),
                global.AppData.loadGoals(uid),
              ]).then(function (r) {
                return global.AppData.recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
              }).then(function () {
                return daily;
              });
            });
          });
        });
      });
    });
  }

  function maybePrefetchNextWindow(uid, goalId, hooks) {
    hooks = hooks || {};
    if (!goalId) return Promise.resolve(null);
    return global.AppData.loadGoals(uid).then(function (goals) {
      var g = goals[goalId];
      if (!isOutlineWindowGoal(g)) return null;
      return global.AppData.loadAllTasks(uid).then(function (tree) {
        var anchor = getGoalAnchorYMD(g, tree, goalId);
        var maxGen = getMaxGeneratedPlanDay(tree, goalId, anchor);
        var todayPlan = getTodayPlanDayNumber(g);
        var totalD = Math.max(1, Math.round(Number(g.totalDays) || 1));
        if (maxGen >= totalD) return null;
        if (maxGen - todayPlan > 2) return null;
        if (typeof hooks.onStart === "function") hooks.onStart();
        return generateNextWindow(uid, goalId)
          .then(function (daily) {
            if (typeof hooks.onDone === "function") hooks.onDone(daily);
            return daily;
          })
          .catch(function (err) {
            if (typeof hooks.onFail === "function") hooks.onFail(err);
            throw err;
          });
      });
    });
  }

  function saveOutlineWindowGoalToFirebase(user, form, outline, firstWindow) {
    var { db } = initFirebase();
    var uid = user.uid;
    var goalId = db.ref().push().key;
    var today = global.AppData.todayYMD();
    var phaseDays = Math.max(30, Math.min(60, Math.round(Number(outline.phaseDays) || 37)));
    var totalDays = Math.max(1, Math.round(Number(form.totalDays) || 1));
    var totalPhases = Math.max(1, Math.ceil(totalDays / phaseDays));
    var dailyTasks = firstWindow && Array.isArray(firstWindow.dailyTasks) ? firstWindow.dailyTasks : [];
    if (dailyTasks.length !== 7) {
      return Promise.reject(new Error("首窗需恰好 7 天任务"));
    }
    var rows = dailyTasks.map(function (dt, i) {
      var expected = i + 1;
      return {
        task: dt.task || "学习",
        duration: dt.duration || "25分钟",
        type: dt.type || "学习",
        planDay: dt.day != null ? Math.round(Number(dt.day)) : expected,
        priority: dt.priority,
        tips: dt.tips,
        reviewOf: dt.reviewOf,
      };
    });
    for (var ri = 0; ri < rows.length; ri++) {
      if (rows[ri].planDay !== ri + 1) {
        rows[ri].planDay = ri + 1;
      }
    }
    var endYmd = rollingWindowEndYMD(today, rows.length);
    var planBlob = {
      summary: outline.summary || "",
      weeklyRhythm: outline.weeklyRhythm || "",
      milestones: Array.isArray(outline.milestones) ? outline.milestones : [],
      longTermOutline: outline.summary || "",
      phaseName: outline.phaseName,
      phaseGoal: outline.phaseGoal,
      phaseDays: phaseDays,
    };
    var goalPayload = {
      name: form.name,
      type: form.type,
      goalType: form.goalType || form.typeKey || "other",
      deadline: form.deadline,
      timeMode: form.timeMode || "uniform",
      dailyHours: form.dailyHours,
      weeklyHours: form.weeklyHours || null,
      level: form.level || "beginner",
      flexibility: form.flexibility || "flexible",
      levelText: form.levelText || "",
      plan: planBlob,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      progress: 0,
      totalPlannedTasks: rows.length,
      overLeave: false,
      planningMode: "rolling",
      rollingVariant: "outline_7d",
      horizonDays: 7,
      difficultyLevel: 2,
      rollingAnchorYMD: today,
      rollingWindowEndYMD: endYmd,
      lastReplanYMD: today,
      nextReplanYMD: null,
      planWeekIndex: 1,
      totalDays: totalDays,
      totalPhases: totalPhases,
      outlinePhaseDays: phaseDays,
      currentPhase: 1,
      phaseName: outline.phaseName || "首阶段",
      phaseGoal: outline.phaseGoal || "",
      summary: outline.summary || "",
      encouragement: outline.encouragement || "",
      risks: Array.isArray(outline.risks) ? outline.risks : [],
      milestones: Array.isArray(outline.milestones) ? outline.milestones : [],
      maxGeneratedPlanDay: 7,
      phases: [
        {
          phaseNum: 1,
          name: outline.phaseName || "第一阶段",
          startDay: 1,
          endDay: Math.min(phaseDays, totalDays),
          goal: outline.phaseGoal || "",
          generatedAt: firebase.database.ServerValue.TIMESTAMP,
          completionRate: null,
          adjustments: null,
        },
      ],
    };

    var updates = {};
    updates["users/" + uid + "/goals/" + goalId] = goalPayload;
    for (var i = 0; i < rows.length; i++) {
      var d = global.AppData.dateFromYMD(today);
      d.setDate(d.getDate() + i);
      var dateStr = global.AppData.formatYMD(d);
      var taskId = db.ref().push().key;
      var item = rows[i];
      updates["users/" + uid + "/tasks/" + dateStr + "/" + taskId] = {
        goalId: goalId,
        goalName: form.name,
        task: item.task,
        duration: item.duration,
        type: item.type,
        planDay: item.planDay,
        completed: false,
        completedAt: null,
      };
      if (item.priority) updates["users/" + uid + "/tasks/" + dateStr + "/" + taskId].priority = item.priority;
      if (item.tips) updates["users/" + uid + "/tasks/" + dateStr + "/" + taskId].tips = item.tips;
      if (item.reviewOf != null && item.reviewOf !== "") {
        updates["users/" + uid + "/tasks/" + dateStr + "/" + taskId].reviewOf = item.reviewOf;
      }
    }

    return db.ref().update(updates).then(function () {
      return Promise.all([
        global.AppData.loadAllTasks(uid),
        global.AppData.loadLeaves(uid),
        global.AppData.loadGoals(uid),
      ]).then(function (r) {
        return global.AppData.recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
      });
    });
  }

  function replanAllowed(g, allTasks, goalId) {
    if (!isRollingGoal(g)) return { allowed: false, reason: "" };
    if (isOutlineWindowGoal(g)) {
      return { allowed: false, reason: "outline_window" };
    }
    var today = global.AppData.todayYMD();
    var prog = global.AppData.goalProgressFromTasks(allTasks, goalId);
    if (prog.total > 0 && prog.done >= prog.total) {
      return { allowed: false, reason: "completed" };
    }
    var du =
      g.deadline &&
      (function () {
        var p = String(g.deadline).split("-").map(Number);
        if (p.length < 3) return null;
        var dl = new Date(p[0], p[1] - 1, p[2]);
        var t = new Date();
        t.setHours(0, 0, 0, 0);
        dl.setHours(0, 0, 0, 0);
        return Math.ceil((dl.getTime() - t.getTime()) / 86400000);
      })();
    if (du != null && du < 0) {
      return { allowed: false, reason: "expired" };
    }
    var pastWindow = g.rollingWindowEndYMD && today > g.rollingWindowEndYMD;
    var dueWeek = g.nextReplanYMD && today >= g.nextReplanYMD;
    if (!dueWeek && !pastWindow) {
      return { allowed: false, reason: "wait", next: g.nextReplanYMD || "" };
    }
    return { allowed: true, reason: pastWindow ? "pastWindow" : "dueWeek" };
  }

  function runWeeklyReplan(uid, goalId) {
    var gsnap = null;
    var tree = null;
    return global.AppData.loadGoals(uid)
      .then(function (goals) {
        gsnap = goals[goalId];
        if (!gsnap) throw new Error("目标不存在");
        if (!isRollingGoal(gsnap)) throw new Error("该目标不是滚动规划模式");
        if (isOutlineWindowGoal(gsnap)) throw new Error("大纲滚动模式会自动续窗，无需周重排");
        return global.AppData.loadAllTasks(uid);
      })
      .then(function (t) {
        tree = t;
        var chk = replanAllowed(gsnap, tree, goalId);
        if (!chk.allowed) {
          if (chk.reason === "wait") {
            throw new Error("尚未到周重排日（" + (chk.next || "") + " 起可刷新）");
          }
          if (chk.reason === "completed") throw new Error("目标已完成，无需重排");
          if (chk.reason === "expired") throw new Error("目标已过期");
          throw new Error("当前无法重排");
        }

        var today = global.AppData.todayYMD();
        var lastRep = gsnap.lastReplanYMD || gsnap.rollingAnchorYMD || today;
        var yest = addDaysYMD(today, -1);
        var stats;
        if (lastRep > yest) {
          stats = { total: 0, done: 0, rate: 0.65 };
        } else {
          var statsStart = lastRep < yest ? lastRep : addDaysYMD(today, -7);
          stats = collectGoalStatsInRange(tree, goalId, statsStart, yest);
          if (stats.total === 0) {
            stats.rate = 0.65;
          }
        }
        var newDiff = nextDifficultyFromRate(stats.rate, gsnap.difficultyLevel);
        var H = Math.max(7, Math.min(14, Math.round(Number(gsnap.horizonDays) || 10)));
        var startYmd = computeNextWindowStartYMD(tree, goalId, today);
        var prompt = buildReplanPrompt(gsnap, stats, startYmd, H, newDiff);
        return callReplanPlan(prompt).then(function (plan) {
          var rows = buildDailyTasksFromPlan(plan, H);
          return global.AppData.appendTaskDaysForGoal(uid, goalId, gsnap.name, startYmd, rows).then(function () {
            var endYmd = rollingWindowEndYMD(startYmd, rows.length);
            var weekIdx = Math.max(1, Math.round(Number(gsnap.planWeekIndex) || 1)) + 1;
            var diffOut =
              plan.difficultySuggested != null
                ? Math.max(1, Math.min(3, Math.round(Number(plan.difficultySuggested))))
                : newDiff;
            var { db } = initFirebase();
            var updates = {};
            var base = "users/" + uid + "/goals/" + goalId + "/";
            updates[base + "plan"] = plan;
            updates[base + "rollingWindowEndYMD"] = endYmd;
            updates[base + "lastReplanYMD"] = today;
            updates[base + "nextReplanYMD"] = addDaysYMD(today, 7);
            updates[base + "planWeekIndex"] = weekIdx;
            updates[base + "difficultyLevel"] = diffOut;
            return db.ref().update(updates).then(function () {
              return Promise.all([
                global.AppData.loadAllTasks(uid),
                global.AppData.loadLeaves(uid),
                global.AppData.loadGoals(uid),
              ]).then(function (r) {
                return global.AppData.recalcOverLeaveFlags(uid, r[0], r[1], r[2]);
              }).then(function () {
                return global.AppData.recalcAfterComplete(uid, goalId);
              });
            });
          });
        });
      });
  }

  function checkPhaseCompletion(uid, goalId, dateStr) {
    return Promise.all([global.AppData.loadGoals(uid), global.AppData.loadAllTasks(uid)]).then(function (res) {
      var goals = res[0] || {};
      var tasksTree = res[1] || {};
      var goal = goals[goalId];
      if (!goal || !isRollingGoal(goal)) return null;
      if (isOutlineWindowGoal(goal)) return null;
      if ((goal.totalPhases || 1) <= 1) return null;
      if ((goal.currentPhase || 1) >= (goal.totalPhases || 1)) return null;
      if (goal.lastPhasePrompted && Number(goal.lastPhasePrompted) >= Number(goal.currentPhase || 1)) return null;

      var p = getCurrentPhaseInfo(goal);
      var anchor = getGoalAnchorYMD(goal, tasksTree, goalId);
      var phaseEndYmd = addDaysYMD(anchor, p.endDay - 1);
      if (dateStr && phaseEndYmd !== dateStr) return null;
      var lastDay = (tasksTree && tasksTree[phaseEndYmd]) || {};
      var ids = Object.keys(lastDay).filter(function (tid) {
        var t = lastDay[tid];
        return t && t.goalId === goalId;
      });
      if (!ids.length) return null;
      var allDone = ids.every(function (tid) {
        return !!lastDay[tid].completed;
      });
      if (!allDone) return null;

      var phaseStartYmd = addDaysYMD(anchor, p.startDay - 1);
      var rate = calcPhaseCompletionRate(tasksTree, goalId, phaseStartYmd, phaseEndYmd);
      return {
        goalId: goalId,
        goal: goal,
        completionRate: rate,
        phaseNum: p.phaseNum,
        phaseName:
          (goal.phases &&
            goal.phases[p.phaseNum - 1] &&
            goal.phases[p.phaseNum - 1].name) ||
          "第" + p.phaseNum + "阶段",
        totalDays: goal.totalDays || p.endDay,
        daysCompleted: p.endDay,
        nextPhaseNum: p.phaseNum + 1,
      };
    });
  }

  function phaseAdjustmentText(completionRate) {
    if (completionRate >= 90) {
      return "上阶段表现优秀，本阶段可适度提升难度，引入挑战任务，但避免过度内卷";
    }
    if (completionRate >= 70) {
      return "上阶段完成度良好，本阶段保持当前节奏稳步推进";
    }
    if (completionRate >= 50) {
      return "上阶段完成度中等，本阶段需降低 20% 任务量，保留核心内容";
    }
    return "上阶段完成度偏低，本阶段必须降低 30-40% 任务量，前 3 天安排热身复习找回状态，重建信心";
  }

  function generateNextPhase(uid, goalId, mode, customNotes) {
    var explicitPhaseNum =
      arguments.length > 4 && arguments[4] != null ? Math.round(Number(arguments[4])) : null;
    return Promise.all([global.AppData.loadGoals(uid), global.AppData.loadAllTasks(uid)]).then(function (res) {
      var goals = res[0] || {};
      var tasksTree = res[1] || {};
      var goal = goals[goalId];
      if (!goal || !isRollingGoal(goal)) throw new Error("目标不存在或不是滚动目标");
      if (isOutlineWindowGoal(goal)) throw new Error("大纲滚动模式通过打卡自动续窗，无需在此生成整阶段");
      var today = global.AppData.todayYMD();
      if (goal.deadline && goal.deadline < today) throw new Error("目标已过截止日，无法生成下一阶段");
      var progress = global.AppData.goalProgressFromTasks(tasksTree, goalId);
      if (progress.total > 0 && progress.done >= progress.total) throw new Error("目标任务已全部完成，无需生成新阶段");
      var p = getCurrentPhaseInfo(goal);
      var nextPhaseNum = explicitPhaseNum || p.phaseNum + 1;
      if (!explicitPhaseNum && p.phaseNum >= p.totalPhases) throw new Error("已是最后阶段");
      if (nextPhaseNum < 1 || nextPhaseNum > p.totalPhases) throw new Error("阶段编号越界");

      var anchor = getGoalAnchorYMD(goal, tasksTree, goalId);
      var nextStartDay = (nextPhaseNum - 1) * p.daysPerPhase + 1;
      var nextEndDay = Math.min(nextPhaseNum * p.daysPerPhase, goal.totalDays || nextStartDay);
      var nextPhaseDays = Math.max(1, nextEndDay - nextStartDay + 1);
      var nextStartYmd = addDaysYMD(anchor, nextStartDay - 1);
      var prevPhaseNum = nextPhaseNum - 1;
      var completionRate = 100;
      if (prevPhaseNum >= 1) {
        var prevStartYmd = addDaysYMD(anchor, (prevPhaseNum - 1) * p.daysPerPhase);
        var prevEndYmd = addDaysYMD(anchor, Math.min(prevPhaseNum * p.daysPerPhase, goal.totalDays || 1) - 1);
        completionRate = calcPhaseCompletionRate(tasksTree, goalId, prevStartYmd, prevEndYmd);
      }
      var newDiff = nextDifficultyFromRate((completionRate || 0) / 100, goal.difficultyLevel);
      var note =
        "当前是第 " +
        nextPhaseNum +
        " 阶段（共 " +
        p.totalPhases +
        " 阶段）。" +
        (prevPhaseNum >= 1
          ? "上一阶段「" +
            (((goal.phases || [])[prevPhaseNum - 1] || {}).name || ("第" + prevPhaseNum + "阶段")) +
            "」完成率：" +
            completionRate +
            "%。" +
            phaseAdjustmentText(completionRate)
          : "这是首阶段重生成，请保持启动节奏清晰，先建立稳定习惯。") +
        (customNotes ? " 用户额外要求：" + customNotes : "");
      var stats = { total: 0, done: 0, rate: (completionRate || 0) / 100 };
      var prompt = buildReplanPrompt(goal, stats, nextStartYmd, nextPhaseDays, newDiff) + "\n\n" + note;
      return callReplanPlan(prompt).then(function (plan) {
        var rows = buildDailyTasksFromPlan(plan, nextPhaseDays);
        return global.AppData.appendTaskDaysForGoal(uid, goalId, goal.name, nextStartYmd, rows).then(function () {
          var { db } = initFirebase();
          var updates = {};
          var base = "users/" + uid + "/goals/" + goalId + "/";
          var phases = Array.isArray(goal.phases) ? goal.phases.slice() : [];
          if (nextPhaseNum <= phases.length) {
            phases = phases.slice(0, nextPhaseNum - 1);
          }
          if (prevPhaseNum >= 1 && !phases[prevPhaseNum - 1]) {
            phases[prevPhaseNum - 1] = {
              phaseNum: prevPhaseNum,
              name: "第" + prevPhaseNum + "阶段",
              startDay: (prevPhaseNum - 1) * p.daysPerPhase + 1,
              endDay: Math.min(prevPhaseNum * p.daysPerPhase, goal.totalDays || prevPhaseNum * p.daysPerPhase),
              goal: "",
              generatedAt: firebase.database.ServerValue.TIMESTAMP,
              completionRate: null,
              adjustments: null,
            };
          }
          if (prevPhaseNum >= 1) {
            phases[prevPhaseNum - 1].completionRate = completionRate;
            phases[prevPhaseNum - 1].adjustments = phaseAdjustmentText(completionRate);
          }
          phases.push({
            phaseNum: nextPhaseNum,
            name: plan.phaseName || ("第" + nextPhaseNum + "阶段"),
            startDay: nextStartDay,
            endDay: nextEndDay,
            goal: plan.phaseGoal || "",
            generatedAt: firebase.database.ServerValue.TIMESTAMP,
            completionRate: null,
            adjustments: customNotes || null,
          });
          updates[base + "currentPhase"] = nextPhaseNum;
          updates[base + "phases"] = phases;
          updates[base + "encouragement"] = plan.encouragement || goal.encouragement || "";
          updates[base + "risks"] = Array.isArray(plan.risks) ? plan.risks : goal.risks || [];
          updates[base + "milestones"] = Array.isArray(plan.milestones) ? plan.milestones : goal.milestones || [];
          updates[base + "lastPhasePrompted"] = Math.max(0, prevPhaseNum);
          updates[base + "difficultyLevel"] =
            plan.difficultySuggested != null
              ? Math.max(1, Math.min(3, Math.round(Number(plan.difficultySuggested))))
              : newDiff;
          return db.ref().update(updates).then(function () {
            return global.AppData.recalcAfterComplete(uid, goalId);
          });
        });
      });
    });
  }

  function regeneratePhase(uid, goalId, phaseNum, customNotes) {
    return Promise.all([global.AppData.loadGoals(uid), global.AppData.loadAllTasks(uid)]).then(function (res) {
      var goals = res[0] || {};
      var tasksTree = res[1] || {};
      var goal = goals[goalId];
      if (!goal || !isRollingGoal(goal)) throw new Error("目标不存在或不是滚动目标");
      if (isOutlineWindowGoal(goal)) throw new Error("大纲滚动模式不支持整阶段重生成");
      var p = getCurrentPhaseInfo(goal);
      var targetPhase = Math.max(1, Math.min(p.totalPhases, Math.round(Number(phaseNum) || p.phaseNum)));
      if (targetPhase > p.totalPhases) throw new Error("阶段编号越界");
      var phaseStartDay = (targetPhase - 1) * p.daysPerPhase + 1;
      var anchor = getGoalAnchorYMD(goal, tasksTree, goalId);
      var startYmd = addDaysYMD(anchor, phaseStartDay - 1);
      var updates = {};
      Object.keys(tasksTree).forEach(function (ds) {
        if (ds < startYmd) return;
        var day = tasksTree[ds];
        if (!day || typeof day !== "object") return;
        Object.keys(day).forEach(function (tid) {
          var t = day[tid];
          if (t && t.goalId === goalId) {
            updates["users/" + uid + "/tasks/" + ds + "/" + tid] = null;
          }
        });
      });
      return initFirebase().db
        .ref()
        .update(updates)
        .then(function () {
          return generateNextPhase(uid, goalId, "regenerate", customNotes || "重新生成当前阶段", targetPhase);
        });
    });
  }

  function regenerateCurrentPhase(uid, goalId, customNotes) {
    return regeneratePhase(uid, goalId, null, customNotes);
  }

  global.RollingPlan = {
    DEEPSEEK_MODEL: DEEPSEEK_MODEL,
    buildInitialRollingPrompt: buildInitialRollingPrompt,
    buildDailyTasksFromPlan: buildDailyTasksFromPlan,
    callInitialPlan: callInitialPlan,
    callDeepSeekJSON: callDeepSeekJSON,
    saveRollingGoalToFirebase: saveRollingGoalToFirebase,
    saveOutlineWindowGoalToFirebase: saveOutlineWindowGoalToFirebase,
    isRollingGoal: isRollingGoal,
    isOutlineWindowGoal: isOutlineWindowGoal,
    generateNextWindow: generateNextWindow,
    maybePrefetchNextWindow: maybePrefetchNextWindow,
    getTodayPlanDayNumber: getTodayPlanDayNumber,
    getMaxGeneratedPlanDay: getMaxGeneratedPlanDay,
    replanAllowed: replanAllowed,
    runWeeklyReplan: runWeeklyReplan,
    addDaysYMD: addDaysYMD,
    nextDifficultyFromRate: nextDifficultyFromRate,
    calculatePhases: calculatePhases,
    getCurrentPhaseInfo: getCurrentPhaseInfo,
    checkPhaseCompletion: checkPhaseCompletion,
    generateNextPhase: generateNextPhase,
    regeneratePhase: regeneratePhase,
    regenerateCurrentPhase: regenerateCurrentPhase,
  };
})(typeof window !== "undefined" ? window : this);
