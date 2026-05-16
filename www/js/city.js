(function () {
  "use strict";

  function showAchModuleLoadError() {
    var status = document.getElementById("ach-wall-status");
    var skeleton = document.getElementById("ach-wall-skeleton");
    if (status) status.textContent = "成就模块加载失败，请稍后重试";
    if (skeleton) skeleton.hidden = true;
  }

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("achievements");
      AppShared.pageEnterTransition();
      AppData.loadProfile(user.uid)
        .then(function (p) {
          AppShared.hydrateUserChip(user, p);
        })
        .catch(function (e) {
          console.error(e);
          AppShared.hydrateUserChip(user, {});
        });
      if (window.Achievements && Achievements.initWallPage) {
        Achievements.initWallPage(user.uid);
      } else {
        showAchModuleLoadError();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
