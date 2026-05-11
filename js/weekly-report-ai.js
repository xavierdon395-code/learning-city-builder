/**
 * AI 周复盘：组 prompt、调用 DeepSeek（RollingPlan）、校验后交由 AppData 落库
 */
const WeeklyReportAI = (function () {
  "use strict";

  function buildSystemPrompt() {
    return (
      "你是学习数据分析师兼温和教练。用户会给你一整段 JSON（字符串），即本周学习统计快照，请先理解再输出复盘。\n" +
      "输出必须是单个可 JSON.parse 的对象，键名与下述 schema 完全一致，不要 markdown、不要代码块、不要注释。\n" +
      "字段说明：\n" +
      "- headline: 一句总评（中文，30 字以内）\n" +
      "- highlights: 2–4 条亮点（每条中文，不超过 40 字）\n" +
      "- watchouts: 1–3 条需注意或改进点（中文，每条不超过 45 字）\n" +
      "- next_week_focus: 恰好 3 条下周可执行重点（中文，每条不超过 45 字）\n" +
      "- tone_note: 一句鼓励/小结（中文，50 字以内，避免说教）\n" +
      "说明：统计里的 streak_days 表示「本周内有完成任务的天数」，不是历史最长连击。"
    );
  }

  function buildUserPrompt(stats) {
    return (
      "以下为本周统计 JSON（整段解析即可）：\n" +
      JSON.stringify(stats) +
      "\n\n请严格输出包含 headline、highlights、watchouts、next_week_focus、tone_note 的 JSON 对象。"
    );
  }

  /** 是否已配置 DeepSeek（与 rolling-plan.js 读取方式一致） */
  function hasDeepSeekApiKey() {
    var k = window.SECRETS && window.SECRETS.DEEPSEEK_API_KEY;
    return !!(k && String(k).trim() && String(k).indexOf("在这里填") < 0);
  }

  function validateAi(obj) {
    if (!obj || typeof obj !== "object") {
      throw new Error("AI 返回格式异常");
    }
    if (typeof obj.headline !== "string" || !obj.headline.trim()) {
      throw new Error("AI 返回缺少 headline");
    }
    if (!Array.isArray(obj.highlights)) {
      throw new Error("AI 返回缺少 highlights 数组");
    }
    if (!Array.isArray(obj.watchouts)) {
      throw new Error("AI 返回缺少 watchouts 数组");
    }
    if (!Array.isArray(obj.next_week_focus)) {
      throw new Error("AI 返回缺少 next_week_focus 数组");
    }
    if (typeof obj.tone_note !== "string" || !obj.tone_note.trim()) {
      throw new Error("AI 返回缺少 tone_note");
    }
    var hl = obj.highlights.length;
    if (hl < 2 || hl > 4) {
      throw new Error("highlights 数量须为 2–4 条，当前 " + hl);
    }
    var wo = obj.watchouts.length;
    if (wo < 1 || wo > 3) {
      throw new Error("watchouts 数量须为 1–3 条，当前 " + wo);
    }
    if (obj.next_week_focus.length !== 3) {
      throw new Error("next_week_focus 须恰好 3 条，当前 " + obj.next_week_focus.length);
    }
    return {
      headline: String(obj.headline).trim(),
      highlights: obj.highlights.map(function (x) {
        return String(x || "").trim();
      }),
      watchouts: obj.watchouts.map(function (x) {
        return String(x || "").trim();
      }),
      next_week_focus: obj.next_week_focus.map(function (x) {
        return String(x || "").trim();
      }),
      tone_note: String(obj.tone_note).trim(),
    };
  }

  /**
   * @param {string} uid
   * @param {{ force?: boolean }} options - force 为 true 时忽略缓存重新请求 AI
   * @returns {Promise<{ cached?: boolean, doc: object }>}
   */
  function generate(uid, options) {
    options = options || {};
    var force = !!options.force;
    if (!uid) {
      return Promise.reject(new Error("uid 不能为空"));
    }
    if (typeof WeeklyReportData === "undefined") {
      return Promise.reject(new Error("WeeklyReportData 未加载"));
    }
    if (typeof RollingPlan === "undefined" || typeof RollingPlan.callDeepSeekJSON !== "function") {
      return Promise.reject(new Error("RollingPlan.callDeepSeekJSON 不可用，请检查 rolling-plan.js 与脚本顺序"));
    }
    if (typeof AppData === "undefined" || typeof AppData.saveWeeklyReport !== "function") {
      return Promise.reject(new Error("AppData.saveWeeklyReport 不可用"));
    }

    return WeeklyReportData.collectWeekStats(uid).then(function (stats) {
      var weekId = stats.week_id;
      if (!force) {
        return AppData.loadWeeklyReport(uid, weekId).then(function (existing) {
          if (existing) {
            try {
              validateAi(existing.ai);
              return { cached: true, doc: existing };
            } catch (cacheErr) {
              console.warn("[WeeklyReportAI] 本周缓存无效或损坏，将重新请求模型", cacheErr);
            }
          }
          return runModelAndSave(uid, stats);
        });
      }
      return runModelAndSave(uid, stats);
    });
  }

  function runModelAndSave(uid, stats) {
    if (!hasDeepSeekApiKey()) {
      return Promise.reject(
        new Error(
          "未配置 DeepSeek 密钥：请将 js/secrets.example.js 复制为 js/secrets.local.js，填入 DEEPSEEK_API_KEY 后强制刷新页面（Cmd+Shift+R）。"
        )
      );
    }
    var sys = buildSystemPrompt();
    var user = buildUserPrompt(stats);
    return RollingPlan.callDeepSeekJSON(sys, user, 2048)
      .then(function (raw) {
        try {
          var ai = validateAi(raw);
          var weekId = stats.week_id;
          var payload = {
            week_id: stats.week_id,
            week_start: stats.week_start,
            week_end: stats.week_end,
            stats_snapshot: stats,
            ai: ai,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
          };
          return AppData.saveWeeklyReport(uid, weekId, payload).then(function () {
            return { cached: false, doc: payload };
          });
        } catch (ve) {
          var vm = ve && ve.message ? ve.message : "AI 输出校验失败";
          return Promise.reject(new Error(vm + " 可点击「重新生成」重试。"));
        }
      })
      .catch(function (e) {
        if (e && e.message && e.message.indexOf("未配置 DeepSeek") === 0) {
          return Promise.reject(e);
        }
        var m = e && e.message ? e.message : "请求失败";
        if (m.indexOf("重新生成") >= 0) {
          return Promise.reject(e);
        }
        return Promise.reject(new Error(m + " 可稍后再试或点击「重新生成」。"));
      });
  }

  return {
    generate: generate,
    buildSystemPrompt: buildSystemPrompt,
    buildUserPrompt: buildUserPrompt,
    validateAi: validateAi,
    hasDeepSeekApiKey: hasDeepSeekApiKey,
  };
})();

if (typeof window !== "undefined") {
  window.WeeklyReportAI = WeeklyReportAI;
}
