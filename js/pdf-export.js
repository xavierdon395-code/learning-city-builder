/**
 * Lumi 学习档案 PDF 导出
 * 使用 jsPDF 纯客户端生成，无后端依赖
 * 主题：浅色版（白底深色字），A4 竖版
 * 阶段 1：默认字体不支持中文，中文用户名可能显示异常，阶段 2 可内嵌 Noto Sans SC
 */
const PDFExport = (function () {
  "use strict";

  // === 主题配色（浅色版，仅用于 PDF） ===
  const COLORS = {
    bg: "#FFFFFF",
    text_primary: "#1A1A1A",
    text_secondary: "#5C5C5C",
    text_muted: "#999999",
    accent: "#C9A84C",
    line: "#E5E5E5",
  };

  const LAYOUT = {
    page_width: 210,
    page_height: 297,
    margin_x: 20,
    margin_y: 25,
  };

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length !== 6) return [0, 0, 0];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }


  /**
   * 跨平台保存 PDF。
   * - iOS 原生 (Capacitor): 写文件到 Cache 目录后调用系统分享菜单（用户可保存到"文件 App"、AirDrop、邮件等）
   * - Web / Android / 其他: 回退到 jsPDF 自带的浏览器下载
   * 失败时退回 doc.save() 作为兜底。
   */
  async function savePDFToDevice(doc, filename) {
    var Cap = (typeof window !== "undefined") ? window.Capacitor : null;
    var isIOSNative = Cap && Cap.isNativePlatform && Cap.isNativePlatform()
                     && Cap.getPlatform && Cap.getPlatform() === "ios";

    if (!isIOSNative) {
      // Web / Android: jsPDF 自带下载
      doc.save(filename);
      return;
    }

    // iOS 原生路径
    try {
      var Plugins = Cap.Plugins || {};
      var Filesystem = Plugins.Filesystem;
      var Share = Plugins.Share;

      if (!Filesystem || !Share) {
        console.warn("[PDF] Capacitor Filesystem/Share 不可用，回退到 doc.save");
        doc.save(filename);
        return;
      }

      // 拿到 base64 数据（不含 "data:application/pdf;base64," 前缀）
      var dataUri = doc.output("datauristring");
      var base64 = dataUri.substring(dataUri.indexOf(",") + 1);

      // 写到 Cache 目录（系统会自动清理，不占用永久存储）
      var writeRes = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: "CACHE",
      });

      // 调起系统分享菜单
      await Share.share({
        title: filename,
        url: writeRes.uri,
        dialogTitle: "保存或分享 PDF",
      });
    } catch (err) {
      console.error("[PDF] iOS 分享失败，回退到 doc.save", err);
      try {
        doc.save(filename);
      } catch (_e) {
        // 已尽力
      }
    }
  }

  /**
   * @param {object} options
   * @param {string} [options.uid]
   * @param {string} [options.userName]
   */
  async function exportPDF(options) {
    options = options || {};
    var jspdfNs = window.jspdf;
    if (!jspdfNs || !jspdfNs.jsPDF) {
      throw new Error("jsPDF 库未加载，请检查 CDN");
    }

    var JsPDF = jspdfNs.jsPDF;
    var doc = new JsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    await ensureChineseFont(doc);

    renderCoverPage(doc, options);

    var uid = options.uid;
    var tasksTree = {};
    var leavesMap = {};
    var goalsRaw = {};
    if (typeof window !== "undefined" && window.AppData && uid) {
      try {
        var loaded = await Promise.all([
          window.AppData.loadAllTasks(uid),
          window.AppData.loadLeaves(uid),
          window.AppData.loadGoals(uid),
        ]);
        tasksTree = loaded[0] || {};
        leavesMap = loaded[1] || {};
        goalsRaw = loaded[2] || {};
      } catch (err) {
        console.warn("[PDF] 数据加载失败", err);
      }
    }

    var dataOpts = Object.assign({}, options, {
      tasksTree: tasksTree,
      leavesMap: leavesMap,
      goalsRaw: goalsRaw,
    });

    doc.addPage();
    renderOverviewPage(doc, dataOpts);

    doc.addPage();
    renderGoalsPage(doc, dataOpts);

    var filename = "Lumi-Learning-Archive-" + formatDate(new Date()) + ".pdf";
    await savePDFToDevice(doc, filename);
  }

  /**
   * 阶段 1：Helvetica 不支持中文；阶段 2 可改为内嵌 Noto Sans SC
   */
  async function ensureChineseFont(doc) {
    doc.setFont("helvetica", "normal");
  }

  function renderCoverPage(doc, options) {
    options = options || {};
    var userName = options.userName != null && String(options.userName).trim() ? String(options.userName).trim() : "学习者";
    var pageW = LAYOUT.page_width;
    var pageH = LAYOUT.page_height;

    doc.setFillColor(COLORS.bg);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setDrawColor(COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(LAYOUT.margin_x, 30, pageW - LAYOUT.margin_x, 30);

    doc.setTextColor(COLORS.text_primary);
    doc.setFontSize(48);
    doc.setFont("helvetica", "normal");
    doc.text("LUMI", pageW / 2, pageH / 2 - 20, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(COLORS.text_secondary);
    doc.text("WEEKLY LEARNING ARCHIVE", pageW / 2, pageH / 2 - 8, { align: "center" });

    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(pageW / 2 - 20, pageH / 2 + 5, pageW / 2 + 20, pageH / 2 + 5);

    doc.setFontSize(16);
    doc.setTextColor(COLORS.text_primary);
    doc.text(userName, pageW / 2, pageH / 2 + 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(COLORS.text_muted);
    doc.text(formatDate(new Date()), pageW / 2, pageH / 2 + 30, { align: "center" });

    doc.setDrawColor(COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(LAYOUT.margin_x, pageH - 30, pageW - LAYOUT.margin_x, pageH - 30);

    doc.setFontSize(8);
    doc.setTextColor(COLORS.text_muted);
    doc.text("Generated by Lumi · learning-city-builder", pageW / 2, pageH - 22, { align: "center" });
  }

  function renderPageFooter(doc, sectionLabel) {
    var pageW = LAYOUT.page_width;
    var pageH = LAYOUT.page_height;
    var lineRgb = hexToRgb(COLORS.line);
    var mutedRgb = hexToRgb(COLORS.text_muted);

    doc.setDrawColor(lineRgb[0], lineRgb[1], lineRgb[2]);
    doc.setLineWidth(0.3);
    doc.line(LAYOUT.margin_x, pageH - 20, pageW - LAYOUT.margin_x, pageH - 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    doc.text(sectionLabel, LAYOUT.margin_x, pageH - 14);
    doc.text("Generated by Lumi · " + formatDate(new Date()), pageW - LAYOUT.margin_x, pageH - 14, { align: "right" });
  }

  function renderOverviewPage(doc, options) {
    options = options || {};
    var pageW = LAYOUT.page_width;
    var tasksTree = options.tasksTree || {};
    var leavesMap = options.leavesMap || {};

    var totalStudyDays = 0;
    var totalTasksCompleted = 0;
    var currentStreak = 0;
    var longestStreak = 0;

    if (window.AppData) {
      try {
        var streaks = window.AppData.computeStreaks(tasksTree, leavesMap);
        totalStudyDays = streaks.totalDays || 0;
        currentStreak = streaks.currentStreak || 0;
        longestStreak = streaks.longestStreak || 0;
        totalTasksCompleted = window.AppData.countCompletedAll(tasksTree);
      } catch (err) {
        console.warn("[PDF] 统计数据计算失败，用空值", err);
      }
    }

    doc.setFillColor(COLORS.bg);
    doc.rect(0, 0, pageW, LAYOUT.page_height, "F");

    var primaryRgb = hexToRgb(COLORS.text_primary);
    var secondaryRgb = hexToRgb(COLORS.text_secondary);
    var mutedRgb = hexToRgb(COLORS.text_muted);
    var accentRgb = hexToRgb(COLORS.accent);
    var lineRgb = hexToRgb(COLORS.line);

    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setFontSize(22);
    doc.setFont("helvetica", "normal");
    doc.text("LEARNING OVERVIEW", LAYOUT.margin_x, 38);

    doc.setFontSize(10);
    doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
    doc.text("Your learning journey at a glance", LAYOUT.margin_x, 47);

    doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.setLineWidth(0.5);
    doc.line(LAYOUT.margin_x, 53, LAYOUT.margin_x + 25, 53);

    var startY = 75;
    var cellW = (pageW - LAYOUT.margin_x * 2) / 2;
    var cellH = 55;

    var metrics = [
      { label: "TOTAL STUDY DAYS", value: totalStudyDays, suffix: "" },
      { label: "TASKS COMPLETED", value: totalTasksCompleted, suffix: "" },
      { label: "CURRENT STREAK", value: currentStreak, suffix: " DAYS" },
      { label: "LONGEST STREAK", value: longestStreak, suffix: " DAYS" },
    ];

    metrics.forEach(function (m, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var x = LAYOUT.margin_x + col * cellW;
      var y = startY + row * cellH;

      doc.setFontSize(42);
      doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.setFont("helvetica", "normal");
      doc.text(String(m.value), x, y + 20);

      if (m.suffix) {
        var numWidth = doc.getTextWidth(String(m.value));
        doc.setFontSize(11);
        doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
        doc.text(m.suffix, x + numWidth + 2, y + 20);
      }

      doc.setFontSize(9);
      doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      doc.text(m.label, x, y + 32);

      if (col === 0) {
        doc.setDrawColor(lineRgb[0], lineRgb[1], lineRgb[2]);
        doc.setLineWidth(0.2);
        doc.line(x + cellW - 5, y + 5, x + cellW - 5, y + 40);
      }
      if (row === 0 && i < 2) {
        doc.setDrawColor(lineRgb[0], lineRgb[1], lineRgb[2]);
        doc.setLineWidth(0.2);
        doc.line(x, y + cellH - 5, x + cellW - 10, y + cellH - 5);
      }
    });

    doc.setFontSize(10);
    doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
    doc.text("Every star counted in this archive represents one moment of focus.", pageW / 2, 220, { align: "center" });

    renderPageFooter(doc, "OVERVIEW");
  }

  function renderGoalsPage(doc, options) {
    options = options || {};
    var pageW = LAYOUT.page_width;
    var tasksTree = options.tasksTree || {};
    var goalsRaw = options.goalsRaw || {};
    var AppData = window.AppData;

    doc.setFillColor(COLORS.bg);
    doc.rect(0, 0, pageW, LAYOUT.page_height, "F");

    var primaryRgb = hexToRgb(COLORS.text_primary);
    var secondaryRgb = hexToRgb(COLORS.text_secondary);
    var mutedRgb = hexToRgb(COLORS.text_muted);
    var accentRgb = hexToRgb(COLORS.accent);
    var lineRgb = hexToRgb(COLORS.line);

    function drawGoalsHeader(isCont) {
      doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.setFontSize(22);
      doc.setFont("helvetica", "normal");
      doc.text(isCont ? "GOALS PROGRESS (cont.)" : "GOALS PROGRESS", LAYOUT.margin_x, 38);
      if (!isCont) {
        doc.setFontSize(10);
        doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        doc.text("Active goals and their completion status", LAYOUT.margin_x, 47);
        doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.setLineWidth(0.5);
        doc.line(LAYOUT.margin_x, 53, LAYOUT.margin_x + 25, 53);
      } else {
        doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.setLineWidth(0.5);
        doc.line(LAYOUT.margin_x, 45, LAYOUT.margin_x + 25, 45);
      }
    }

    drawGoalsHeader(false);

    var goals = Object.keys(goalsRaw).map(function (id) {
      var g = goalsRaw[id] || {};
      return { id: id, g: g };
    });
    goals.sort(function (a, b) {
      return (b.g.createdAt || 0) - (a.g.createdAt || 0);
    });

    if (goals.length === 0) {
      doc.setFontSize(13);
      doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
      doc.text("NO GOALS YET", pageW / 2, 130, { align: "center" });
      doc.setFontSize(10);
      doc.text("Start your first goal in the app to see progress here", pageW / 2, 140, { align: "center" });
      renderPageFooter(doc, "GOALS");
      return;
    }

    var y = 75;
    var lineH = 5.5;
    var barH = 2;
    var maxY = 250;

    goals.forEach(function (row, idx) {
      var goal = row.g;
      var name = goal.name || goal.title || "Goal " + (idx + 1);
      var progPct = 0;
      if (AppData) {
        if (typeof goal.progress === "number") {
          progPct = goal.progress;
        } else {
          progPct = AppData.goalProgressFromTasks(tasksTree, row.id).pct;
        }
      }
      progPct = Math.min(100, Math.max(0, Math.round(progPct)));

      var nameLines = doc.splitTextToSize(String(name), pageW - LAYOUT.margin_x * 2 - 30);
      var nameBlockH = nameLines.length * lineH;
      var metaParts = [];
      if (goal.type) metaParts.push(String(goal.type).toUpperCase());
      if (goal.deadline) metaParts.push("DUE " + String(goal.deadline));
      var metaH = metaParts.length ? 6 : 0;
      var rowH = nameBlockH + 2 + barH + metaH + 8;

      if (y + rowH > maxY) {
        renderPageFooter(doc, "GOALS");
        doc.addPage();
        doc.setFillColor(COLORS.bg);
        doc.rect(0, 0, pageW, LAYOUT.page_height, "F");
        drawGoalsHeader(true);
        y = 60;
      }

      doc.setFontSize(13);
      doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      doc.setFont("helvetica", "normal");
      doc.text(nameLines, LAYOUT.margin_x, y);

      doc.setFontSize(13);
      doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      doc.text(String(progPct) + "%", pageW - LAYOUT.margin_x, y, { align: "right" });

      var barY = y + nameBlockH + 2;
      var barW = pageW - LAYOUT.margin_x * 2;

      doc.setFillColor(lineRgb[0], lineRgb[1], lineRgb[2]);
      doc.rect(LAYOUT.margin_x, barY, barW, barH, "F");
      if (progPct > 0) {
        doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.rect(LAYOUT.margin_x, barY, (barW * progPct) / 100, barH, "F");
      }

      if (metaParts.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(mutedRgb[0], mutedRgb[1], mutedRgb[2]);
        doc.text(metaParts.join("  ·  "), LAYOUT.margin_x, barY + barH + 5);
      }

      y += rowH;
    });

    renderPageFooter(doc, "GOALS");
  }

  function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  return {
    exportPDF: exportPDF,
  };
})();

if (typeof window !== "undefined") {
  window.PDFExport = PDFExport;
}
