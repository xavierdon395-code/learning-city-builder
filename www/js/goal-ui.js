(function (global) {
  "use strict";

  function daysUntilDeadline(iso) {
    if (!iso) return null;
    var parts = String(iso).split("-");
    if (parts.length < 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - t.getTime()) / 86400000);
  }

  function goalIconClass(type) {
    var s = String(type || "");
    if (/语言/.test(s)) return "goal-ico goal-ico--lang";
    if (/编程/.test(s)) return "goal-ico goal-ico--code";
    if (/考试/.test(s)) return "goal-ico goal-ico--exam";
    if (/技能/.test(s)) return "goal-ico goal-ico--skill";
    return "goal-ico goal-ico--other";
  }

  function renderPixelBar(container, pct, segments) {
    if (!container) return;
    container.innerHTML = "";
    var n = segments || 14;
    var filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * n);
    for (var i = 0; i < n; i++) {
      var c = document.createElement("span");
      c.className = "pixel-progress__cell" + (i < filled ? " is-on" : "");
      container.appendChild(c);
    }
  }

  function appendGoalCard(listEl, row, allTasks, hooks) {
    hooks = hooks || {};
    var g = row.g;
    var prog = AppData.goalProgressFromTasks(allTasks, row.id);
    var pctG = typeof g.progress === "number" ? g.progress : prog.pct;
    var days = daysUntilDeadline(g.deadline);
    var urgent = days != null && days <= 3 && days >= 0;
    var incomplete = prog.total > 0 && prog.done < prog.total;

    var card = document.createElement("div");
    card.className = "goal-card goal-card--cosmos";

    if (g.overLeave) {
      var warn = document.createElement("div");
      warn.className = "goal-card__overleave";
      warn.textContent = "⚠️ 请假超限，完成后将不计入成就";
      card.appendChild(warn);
    }

    var rowWrap = document.createElement("div");
    rowWrap.className = "goal-card__row";
    rowWrap.innerHTML =
      '<div class="' +
      goalIconClass(g.type) +
      '" aria-hidden="true"></div>' +
      '<div class="goal-card__main">' +
      '<div class="goal-card__name"></div>' +
      '<div class="goal-card__meta"></div>' +
      '<div class="pixel-progress pixel-progress--goal" data-pct="' +
      pctG +
      '"></div>' +
      "</div>" +
      '<div class="goal-card__aside"></div>';

    rowWrap.querySelector(".goal-card__name").textContent = g.name || "未命名目标";
    rowWrap.querySelector(".goal-card__meta").textContent =
      (g.type || "—") + " · 截止 " + (g.deadline || "—") + " · 进度 " + pctG + "%";

    var aside = rowWrap.querySelector(".goal-card__aside");
    if (days == null) {
      aside.textContent = "";
      aside.style.display = "none";
    } else if (days < 0) {
      aside.style.display = "";
      aside.textContent = "已过期";
      aside.className = "goal-card__aside goal-card__aside--urgent";
    } else {
      aside.style.display = "";
      aside.textContent = "剩余 " + days + " 天";
      aside.className = "goal-card__aside" + (urgent ? " goal-card__aside--urgent" : "");
    }

    if (hooks.onDeleteRequest) {
      var del = document.createElement("button");
      del.type = "button";
      del.className = "goal-card__delete";
      del.setAttribute("aria-label", "删除目标");
      del.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
        '<line x1="10" y1="11" x2="10" y2="17"/>' +
        '<line x1="14" y1="11" x2="14" y2="17"/>' +
        "</svg>";
      del.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var ca = g.createdAt;
        if (typeof ca !== "number" || !isFinite(ca)) ca = Date.now();
        hooks.onDeleteRequest(row.id, g.name || "未命名目标", ca);
      });
      rowWrap.appendChild(del);
    }

    var barHost = rowWrap.querySelector(".pixel-progress");
    renderPixelBar(barHost, pctG, 14);

    card.appendChild(rowWrap);

    if (g && Number(g.totalPhases) > 1) {
      var cur = Math.max(1, Math.round(Number(g.currentPhase) || 1));
      var totalP = Math.max(1, Math.round(Number(g.totalPhases) || 1));
      var phaseName =
        (Array.isArray(g.phases) &&
          g.phases[cur - 1] &&
          g.phases[cur - 1].name) ||
        "第" + cur + "阶段";
      var ph = document.createElement("div");
      ph.className = "phase-progress";
      var info = document.createElement("div");
      info.className = "phase-info";
      info.textContent = "第 " + cur + " 阶段 / 共 " + totalP + " 阶段 · " + phaseName;
      ph.appendChild(info);
      var bar = document.createElement("div");
      bar.className = "phase-bar-container";
      for (var pi = 1; pi <= totalP; pi++) {
        var seg = document.createElement("span");
        seg.className = "phase-segment";
        if (pi < cur) seg.classList.add("is-done");
        else if (pi === cur) seg.classList.add("is-current");
        else seg.classList.add("is-future");
        bar.appendChild(seg);
      }
      ph.appendChild(bar);
      if (
        hooks.onRegeneratePhase &&
        global.RollingPlan &&
        RollingPlan.isRollingGoal(g) &&
        !(RollingPlan.isOutlineWindowGoal && RollingPlan.isOutlineWindowGoal(g))
      ) {
        var regBtn = document.createElement("button");
        regBtn.type = "button";
        regBtn.className = "btn btn--secondary btn--small phase-regen-btn";
        regBtn.textContent = "🔄 重新生成当前阶段";
        regBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          hooks.onRegeneratePhase(row.id, cur, g);
        });
        ph.appendChild(regBtn);
      }
      card.appendChild(ph);
    }

    if (global.RollingPlan && RollingPlan.isRollingGoal(g)) {
      var ra = RollingPlan.replanAllowed(g, allTasks, row.id);
      var isOutline = RollingPlan.isOutlineWindowGoal && RollingPlan.isOutlineWindowGoal(g);
      var roll = document.createElement("div");
      roll.className = "goal-card__rolling";
      var badge = document.createElement("span");
      badge.className = "goal-card__rolling-badge";
      badge.textContent = isOutline
        ? "大纲模式 · 7 天续窗（自动）"
        : "滚动 " + (g.horizonDays || "7–14") + " 天窗 · 难度 " + (g.difficultyLevel != null ? g.difficultyLevel : "—");
      roll.appendChild(badge);
      if (!isOutline && ra.allowed) {
        var hint = document.createElement("span");
        hint.className = "goal-card__rolling-hint goal-card__rolling-hint--due";
        hint.textContent = ra.reason === "pastWindow" ? "待续下一窗" : "可周重排";
        roll.appendChild(hint);
      } else if (!isOutline && ra.reason === "wait" && ra.next) {
        var hintW = document.createElement("span");
        hintW.className = "goal-card__rolling-hint";
        hintW.textContent = "下次重排 " + ra.next;
        roll.appendChild(hintW);
      } else if (isOutline) {
        var hintO = document.createElement("span");
        hintO.className = "goal-card__rolling-hint";
        hintO.textContent = "打卡时自动准备后续任务";
        roll.appendChild(hintO);
      }
      if (hooks.onRollingReplan && !isOutline && ra.reason !== "completed" && ra.reason !== "expired") {
        var rb = document.createElement("button");
        rb.type = "button";
        rb.className = "btn btn--secondary btn--small goal-card__rolling-btn";
        rb.textContent = "周计划重排";
        rb.disabled = !ra.allowed;
        rb.setAttribute(
          "aria-label",
          ra.allowed ? "根据上周完成情况生成下一窗任务" : "尚未到重排日"
        );
        rb.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (rb.disabled) return;
          hooks.onRollingReplan(row.id, g);
        });
        roll.appendChild(rb);
      }
      card.appendChild(roll);
    }

    if (hooks.onOpenDetail) {
      card.style.cursor = "pointer";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.addEventListener("click", function () {
        hooks.onOpenDetail(row.id, g);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          hooks.onOpenDetail(row.id, g);
        }
      });
    }
    listEl.appendChild(card);
  }

  global.GoalUI = {
    daysUntilDeadline: daysUntilDeadline,
    goalIconClass: goalIconClass,
    renderPixelBar: renderPixelBar,
    appendGoalCard: appendGoalCard,
  };
})(window);
