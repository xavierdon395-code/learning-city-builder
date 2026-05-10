/**
 * 星座风毛玻璃弹窗（删除目标、请假确认等）
 */
(function (global) {
  "use strict";

  function ensureOverlay() {
    var el = document.getElementById("cosmos-dialog-root");
    if (el) return el;
    el = document.createElement("div");
    el.id = "cosmos-dialog-root";
    el.className = "cosmos-dialog";
    el.setAttribute("hidden", "");
    el.innerHTML =
      '<div class="cosmos-dialog__backdrop"></div>' +
      '<div class="cosmos-dialog__panel" role="dialog" aria-modal="true">' +
      '  <div class="cosmos-dialog__zodiac" id="cosmos-dialog-zodiac"></div>' +
      '  <h2 class="cosmos-dialog__title" id="cosmos-dialog-title"></h2>' +
      '  <p class="cosmos-dialog__body" id="cosmos-dialog-body"></p>' +
      '  <div class="cosmos-dialog__actions">' +
      '    <button type="button" class="btn btn--secondary" id="cosmos-dialog-cancel">取消</button>' +
      '    <button type="button" class="btn cosmos-dialog__confirm" id="cosmos-dialog-confirm">确认</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  function close(root) {
    root.setAttribute("hidden", "");
    root.classList.remove("is-open");
  }

  function open(opts) {
    var root = ensureOverlay();
    var zEl = root.querySelector("#cosmos-dialog-zodiac");
    var tEl = root.querySelector("#cosmos-dialog-title");
    var bEl = root.querySelector("#cosmos-dialog-body");
    var cBtn = root.querySelector("#cosmos-dialog-cancel");
    var kBtn = root.querySelector("#cosmos-dialog-confirm");

    zEl.textContent = opts.zodiac || "✦";
    zEl.style.display = opts.zodiac ? "" : "none";
    tEl.textContent = opts.title || "";
    bEl.textContent = opts.body || "";

    kBtn.className = "btn cosmos-dialog__confirm" + (opts.confirmDanger ? " cosmos-dialog__confirm--danger" : "");
    kBtn.textContent = opts.confirmText || "确认";
    cBtn.textContent = opts.cancelText || "取消";

    function cleanup() {
      cBtn.onclick = null;
      kBtn.onclick = null;
      root.querySelector(".cosmos-dialog__backdrop").onclick = null;
    }

    cBtn.onclick = function () {
      cleanup();
      close(root);
      if (opts.onCancel) opts.onCancel();
    };
    root.querySelector(".cosmos-dialog__backdrop").onclick = cBtn.onclick;
    kBtn.onclick = function () {
      cleanup();
      close(root);
      if (opts.onConfirm) opts.onConfirm();
    };

    root.removeAttribute("hidden");
    requestAnimationFrame(function () {
      root.classList.add("is-open");
    });
  }

  function zodiacFromCreatedAt(ms) {
    var m = typeof ms === "number" && isFinite(ms) ? new Date(ms).getMonth() : new Date().getMonth();
    if (global.CosmosBackground && CosmosBackground.zodiacForMonthIndex) {
      return CosmosBackground.zodiacForMonthIndex(m).sym;
    }
    return "✦";
  }

  global.CosmosDialog = {
    open: open,
    confirmDeleteGoal: function (goalName, createdAtMs, onConfirm, onCancel) {
      open({
        zodiac: zodiacFromCreatedAt(createdAtMs),
        title: "确认删除",
        body:
          "星辰见证了你的努力，确定要放弃「" +
          (goalName || "未命名") +
          "」吗？此操作无法撤销。",
        confirmText: "确认删除",
        confirmDanger: true,
        onConfirm: onConfirm,
        onCancel: onCancel,
      });
    },
    confirmLeave: function (onConfirm, onCancel) {
      var m = new Date().getMonth();
      var sym = global.CosmosBackground && CosmosBackground.zodiacForMonthIndex ? CosmosBackground.zodiacForMonthIndex(m).sym : "✦";
      open({
        zodiac: sym,
        title: "今日请假",
        body: "今日请假将不计入打卡，确认请假？",
        confirmText: "确认请假",
        onConfirm: onConfirm,
        onCancel: onCancel,
      });
    },
  };
})(window);
