/**
 * AI 周复盘 - 弹窗与历史列表 UI 模块
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    if (typeof s !== "string") return "";
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderSection(title, items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return (
      '<div class="wr-modal__section">' +
      '<p class="wr-modal__section-title">' +
      escapeHtml(title) +
      "</p>" +
      '<ul class="wr-modal__list">' +
      items
        .map(function (t) {
          return "<li>" + escapeHtml(String(t || "")) + "</li>";
        })
        .join("") +
      "</ul>" +
      "</div>"
    );
  }

  /**
   * 弹出复盘详情
   * @param {object} report 完整复盘对象
   */
  function show(report) {
    if (!report || !report.ai) return;
    var ai = report.ai || {};
    var weekRange = [report.week_start || "—", report.week_end || "—"].join(" 至 ");

    var modal = document.createElement("div");
    modal.className = "wr-modal";
    modal.innerHTML =
      '<div class="wr-modal__panel">' +
      '<div class="wr-modal__brand">LUMI · WEEKLY REVIEW</div>' +
      '<h1 class="wr-modal__title">本周复盘</h1>' +
      '<p class="wr-modal__week">' +
      escapeHtml(weekRange) +
      "</p>" +
      '<p class="wr-modal__headline">' +
      escapeHtml(ai.headline || "继续保持节奏，稳步推进。") +
      "</p>" +
      renderSection("本周亮点", ai.highlights) +
      renderSection("需要注意", ai.watchouts) +
      renderSection("下周聚焦", ai.next_week_focus) +
      (ai.tone_note ? '<p class="wr-modal__tone-note">' + escapeHtml(ai.tone_note) + "</p>" : "") +
      '<button type="button" class="wr-modal__close">关闭</button>' +
      "</div>";

    var escHandler = null;
    function closeModal() {
      if (escHandler) {
        document.removeEventListener("keydown", escHandler);
      }
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
    var closeBtn = modal.querySelector(".wr-modal__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }
    escHandler = function (e) {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", escHandler);

    document.body.appendChild(modal);
  }

  function todayLocalKey() {
    if (global.AppData && typeof global.AppData.formatYMD === "function") {
      return global.AppData.formatYMD(new Date());
    }
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /**
   * 周一首次打开自动弹窗（当天仅一次）
   */
  function autoShowOnMonday() {
    var auth = global.firebase && global.firebase.auth ? global.firebase.auth() : null;
    var user = auth && auth.currentUser;
    if (!user) return Promise.resolve();

    var today = new Date();
    if (today.getDay() !== 1) return Promise.resolve();

    var shownKey = "wr_shown_" + todayLocalKey();
    if (global.localStorage && localStorage.getItem(shownKey)) return Promise.resolve();

    if (!global.WeeklyReportAI || typeof global.WeeklyReportAI.generate !== "function") {
      return Promise.resolve();
    }

    return global.WeeklyReportAI.generate(user.uid, { force: false })
      .then(function (res) {
        if (res && res.doc) {
          show(res.doc);
          if (global.localStorage) {
            localStorage.setItem(shownKey, "1");
          }
        }
      })
      .catch(function (err) {
        console.warn("[WeeklyReportModal] 周一自动弹窗失败，已跳过", err);
      });
  }

  function renderHistoryCard(report) {
    var ai = report.ai || {};
    var stats = report.stats_snapshot || {};
    var completed = Number(stats.tasks_completed || 0);
    var rate = Math.round(Number(stats.completion_rate || 0) * 100);
    var streak = Number(stats.streak_days || 0);
    var weekText = (report.week_start || "—") + " ~ " + (report.week_end || "—");
    return (
      '<div class="wr-history__card" data-week-id="' +
      escapeHtml(String(report.week_id || "")) +
      '">' +
      '<p class="wr-history__card-week">' +
      escapeHtml(weekText) +
      "</p>" +
      '<p class="wr-history__card-headline">' +
      escapeHtml(ai.headline || "本周复盘") +
      "</p>" +
      '<div class="wr-history__card-stats">' +
      "<span><strong>" +
      completed +
      "</strong>任务</span>" +
      "<span><strong>" +
      rate +
      "%</strong>完成</span>" +
      "<span><strong>" +
      streak +
      "</strong>天打卡</span>" +
      "</div>" +
      "</div>"
    );
  }

  /**
   * 渲染统计页历史复盘列表
   * @param {string} containerId 容器 id
   */
  function renderHistory(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return Promise.resolve();

    var auth = global.firebase && global.firebase.auth ? global.firebase.auth() : null;
    var user = auth && auth.currentUser;
    if (!user) {
      container.innerHTML = "";
      return Promise.resolve();
    }
    if (!global.AppData || typeof global.AppData.loadAllWeeklyReports !== "function") {
      container.innerHTML = "";
      return Promise.resolve();
    }

    return global.AppData.loadAllWeeklyReports(user.uid)
      .then(function (reports) {
        var thisWeekId = "";
        if (global.WeeklyReportData && typeof global.WeeklyReportData.getWeekRange === "function") {
          thisWeekId = global.WeeklyReportData.getWeekRange(new Date()).weekId || "";
        }
        var history = (reports || []).filter(function (r) {
          return r && r.week_id && r.week_id !== thisWeekId;
        });

        if (history.length === 0) {
          container.innerHTML =
            '<p class="wr-history__title">历史复盘</p>' +
            '<div class="wr-history__empty">还没有历史复盘记录</div>';
          return;
        }

        container.innerHTML =
          '<p class="wr-history__title">历史复盘 · 共 ' +
          history.length +
          " 周</p>" +
          history.map(renderHistoryCard).join("");

        var cards = container.querySelectorAll(".wr-history__card");
        cards.forEach(function (card) {
          card.addEventListener("click", function () {
            var weekId = card.getAttribute("data-week-id");
            var report = history.find(function (row) {
              return row.week_id === weekId;
            });
            if (report) show(report);
          });
        });
      })
      .catch(function (err) {
        console.error("[WeeklyReportModal] 加载历史复盘失败", err);
        container.innerHTML = "";
      });
  }

  global.WeeklyReportModal = {
    show: show,
    autoShowOnMonday: autoShowOnMonday,
    renderHistory: renderHistory,
  };
})(typeof window !== "undefined" ? window : this);
