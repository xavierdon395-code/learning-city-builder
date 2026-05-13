(function () {
  "use strict";

  function init() {
    AppShared.attachGlobalClickSound();
    AppShared.requireAuth(function (user) {
      AppShared.setupLogout();
      AppShared.setBottomNavActive("achievements");
      AppShared.pageEnterTransition();
      AppData.loadProfile(user.uid).then(function (p) {
        AppShared.hydrateUserChip(user, p);
      });
      if (window.Achievements) {
        Achievements.initWallPage(user.uid);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
